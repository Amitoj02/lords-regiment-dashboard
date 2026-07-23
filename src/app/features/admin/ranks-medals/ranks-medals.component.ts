import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, switchMap, timer } from 'rxjs';
import { Medal, Rank } from '../../../core/models/member.model';
import {
    DiscordConnection,
    DiscordRole,
    DiscordService,
    RoleRelinkProgress,
    RoleRelinkSubject,
} from '../../../core/services/discord.service';
import { LinkDiscordResult } from '../../../core/services/link-discord-result';
import { MedalPayload, MedalsService } from '../../../core/services/medals.service';
import { RankPayload, RanksService } from '../../../core/services/ranks.service';
import {
    DEFAULT_STORAGE_POLICY,
    ICON_MAX_DIMENSION_PX,
    StorageService,
} from '../../../core/services/storage.service';

type EditorMode = 'rank' | 'medal';

/** Accepted icon MIME types (PNG + SVG + WebP), mirroring the backend icon policy. */
const ICON_MIME_TYPES = ['image/png', 'image/svg+xml', 'image/webp'];

/**
 * Poll cadence for an in-flight bulk re-link (T-0254).
 *
 * 2s is the cheapest interval that still reads as live: a run over a few hundred
 * members drains in well under a minute, so a slower poll would show a bar that
 * jumps rather than moves. It stays honest about cost because the poll is
 * short-lived and narrow — it only runs while a batch is non-terminal, it stops
 * the moment the panel closes, and the endpoint is one indexed aggregate over
 * the job rows of a single batch. The realistic worst case is a couple of admins
 * with the editor open, i.e. ~30 requests/minute each for under a minute.
 */
const RELINK_POLL_MS = 2000;

/**
 * A role change that will re-role existing holders, held back until the admin
 * confirms it. `nextRoleId` is null when the change is an unlink.
 */
interface RelinkPrompt {
    subject: RoleRelinkSubject;
    entityId: string;
    entityLabel: string;
    previousRoleId: string;
    nextRoleId: string | null;
    fromRoleName: string;
    toRoleName: string;
    holders: number;
}

@Component({
    selector: 'app-ranks-medals',
    templateUrl: './ranks-medals.component.html',
    styleUrls: ['./ranks-medals.component.scss'],
    standalone: false,
})
export class RanksMedalsComponent implements OnInit {
    ranks: Rank[] = [];
    medals: Medal[] = [];

    loadingRanks = true;
    loadingMedals = true;
    loadError = '';

    // Discord role picker + connection (populates the editor's role <select>).
    roles: DiscordRole[] = [];
    connection: DiscordConnection | null = null;

    // Reorder guard — one in-flight reorder request at a time across both ladders.
    reordering = false;
    private dragRankIndex: number | null = null;
    private dragMedalIndex: number | null = null;

    // Sync-with-Discord button state.
    syncing = false;
    syncFlash = '';
    syncWarn = false;

    // Row-action / editor feedback (e.g. a 409 when deleting something in use).
    rowFlash = '';
    rowWarn = false;

    // Per-row kebab menu that is open, keyed as `rank:<id>` / `medal:<id>`.
    openMenu: string | null = null;

    // ── Editor ───────────────────────────────────────────────────────────────
    editorMode: EditorMode | null = null;
    saving = false;

