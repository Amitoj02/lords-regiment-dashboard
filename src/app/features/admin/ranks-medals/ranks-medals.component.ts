import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Medal, MedalRibbon, Rank } from '../../../core/models/member.model';
import {
    DiscordConnection,
    DiscordRole,
    DiscordService,
} from '../../../core/services/discord.service';
import { MedalPayload, MedalsService } from '../../../core/services/medals.service';
import { RankPayload, RanksService } from '../../../core/services/ranks.service';

type EditorMode = 'rank' | 'medal';

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
    editRankChevrons = 0;
    editRankPrecedence = 0;

    // Medal editor fields
    editingMedalId: string | null = null;
    editTitle = '';
    editLetter = '';
    editDescription = '';
    editPrecedence = 0;
    editRibbon: MedalRibbon = 'blue';

    // Shared Discord-role selection for whichever entity is being edited.
    editDiscordRoleId = '';
    editDiscordRoleName = '';
    editDiscordLinked = false;

    ribbonOptions: MedalRibbon[] = ['blue', 'red', 'gold', 'green', 'tricolor'];

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private ranksService: RanksService,
        private medalsService: MedalsService,
        private discord: DiscordService,
    ) {}

    ngOnInit(): void {
        this.loadRanks();
        this.loadMedals();
        this.loadRoles();
        this.loadConnection();
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
        this.editRankChevrons = 0;
        this.editRankPrecedence = this.ranks.length + 1;
        this.resetEditorRole();
        this.clearRowFlash();
    }

    selectRankEdit(rank: Rank): void {
        this.editorMode = 'rank';
        this.editingRankId = rank.id ?? null;
        this.editRankName = rank.name;
        this.editRankChevrons = rank.chevrons;
        this.editRankPrecedence = rank.order;
        this.editDiscordRoleId = rank.discordRoleId ?? '';
        this.editDiscordRoleName = rank.discordRole;
        this.editDiscordLinked = rank.discordLinked;
        this.clearRowFlash();
    }

    saveRank(): void {
        if (this.saving) return;
        const payload: RankPayload = {
            name: this.editRankName.trim(),
            chevrons: this.editRankChevrons,
            precedence: this.editRankPrecedence,
        };
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
        this.editRibbon = 'blue';
        this.resetEditorRole();
        this.clearRowFlash();
    }

    selectMedalEdit(medal: Medal): void {
        this.editorMode = 'medal';
        this.editingMedalId = medal.id ?? null;
        this.editTitle = medal.title;
        this.editLetter = medal.letter;
        this.editDescription = medal.description || '';
        this.editPrecedence = medal.precedence ?? 0;
        this.editRibbon = medal.ribbon;
        this.editDiscordRoleId = medal.discordRoleId ?? '';
        this.editDiscordRoleName =
            (medal.discordRoleId ? this.roleName(medal.discordRoleId) : '') ||
            medal.discordRole ||
            '';
        this.editDiscordLinked = medal.discordLinked ?? false;
        this.clearRowFlash();
    }

    saveMedal(): void {
        if (this.saving) return;
        const payload: MedalPayload = {
            title: this.editTitle.trim(),
            glyph: this.editLetter.trim(),
            ribbon: this.editRibbon,
            description: this.editDescription.trim(),
            precedence: this.editPrecedence,
        };
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
        this.editDiscordRoleId = roleId;
        const id = this.editorMode === 'rank' ? this.editingRankId : this.editingMedalId;
        if (!id) {
            // Unsaved entity — the role is carried in the create payload on Save.
            this.editDiscordRoleName = roleId ? this.roleName(roleId) : '';
            this.editDiscordLinked = false;
            return;
        }
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
        this.unlinkRole(id);
    }

    private linkRole(id: string, roleId: string): void {
        const name = this.roleName(roleId);
        const request: Observable<Rank | Medal> =
            this.editorMode === 'rank'
                ? this.ranksService.linkDiscord(id, roleId, name)
                : this.medalsService.linkDiscord(id, roleId, name);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                this.editDiscordRoleId = roleId;
                this.editDiscordRoleName = name;
                this.editDiscordLinked = true;
                this.refreshAfterLink();
            },
            error: (err) => this.setRowError(err, 'Could not link the Discord role — try again.'),
        });
    }

    private unlinkRole(id: string): void {
        const request: Observable<Rank | Medal> =
            this.editorMode === 'rank'
                ? this.ranksService.unlinkDiscord(id)
                : this.medalsService.unlinkDiscord(id);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                this.resetEditorRole();
                this.refreshAfterLink();
            },
            error: (err) => this.setRowError(err, 'Could not unlink the Discord role — try again.'),
        });
    }

    private refreshAfterLink(): void {
        if (this.editorMode === 'rank') {
            this.loadRanks();
        } else {
            this.loadMedals();
        }
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