    // Rank editor fields
    editingRankId: string | null = null;
    editRankName = '';
    editRankPrecedence = 0;
    // Rank-icon upload (T-0194): a freshly-picked file's object-URL preview + the
    // resolved storage key, plus the already-saved icon URL loaded when editing.
    editRankImageKey: string | null = null;
    editRankImagePreview: string | null = null;
    editRankImageUrl: string | null = null;
    rankImageUploading = false;
    rankImageError = '';
    rankHint = StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'rank-image');

    // Medal editor fields
    editingMedalId: string | null = null;
    editTitle = '';
    editLetter = '';
    editDescription = '';
    editPrecedence = 0;
    // Medal-image upload (T-0195); glyph (editLetter) is retained as the fallback label.
    editMedalImageKey: string | null = null;
    editMedalImagePreview: string | null = null;
    editMedalImageUrl: string | null = null;
    medalImageUploading = false;
    medalImageError = '';
    medalHint = StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'medal-image');

    // Shared Discord-role selection for whichever entity is being edited.
    editDiscordRoleId = '';
    editDiscordRoleName = '';
    editDiscordLinked = false;

    // ── Bulk Discord role re-link (T-0254) ───────────────────────────────────
    /** Set while a re-role is waiting on the admin's confirmation. */
    relinkPrompt: RelinkPrompt | null = null;
    /** Live (or terminal) progress of the run the last confirmed change queued. */
    relink: RoleRelinkProgress | null = null;
    /** A link/unlink or cancel request that failed outright (not a job failure). */
    relinkError = '';
    /** A link/unlink request is in flight — keeps the confirm button single-fire. */
    relinkBusy = false;
    cancellingRelink = false;
    /**
     * The progress poll. Held explicitly (not just `takeUntilDestroyed`) because
     * the panel closes long before the component is destroyed — see stopRelinkPoll().
     */
    private relinkPoll: Subscription | null = null;

    private readonly iconMaxPx = ICON_MAX_DIMENSION_PX;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private ranksService: RanksService,
        private medalsService: MedalsService,
        private discord: DiscordService,
        private storage: StorageService,
    ) {}

    ngOnInit(): void {
        this.loadRanks();
        this.loadMedals();
        this.loadRoles();
        this.loadConnection();
        // Refresh the upload hints from the live per-target policy (falls back to
        // the static default when the request fails).
        this.storage
            .getPolicy()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((policy) => {
                this.rankHint = StorageService.uploadHint(policy, 'rank-image');
                this.medalHint = StorageService.uploadHint(policy, 'medal-image');
            });
    }

    get loading(): boolean {
        return this.loadingRanks || this.loadingMedals;
    }

    /** The bot must be connected before its guild roles can be linked. */
    get botConnected(): boolean {
        return this.connection?.connected ?? false;
    }

    /** No guild roles are available to pick (bot offline or none defined). */
    get rolesUnavailable(): boolean {
        return this.roles.length === 0;
    }

    get editorTitle(): string {
        if (this.editorMode === 'rank') {
            return this.editingRankId ? this.editRankName || 'Rank' : 'New rank';
        }
        if (this.editorMode === 'medal') {
            return this.editingMedalId ? this.editTitle || 'Medal' : 'New medal';
        }
        return '';
    }

    // ── Data loading ─────────────────────────────────────────────────────────
    private loadRanks(): void {
        this.loadingRanks = true;
        this.ranksService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (ranks) => {
                    this.ranks = ranks;
                    this.loadingRanks = false;
                },
                error: (err) => {
                    this.loadingRanks = false;
                    this.loadError = 'Could not load ranks — please try again.';
                    console.error('Failed to load ranks', err);
                },
            });
    }

    private loadMedals(): void {
        this.loadingMedals = true;
        this.medalsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (medals) => {
                    this.medals = medals;
                    this.loadingMedals = false;
                },
                error: (err) => {
                    this.loadingMedals = false;
                    this.loadError = 'Could not load medals — please try again.';
                    console.error('Failed to load medals', err);
                },
            });
    }

    private loadRoles(): void {
        this.discord
            .getRoles()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (roles) => (this.roles = roles),
                error: (err) => {
                    this.roles = [];
                    console.error('Failed to load Discord roles', err);
                },
            });
    }

    private loadConnection(): void {
        this.discord
            .getConnection()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (connection) => (this.connection = connection),
                error: (err) => console.error('Failed to load bot connection', err),
            });
    }

    // ── Kebab menus ──────────────────────────────────────────────────────────
    toggleMenu(key: string): void {
        this.openMenu = this.openMenu === key ? null : key;
    }

    closeMenu(): void {
        this.openMenu = null;
    }

    // ── Rank editor + row actions ────────────────────────────────────────────
    newRank(): void {
        this.editorMode = 'rank';
        this.editingRankId = null;
        this.editRankName = '';
        this.editRankPrecedence = this.ranks.length + 1;
        this.resetRankIcon();
        this.resetEditorRole();
        this.resetRelinkView();
        this.clearRowFlash();
    }

    selectRankEdit(rank: Rank): void {
        this.editorMode = 'rank';
        this.editingRankId = rank.id ?? null;
        this.editRankName = rank.name;
        this.editRankPrecedence = rank.order;
        this.resetRankIcon();
        this.editRankImageUrl = rank.imageUrl ?? null;
        this.editDiscordRoleId = rank.discordRoleId ?? '';
        this.editDiscordRoleName = rank.discordRole;
        this.editDiscordLinked = rank.discordLinked;
        this.resetRelinkView();
        this.clearRowFlash();
    }

    /** Validate + upload a freshly-picked rank icon (T-0194). */
    async onRankImageSelected(event: Event): Promise<void> {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        this.rankImageError = '';
        const err = await this.validateIconFile(file);
        if (err) {
            this.rankImageError = err;
            return;
        }
        this.editRankImagePreview = URL.createObjectURL(file);
        this.rankImageUploading = true;
        this.storage
            .upload('rank-image', file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (key) => {
                    this.editRankImageKey = key;
                    this.rankImageUploading = false;
                },
                error: (e) => {
                    this.rankImageUploading = false;
                    this.rankImageError = StorageService.uploadErrorMessage(
                        e,
                        'Icon upload failed. Please try again.',
                    );
                },
            });
    }

    saveRank(): void {
        if (this.saving || this.rankImageUploading) return;
        const payload: RankPayload = {
            name: this.editRankName.trim(),
            precedence: this.editRankPrecedence,
        };
        if (this.editRankImageKey) {
            payload.imageKey = this.editRankImageKey;
        }
        // On create, carry the picked role name so the backend can link it.
        if (!this.editingRankId && this.editDiscordRoleId) {
            payload.discordRoleName = this.roleName(this.editDiscordRoleId);
        }
        this.saving = true;
        this.clearRowFlash();
        const request = this.editingRankId
            ? this.ranksService.update(this.editingRankId, payload)
            : this.ranksService.create(payload);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                this.saving = false;
                this.closeEditor();
                this.loadRanks();
            },
            error: (err) => {
                this.saving = false;
                this.setRowError(err, 'Could not save the rank — try again.');
            },
        });
    }

    deleteRank(rank: Rank): void {
        if (!rank.id) return;
        this.clearRowFlash();
        this.ranksService
            .delete(rank.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    if (this.editingRankId === rank.id) this.closeEditor();
                    this.loadRanks();
                },
                error: (err) => {
                    const conflict = (err as HttpErrorResponse)?.status === 409;
                    this.setRowError(
                        err,
                        conflict
                            ? `"${rank.name}" still has holders — reassign them before deleting.`
                            : 'Could not delete the rank — try again.',
                    );
                },
            });
    }

    // ── Medal editor + row actions ───────────────────────────────────────────
    newMedal(): void {
        this.editorMode = 'medal';
        this.editingMedalId = null;
        this.editTitle = '';
        this.editLetter = '';
        this.editDescription = '';
        this.editPrecedence = this.medals.length + 1;
        this.resetMedalIcon();
        this.resetEditorRole();
        this.resetRelinkView();
        this.clearRowFlash();
    }

    selectMedalEdit(medal: Medal): void {
        this.editorMode = 'medal';
        this.editingMedalId = medal.id ?? null;
        this.editTitle = medal.title;
        this.editLetter = medal.letter;
        this.editDescription = medal.description || '';
        this.editPrecedence = medal.precedence ?? 0;
        this.resetMedalIcon();
        this.editMedalImageUrl = medal.imageUrl ?? null;
        this.editDiscordRoleId = medal.discordRoleId ?? '';
        this.editDiscordRoleName =
            (medal.discordRoleId ? this.roleName(medal.discordRoleId) : '') ||
            medal.discordRole ||
            '';
        this.editDiscordLinked = medal.discordLinked ?? false;
        this.resetRelinkView();
        this.clearRowFlash();
    }

    /** Validate + upload a freshly-picked medal image (T-0195). */
    async onMedalImageSelected(event: Event): Promise<void> {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        this.medalImageError = '';
        const err = await this.validateIconFile(file);
        if (err) {
            this.medalImageError = err;
            return;
        }
        this.editMedalImagePreview = URL.createObjectURL(file);
        this.medalImageUploading = true;
        this.storage
            .upload('medal-image', file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (key) => {
                    this.editMedalImageKey = key;
                    this.medalImageUploading = false;
                },
                error: (e) => {
                    this.medalImageUploading = false;
                    this.medalImageError = StorageService.uploadErrorMessage(
                        e,
                        'Image upload failed. Please try again.',
                    );
                },
            });
    }

    saveMedal(): void {
        if (this.saving || this.medalImageUploading) return;
        const payload: MedalPayload = {
            title: this.editTitle.trim(),
            glyph: this.editLetter.trim(),
            description: this.editDescription.trim(),
            precedence: this.editPrecedence,
        };
        if (this.editMedalImageKey) {
            payload.imageKey = this.editMedalImageKey;
        }
        if (!this.editingMedalId && this.editDiscordRoleId) {
            payload.discordRoleName = this.roleName(this.editDiscordRoleId);
        }
        this.saving = true;
        this.clearRowFlash();
        const request = this.editingMedalId
            ? this.medalsService.update(this.editingMedalId, payload)
            : this.medalsService.create(payload);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                this.saving = false;
                this.closeEditor();
                this.loadMedals();
            },
            error: (err) => {
                this.saving = false;
                this.setRowError(err, 'Could not save the medal — try again.');
            },
        });
    }

    /** Reset the medal form back to the loaded medal (or clear it for a new one). */
    discardMedal(): void {
        const current = this.medals.find((m) => m.id === this.editingMedalId);
        if (current) {
            this.selectMedalEdit(current);
        } else {
            this.closeEditor();
        }
    }

    deleteMedal(medal: Medal): void {
        if (!medal.id) return;
        this.clearRowFlash();
        this.medalsService
            .delete(medal.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    if (this.editingMedalId === medal.id) this.closeEditor();
                    this.loadMedals();
                },
                error: (err) => {
                    const conflict = (err as HttpErrorResponse)?.status === 409;
                    this.setRowError(
                        err,
                        conflict
                            ? `"${medal.title}" has already been awarded — revoke its awards before deleting.`
                            : 'Could not delete the medal — try again.',
                    );
                },
            });
    }

    // ── Discord role linking (editor) ────────────────────────────────────────
    onRoleSelect(roleId: string): void {
        const id = this.editorMode === 'rank' ? this.editingRankId : this.editingMedalId;
        if (!id) {
            // Unsaved entity — the role is carried in the create payload on Save.
            this.editDiscordRoleId = roleId;
            this.editDiscordRoleName = roleId ? this.roleName(roleId) : '';
            this.editDiscordLinked = false;
            return;
        }
        // Only a role that is actually linked has holders wearing it. Landing on a
        // FIRST role has nothing to strip, so it goes straight through.
        const previousRoleId = this.editDiscordLinked ? this.editDiscordRoleId : '';
        if (previousRoleId && previousRoleId !== roleId && this.editingHolders > 0) {
            // Leave the <select> showing the pick so the question reads naturally;
            // cancelRelinkPrompt() snaps the model back if the admin backs out.
            this.editDiscordRoleId = roleId;
            this.askToRelink(id, previousRoleId, roleId || null);
            return;
        }
        this.editDiscordRoleId = roleId;
        if (roleId) {
            this.linkRole(id, roleId);
        } else {
            this.unlinkRole(id);
        }
    }

    unlinkCurrentRole(): void {
        const id = this.editorMode === 'rank' ? this.editingRankId : this.editingMedalId;
        if (!id) {
            this.resetEditorRole();
            return;
        }
        // An unlink is a re-link to nothing: every holder LOSES the role, so it
        // gets the same warning (there is an outgoing role by definition here).
        if (this.editDiscordLinked && this.editDiscordRoleId && this.editingHolders > 0) {
            this.askToRelink(id, this.editDiscordRoleId, null);
            return;
        }
        this.unlinkRole(id);
    }

    /** Holder count of the entity being edited — the blast radius of a re-link. */
    get editingHolders(): number {
        if (this.editorMode === 'rank') {
            return this.ranks.find((r) => r.id === this.editingRankId)?.holders ?? 0;
        }
        return this.medals.find((m) => m.id === this.editingMedalId)?.holders ?? 0;
    }

    private askToRelink(id: string, previousRoleId: string, nextRoleId: string | null): void {
        const subject: RoleRelinkSubject = this.editorMode === 'rank' ? 'rank' : 'medal';
        this.relinkPrompt = {
            subject,
            entityId: id,
            entityLabel: subject === 'rank' ? this.editRankName : this.editTitle,
            previousRoleId,
            nextRoleId,
            // Fall back to the stored name (and then the raw snowflake) so the
            // warning still names both roles when the bot is offline and the
            // roles list never loaded.
            fromRoleName:
                this.roleName(previousRoleId) || this.editDiscordRoleName || previousRoleId,
            toRoleName: nextRoleId ? this.roleName(nextRoleId) || nextRoleId : 'no role',
            holders: this.editingHolders,
        };
    }

    confirmRelink(): void {
        const prompt = this.relinkPrompt;
        if (!prompt || this.relinkBusy) return;
        this.relinkPrompt = null;
        if (prompt.nextRoleId) {
            this.linkRole(prompt.entityId, prompt.nextRoleId);
        } else {
            this.unlinkRole(prompt.entityId);
        }
    }

    cancelRelinkPrompt(): void {
        const prompt = this.relinkPrompt;
        if (!prompt) return;
        this.relinkPrompt = null;
        // The <select> was left on the rejected pick; move the model back so
        // ngModel writes the still-linked role into the control.
        this.editDiscordRoleId = prompt.previousRoleId;
    }

    private linkRole(id: string, roleId: string): void {
        const name = this.roleName(roleId);
        const subject: RoleRelinkSubject = this.editorMode === 'rank' ? 'rank' : 'medal';
        this.relinkBusy = true;
        // Explicitly typed: a bare ternary yields a UNION of two Observables whose
        // `subscribe` overloads do not unify, and only the batch id is read here.
        const link$: Observable<LinkDiscordResult<Rank | Medal>> =
            subject === 'rank'
                ? this.ranksService.linkDiscord(id, roleId, name)
                : this.medalsService.linkDiscord(id, roleId, name);
        link$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: ({ relinkBatchId }) => {
                this.relinkBusy = false;
                this.editDiscordRoleId = roleId;
                this.editDiscordRoleName = name;
                this.editDiscordLinked = true;
                this.refreshAfterLink();
                this.watchRelink(relinkBatchId);
            },
            error: (err) => {
                this.relinkBusy = false;
                this.setRowError(err, 'Could not link the Discord role — try again.');
            },
        });
    }

    private unlinkRole(id: string): void {
        const subject: RoleRelinkSubject = this.editorMode === 'rank' ? 'rank' : 'medal';
        this.relinkBusy = true;
        const unlink$: Observable<LinkDiscordResult<Rank | Medal>> =
            subject === 'rank'
                ? this.ranksService.unlinkDiscord(id)
                : this.medalsService.unlinkDiscord(id);
        unlink$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: ({ relinkBatchId }) => {
                this.relinkBusy = false;
                this.resetEditorRole();
                this.refreshAfterLink();
                this.watchRelink(relinkBatchId);
            },
            error: (err) => {
                this.relinkBusy = false;
                this.setRowError(err, 'Could not unlink the Discord role — try again.');
            },
        });
    }

    private refreshAfterLink(): void {
        if (this.editorMode === 'rank') {
            this.loadRanks();
        } else {
            this.loadMedals();
        }
    }

    // ── Bulk re-link progress ────────────────────────────────────────────────
    /**
     * Follow a queued run to its terminal state. A null handle means the backend
     * queued nothing (bot off, role syncing off, or no linked holders) — there is
     * simply nothing to watch, so no poll is started.
     */
    private watchRelink(batchId: string | null): void {
        this.resetRelinkProgress();
        if (!batchId) return;
        this.relinkPoll = timer(0, RELINK_POLL_MS)
            .pipe(
                switchMap(() => this.discord.getRelinkProgress(batchId)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (progress) => {
                    this.relink = progress;
                    // Terminal: the row will never change again, so stop paying for it.
                    if (progress.state !== 'running') this.stopRelinkPoll();
                },
                error: (err) => {
                    this.stopRelinkPoll();
                    this.relinkError =
                        (err as HttpErrorResponse)?.error?.message ??
                        'Lost track of the Discord role update — it is still running on the server.';
                },
            });
    }

    /**
     * Tear the poll down. `takeUntilDestroyed` only fires when the COMPONENT is
     * destroyed, and this editor closes long before that — so EVERY exit path
     * (terminal state, poll error, panel close, starting a new run) must come
     * through here, or the timer keeps hitting the API for the rest of the session.
     */
    private stopRelinkPoll(): void {
        this.relinkPoll?.unsubscribe();
        this.relinkPoll = null;
    }

    /** True while a poll is live — the invariant the teardown spec pins. */
    get relinkPolling(): boolean {
        return this.relinkPoll !== null;
    }

    /** Stop the run. Members already updated stay updated; there is no rollback. */
    cancelRelinkRun(): void {
        const batchId = this.relink?.batchId;
        if (!batchId || this.cancellingRelink) return;
        this.cancellingRelink = true;
        this.discord
            .cancelRelink(batchId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (progress) => {
                    this.cancellingRelink = false;
                    this.relink = progress;
                    // A cancel may still leave in-flight jobs draining; only a
                    // terminal answer retires the poll.
                    if (progress.state !== 'running') this.stopRelinkPoll();
                },
                error: (err) => {
                    this.cancellingRelink = false;
                    this.relinkError =
                        (err as HttpErrorResponse)?.error?.message ??
                        'Could not stop the update — it may already have finished.';
                },
            });
    }

    /** Dismiss a finished run's row (the "OK, got it" on a terminal summary). */
    dismissRelink(): void {
        this.resetRelinkProgress();
    }

    private resetRelinkProgress(): void {
        this.stopRelinkPoll();
        this.relink = null;
        this.relinkError = '';
        this.cancellingRelink = false;
    }

    /** Clear the whole re-link view when the editor switches to another entity. */
    private resetRelinkView(): void {
        this.relinkPrompt = null;
        // A request abandoned by closing the panel must not leave the next
        // editor session with a permanently disabled role picker.
        this.relinkBusy = false;
        this.resetRelinkProgress();
    }

    /** Jobs that have settled one way or another — the numerator of the bar. */
    get relinkSettled(): number {
        const p = this.relink;
        return p ? p.applied + p.failed + p.cancelled : 0;
    }

    /**
     * Bar fill. A terminal run is 100% by definition, however the counts landed —
     * a cancelled run IS finished, and its label carries the honest outcome.
     */
    get relinkPercent(): number {
        const p = this.relink;
        if (!p) return 0;
        if (p.state !== 'running') return 100;
        if (!p.total) return 0;
        return Math.min(100, Math.round((this.relinkSettled / p.total) * 100));
    }

    get relinkVariant(): 'ok' | 'warn' | 'err' | 'info' {
        const p = this.relink;
        if (!p) return 'info';
        if (p.state === 'running') return 'info';
        if (p.failed > 0) return 'err';
        return p.state === 'completed' ? 'ok' : 'warn';
    }

    /** One honest sentence about the run — including "no rollback" after a stop. */
    get relinkSummary(): string {
        const p = this.relink;
        if (!p) return '';
        const label = p.subjectLabel || (p.subject === 'rank' ? 'this rank' : 'this medal');
        switch (p.state) {
            case 'running':
                return p.expanding
                    ? `Updating Discord roles for ${label} — still counting members…`
                    : `Updating Discord roles for ${label} — ${p.applied} of ${p.total} applied, ${p.pending} remaining.`;
            case 'completed':
                return p.failed > 0
                    ? `Finished ${label}: ${p.applied} of ${p.total} members updated, ${p.failed} failed.`
                    : `Finished ${label}: all ${p.applied} members updated.`;
            case 'partial':
                return `Stopped ${label} after ${p.applied} of ${p.total} members. Those ${p.applied} keep the new role — there is no rollback.`;
            case 'cancelled':
                return `Stopped ${label} before any member was changed.`;
        }
    }

    /**
     * The server's own reason for the failures, so a bot role-hierarchy problem is
     * diagnosable without leaving the page. Empty when nothing failed.
     */
    get relinkFailureReason(): string {
        const p = this.relink;
        if (!p || p.failed === 0) return '';
        const cause = p.failures.samples[0] || 'Discord rejected the role change.';
        const stuck = p.failures.permanent + p.failures.exhausted;
        const retrying = p.failures.retrying ? ` ${p.failures.retrying} still retrying.` : '';
        return stuck > 0
            ? `${stuck} member${stuck === 1 ? '' : 's'} could not be updated: ${cause}${retrying}`
            : `${p.failed} member${p.failed === 1 ? '' : 's'} hit an error: ${cause}${retrying}`;
    }

    // ── Drag-to-reorder (native HTML5 DnD) ───────────────────────────────────
    onRankDragStart(index: number): void {
        this.dragRankIndex = index;
        this.dragMedalIndex = null; // a fresh rank drag cancels any stale medal drag
    }

    onRankDragEnd(): void {
        // Clear the index even when the drag is abandoned (released off any row), so a
        // later cross-list drop cannot read a stale index and misfire a reorder.
        this.dragRankIndex = null;
    }

    onRankDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    onRankDrop(index: number): void {
        const from = this.dragRankIndex;
        this.dragRankIndex = null;
        if (from === null || from === index || this.reordering) return;
        const reordered = this.moveItem(this.ranks, from, index);
        const order = reordered.map((r) => r.id).filter((id): id is string => !!id);
        this.ranks = reordered; // optimistic; replaced by the server's precedence
        this.reordering = true;
        this.ranksService
            .reorder(order)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (ranks) => {
                    this.ranks = ranks;
                    this.reordering = false;
                },
                error: (err) => {
                    this.reordering = false;
                    this.setRowError(err, 'Could not reorder ranks — try again.');
                    this.loadRanks();
                },
            });
    }

    onMedalDragStart(index: number): void {
        this.dragMedalIndex = index;
        this.dragRankIndex = null; // a fresh medal drag cancels any stale rank drag
    }

    onMedalDragEnd(): void {
        this.dragMedalIndex = null;
    }

    onMedalDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    onMedalDrop(index: number): void {
        const from = this.dragMedalIndex;
        this.dragMedalIndex = null;
        if (from === null || from === index || this.reordering) return;
        const reordered = this.moveItem(this.medals, from, index);
        const order = reordered.map((m) => m.id).filter((id): id is string => !!id);
        this.medals = reordered; // optimistic; replaced by the server's precedence
        this.reordering = true;
        this.medalsService
            .reorder(order)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (medals) => {
                    this.medals = medals;
                    this.reordering = false;
                },
                error: (err) => {
                    this.reordering = false;
                    this.setRowError(err, 'Could not reorder medals — try again.');
                    this.loadMedals();
                },
            });
    }

    // ── Sync with Discord ────────────────────────────────────────────────────
    syncWithDiscord(): void {
        if (this.syncing || !this.botConnected) return;
        this.syncing = true;
        this.syncFlash = '';
        this.syncWarn = false;
        this.discord
            .resync()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (enqueued) => {
                    this.syncing = false;
                    this.syncFlash = `Sync queued — ${enqueued} role update${
                        enqueued === 1 ? '' : 's'
                    } dispatched to Discord.`;
                },
                error: (err) => {
                    this.syncing = false;
                    this.syncWarn = true;
                    this.syncFlash = 'Sync failed — try again.';
                    console.error('Failed to resync roles', err);
                },
            });
    }

    // ── Editor / helper plumbing ─────────────────────────────────────────────
    closeEditor(): void {
        this.editorMode = null;
        this.editingRankId = null;
        this.editingMedalId = null;
        // The progress row lives in this panel, so closing it must retire the
        // poll — the component itself may stay alive for the rest of the session.
        this.resetRelinkView();
    }

    roleLoaded(id: string | null): boolean {
        return !!id && this.roles.some((r) => r.id === id);
    }

    private roleName(id: string): string {
        return this.roles.find((r) => r.id === id)?.name ?? '';
    }

    private resetEditorRole(): void {
        this.editDiscordRoleId = '';
        this.editDiscordRoleName = '';
        this.editDiscordLinked = false;
    }

    private resetRankIcon(): void {
        this.editRankImageKey = null;
        this.editRankImagePreview = null;
        this.editRankImageUrl = null;
        this.rankImageError = '';
        this.rankImageUploading = false;
    }

    private resetMedalIcon(): void {
        this.editMedalImageKey = null;
        this.editMedalImagePreview = null;
        this.editMedalImageUrl = null;
        this.medalImageError = '';
        this.medalImageUploading = false;
    }

    /** The icon to show in the rank editor preview (fresh pick first, else saved). */
    get rankIconPreview(): string | null {
        return this.editRankImagePreview ?? this.editRankImageUrl;
    }

    /** The image to show in the medal editor preview (fresh pick first, else saved). */
    get medalIconPreview(): string | null {
        return this.editMedalImagePreview ?? this.editMedalImageUrl;
    }

    /**
     * Client-side icon validation (T-0194/T-0195; WebP added T-0215): PNG, SVG or
     * WebP only, and — for a raster PNG/WebP — at most 250px on each side (mirrors
     * the backend cap). SVG is a vector, so it is exempt from the pixel cap.
     * Returns an error message, or null when the file is acceptable.
     */
    private validateIconFile(file: File): Promise<string | null> {
        if (!ICON_MIME_TYPES.includes(file.type)) {
            return Promise.resolve('Please choose a PNG, SVG, or WebP image.');
        }
        if (file.type === 'image/svg+xml') {
            return Promise.resolve(null);
        }
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(
                    img.naturalWidth > this.iconMaxPx || img.naturalHeight > this.iconMaxPx
                        ? `Image must be ${this.iconMaxPx}px or smaller on each side.`
                        : null,
                );
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve('Could not read the image — try another file.');
            };
            img.src = url;
        });
    }

    private clearRowFlash(): void {
        this.rowFlash = '';
        this.rowWarn = false;
    }

    private setRowError(err: unknown, fallback: string): void {
        const e = err as HttpErrorResponse;
        this.rowFlash = e?.error?.message ?? fallback;
        this.rowWarn = true;
        console.error(fallback, err);
    }

    private moveItem<T>(list: T[], from: number, to: number): T[] {
        const copy = [...list];
        const [moved] = copy.splice(from, 1);
        copy.splice(to, 0, moved);
        return copy;
    }
}
