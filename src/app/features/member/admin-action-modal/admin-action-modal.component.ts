import {
    Component,
    DestroyRef,
    EventEmitter,
    HostListener,
    Input,
    Output,
    inject,
    ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    Medal,
    Member,
    MemberPermittedActions,
    MemberRole,
    Rank,
    articleFor,
    assignableRolesFor,
    standsLevelOrAbove,
} from '../../../core/models/member.model';
import { MembersService } from '../../../core/services/members.service';
import { RanksService } from '../../../core/services/ranks.service';
import { MedalsService } from '../../../core/services/medals.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Single admin-action modal for a member. Shown while [member] is non-null.
 *
 * Every section is gated on BOTH the caller's global capability AND the
 * server-computed `member.permittedActions` flag for that action on THIS target
 * (T-0266). The per-target half is never re-derived from a client-side role
 * table — the API computes it from the same guard the endpoints enforce, so the
 * modal cannot drift from what the server will accept, and a member arriving
 * without the block offers nothing at all.
 *
 * Mounted twice — the roster row's `···` button and the profile header's "Admin
 * Actions" button — so every gate here has to hold for both entry points; both
 * triggers go through `canOpenAdminActions()` for exactly that reason.
 */
@Component({
    selector: 'hf-admin-action-modal',
    templateUrl: './admin-action-modal.component.html',
    styleUrls: ['./admin-action-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class AdminActionModalComponent {
    /** The target member. The modal renders while this is non-null. */
    @Input() set member(value: Member | null) {
        // Only (re)initialise when a genuinely different member is opened; our own
        // in-place updates (applyUpdate) assign `_member` directly, so the parent
        // re-passing the same object here is a no-op.
        if (value && value !== this._member) {
            this._member = value;
            this.initialise();
        } else if (!value) {
            this._member = null;
        }
    }
    get member(): Member | null {
        return this._member;
    }
    private _member: Member | null = null;

    @Output() closed = new EventEmitter<void>();
    /** Emitted with the updated member after each successful action. */
    @Output() memberUpdated = new EventEmitter<Member>();

    // ── Catalogues (loaded once on first open) ───────────────────────────────
    ranks: Rank[] = [];
    medals: Medal[] = [];
    private cataloguesLoaded = false;

    // ── Form state ───────────────────────────────────────────────────────────
    selectedRankId = '';
    selectedRole: MemberRole | '' = '';
    selectedMedalId = '';
    medalDetail = '';
    suspendUntil = '';
    suspendReason = '';
    banReason = '';
    banConfirming = false;

    /**
     * Roles this caller may assign, recomputed each time the modal opens. Owner
     * is never in the list (ownership has its own flow) and neither is any role
     * ABOVE the caller's own — a Moderator offering "Admin" would only ever
     * produce a 403 (T-0266). The caller's OWN tier IS offered: holding
     * `manage_roles` is what lets an Admin appoint another Admin (T-0283).
     */
    assignableRoles: MemberRole[] = [];

    // ── Per-action loading + error ───────────────────────────────────────────
    rankBusy = false;
    roleBusy = false;
    awardBusy = false;
    removingMedalId: string | null = null;
    suspendBusy = false;
    unsuspendBusy = false;
    banBusy = false;
    deriveBusy = false;
    error: string | null = null;

    /**
     * What the last derive found, kept in the dialog after its toast has gone
     * (T-0284). The toast is a 4.5-second notification and this is a RESULT the
     * admin may well want to read twice — it is the only place the list of medals
     * that came across is written down.
     */
    deriveOutcome: string | null = null;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private members: MembersService,
        private ranksService: RanksService,
        private medalsService: MedalsService,
        private auth: AuthService,
        private toast: ToastService,
    ) {}

    // ── Capability gates (global — "may this caller ever do this?") ──────────
    get canRanksMedals(): boolean {
        return this.auth.hasCapability('edit_ranks_medals');
    }
    get canRoles(): boolean {
        return this.auth.hasCapability('manage_roles');
    }

    // ── Per-target gates (server-computed — "on THIS member?") ───────────────

    /**
     * The permission block for the open member, or null when it arrived without
     * one. Null means nothing is permitted: a stale or partial projection must
     * never be read as blanket permission (fail closed).
     */
    private get actions(): MemberPermittedActions | null {
        return this._member?.permittedActions ?? null;
    }

    /**
     * Your own record, with a block present. The server always refuses a
     * self-suspend/self-ban, but T-0246 wants those controls rendered disabled
     * with a stated reason rather than silently absent — so the two sections
     * stay alive for this case alone. It is deliberately NOT enough to make
     * `canOpenAdminActions()` offer the modal in the first place.
     */
    private get selfExplained(): boolean {
        return this.canRoles && this.isSelf && !!this.actions;
    }

    get canChangeRank(): boolean {
        return this.canRanksMedals && !!this.actions?.changeRank;
    }
    get canChangeRole(): boolean {
        return this.canRoles && !!this.actions?.changeRole;
    }
    get canAwardMedal(): boolean {
        return this.canRanksMedals && !!this.actions?.awardMedal;
    }
    get canRemoveMedal(): boolean {
        return this.canRanksMedals && !!this.actions?.removeMedal;
    }
    get canManageMedals(): boolean {
        return this.canAwardMedal || this.canRemoveMedal;
    }
    get canSuspend(): boolean {
        return this.canRoles && !!this.actions?.suspend;
    }
    get canUnsuspend(): boolean {
        return this.canRoles && !!this.actions?.unsuspend;
    }
    /** The suspend inputs; kept on your own record so T-0246's hint has a home. */
    get showSuspendForm(): boolean {
        return this.canSuspend || this.selfExplained;
    }
    get showSuspendSection(): boolean {
        return this.showSuspendForm || this.canUnsuspend;
    }
    get canBan(): boolean {
        return this.canRoles && !!this.actions?.ban;
    }
    get canUnban(): boolean {
        return this.canRoles && !!this.actions?.unban;
    }
    /**
     * Pull rank + medals from Discord. Same capability as the rank/medal controls
     * it writes through, and the server's own per-target flag — which is false on
     * your own record, because deriving yourself is a self-promotion.
     */
    get canDeriveFromDiscord(): boolean {
        return this.canRanksMedals && !!this.actions?.deriveFromDiscord;
    }
    /** The ban inputs; same self-record carve-out as {@link showSuspendForm}. */
    get showBanForm(): boolean {
        return this.canBan || this.selfExplained;
    }
    get showBanSection(): boolean {
        return this.showBanForm || this.canUnban;
    }

    /**
     * Why the dialog has nothing to offer: the member stands level with the
     * signed-in admin or above them, so the server refuses every moderation
     * action against them and only the Owner can act.
     *
     * ── WHY THIS EARNS ITS OWN NOTICE ───────────────────────────────────────
     * Appointing a peer is allowed; moderating one is not. So an Admin who
     * promotes a Moderator to Admin gets a success toast and, in the SAME tick,
     * a projection whose every `permittedActions` flag is false — the controls
     * vanish and the dialog said "You don't have permission to manage this
     * member." Read against an action that had just succeeded, that says the
     * promotion was rejected. It was not; the promotion is exactly what put the
     * member out of reach.
     *
     * Deliberately NOT a gate — `hasAnyPermittedAction` still decides what is
     * shown, from the server's own flags. This picks the wording only.
     */
    get lockedOutByStanding(): boolean {
        const me = this.auth.currentUser();
        if (!me?.isMember || this.isSelf || !this._member) {
            return false;
        }
        return standsLevelOrAbove(me.role, this._member.role);
    }

    /** "an Admin" / "a Moderator", for the notice above. */
    get memberRoleWithArticle(): string {
        return `${articleFor(this._member?.role)} ${this._member?.role ?? 'member'}`;
    }

    /**
     * Whether the modal has anything at all to show. False renders the existing
     * "no permission" notice instead of an empty dialog — which is what an Admin
     * opening the Owner, or a Moderator opening an Admin, now sees.
     */
    get hasAnyPermittedAction(): boolean {
        return (
            this.canChangeRank ||
            this.canChangeRole ||
            this.canManageMedals ||
            this.canDeriveFromDiscord ||
            this.showSuspendSection ||
            this.showBanSection
        );
    }

    /**
     * True when the open member record IS the signed-in admin's own (T-0246).
     * Matched on member id, never on the display name — two members can share a
     * name, and blocking on a name collision would lock an admin out of a real
     * moderation action. `isMember` guards the identity-only case, where
     * CurrentUser.id is a Discord identity id from a different id space.
     */
    get isSelf(): boolean {
        const me = this.auth.currentUser();
        return !!me?.isMember && !!this._member && me.id === this._member.id;
    }

    /**
     * True when the member is *actively* suspended (suspendedUntil in the future),
     * matching deriveMemberStatus + the backend unsuspend guard. Drives the
     * Unsuspend button so it never shows for an already-elapsed suspension.
     */
    get isActivelySuspended(): boolean {
        const until = this._member?.suspendedUntil;
        return !!until && new Date(until).getTime() > Date.now();
    }

    /** Local minimum for the suspend datetime-local (now, to the minute). */
    get minDateTime(): string {
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
            d.getHours(),
        )}:${pad(d.getMinutes())}`;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────
    private initialise(): void {
        this.error = null;
        this.deriveOutcome = null;
        this.banConfirming = false;
        this.medalDetail = '';
        this.suspendUntil = '';
        this.suspendReason = '';
        this.banReason = '';
        this.assignableRoles = assignableRolesFor(this.auth.currentUser()?.role ?? null);
        this.seedSelects();
        this.loadCatalogues();
    }

    private seedSelects(): void {
        const m = this._member;
        this.selectedRankId = m?.rankId ?? '';
        // Only preselect a role the caller could actually re-assign — seeding a
        // role that is not an option leaves the select showing a blank label.
        const role = m && m.role !== 'Owner' ? m.role : '';
        this.selectedRole = role && this.assignableRoles.includes(role) ? role : '';
        this.selectedMedalId = '';
    }

    private loadCatalogues(): void {
        if (this.cataloguesLoaded) return;
        this.cataloguesLoaded = true;
        if (this.canRanksMedals) {
            this.ranksService
                .getAll()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (rows) => (this.ranks = rows),
                    error: (e) => (this.error = this.extractError(e)),
                });
            this.medalsService
                .getAll()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (rows) => (this.medals = rows),
                    error: (e) => (this.error = this.extractError(e)),
                });
        }
    }

    onClose(): void {
        this.closed.emit();
    }

    /** Close when the backdrop (not the dialog) is clicked. */
    onBackdrop(event: MouseEvent): void {
        if (event.target === event.currentTarget) this.onClose();
    }

    /** Escape closes the dialog for keyboard users (the backdrop click is mouse-only). */
    @HostListener('document:keydown.escape')
    onEscapeKey(): void {
        if (this._member) this.onClose();
    }

    // ── Actions ──────────────────────────────────────────────────────────────
    // Each re-checks its gate before calling out. The control is already hidden,
    // but a stale [member] binding could still let a click through, and a stated
    // refusal beats a silent no-op or a bare 403 from the server (T-0266).
    //
    // Each also names its own OUTCOME, which `run` raises as a toast (T-0284).
    // These dialogs sit over a page the change is not visible on, and several
    // actions (a role change, a medal removal) leave no mark inside the modal
    // either — so before this, a successful action and a click that did nothing
    // at all looked identical. The message is built from the member the SERVER
    // returned, never from the local form state, so it reports what actually
    // landed rather than what was asked for.
    changeRank(): void {
        const m = this._member;
        if (!m || !this.selectedRankId) return;
        if (!this.canChangeRank) return this.refuse("change this member's rank");
        this.rankBusy = true;
        this.run(
            this.members.changeRank(m.id, this.selectedRankId),
            () => (this.rankBusy = false),
            (updated) => `${updated.inGameName} is now ${updated.rank}.`,
        );
    }

    changeRole(): void {
        const m = this._member;
        if (!m || !this.selectedRole) return;
        if (!this.canChangeRole) return this.refuse("change this member's role");
        if (!this.assignableRoles.includes(this.selectedRole)) {
            return this.refuse(`assign the ${this.selectedRole} role`);
        }
        this.roleBusy = true;
        this.run(
            this.members.changeRole(m.id, this.selectedRole),
            () => (this.roleBusy = false),
            (updated) =>
                `${updated.inGameName} is now ${articleFor(updated.role)} ${updated.role}.`,
        );
    }

    awardMedal(): void {
        const m = this._member;
        if (!m || !this.selectedMedalId) return;
        if (!this.canAwardMedal) return this.refuse('award a medal to this member');
        // Read the title BEFORE the request clears the select, so the confirmation
        // can name the medal rather than saying "a medal was awarded".
        const title = this.medals.find((medal) => medal.id === this.selectedMedalId)?.title;
        this.awardBusy = true;
        this.run(
            this.members.awardMedal(m.id, this.selectedMedalId, this.medalDetail || undefined),
            () => {
                this.awardBusy = false;
                this.medalDetail = '';
                this.selectedMedalId = '';
            },
            (updated) => `Awarded ${title ?? 'the medal'} to ${updated.inGameName}.`,
        );
    }

    removeMedal(medalId: string): void {
        const m = this._member;
        if (!m || this.removingMedalId) return;
        if (!this.canRemoveMedal) return this.refuse("remove this member's medals");
        // Same reason as the award: the chip is gone by the time this resolves.
        const title = m.medalAwards?.find((award) => award.medalId === medalId)?.title;
        this.removingMedalId = medalId;
        this.run(
            this.members.removeMedal(m.id, medalId),
            () => (this.removingMedalId = null),
            (updated) => `Removed ${title ?? 'the medal'} from ${updated.inGameName}.`,
        );
    }

    /**
     * Pull the rank + medals this member's Discord roles already carry onto their
     * record (T-0284 / backend T-0204).
     *
     * The one admin action whose effect the caller cannot predict, so it is also
     * the one that most needs to report back: the server authors the sentence
     * (it is the same one written to the audit log) and it is shown twice — as a
     * toast, and left in the dialog where it can be re-read.
     */
    deriveFromDiscord(): void {
        const m = this._member;
        if (!m || this.deriveBusy) return;
        if (!this.canDeriveFromDiscord) {
            return this.refuse("derive this member's rank and medals from Discord");
        }
        this.deriveBusy = true;
        this.deriveOutcome = null;
        this.members
            .deriveFromDiscord(m.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (result) => {
                    this.deriveBusy = false;
                    this.applyUpdate(result.member);
                    this.deriveOutcome = result.summary;
                    // A run that found nothing is a success, but not an
                    // achievement — say so in the neutral tone, so "already up to
                    // date" does not read as "records changed".
                    const changed = !!result.rank || result.medals.length > 0;
                    if (changed) this.toast.success(result.summary);
                    else this.toast.info(result.summary);
                },
                error: this.onFailure(() => (this.deriveBusy = false)),
            });
    }

    suspend(): void {
        const m = this._member;
        if (!m) return;
        // Belt and braces: the button is disabled, but a stale `member` binding
        // could still let a click through. The backend rejects it with 403 too.
        if (this.isSelf) {
            this.fail('You cannot suspend your own account.');
            return;
        }
        if (!this.canSuspend) return this.refuse('suspend this member');
        if (!this.suspendUntil) {
            this.error = 'Choose a date and time for the suspension to end.';
            return;
        }
        const until = new Date(this.suspendUntil);
        if (isNaN(until.getTime()) || until.getTime() <= Date.now()) {
            this.error = 'The suspension end must be in the future.';
            return;
        }
        this.suspendBusy = true;
        this.run(
            this.members.suspend(m.id, until.toISOString(), this.suspendReason || undefined),
            () => (this.suspendBusy = false),
            (updated) =>
                `${updated.inGameName} is suspended until ${until.toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                })}.`,
        );
    }

    startBan(): void {
        if (this.isSelf) {
            this.fail('You cannot ban your own account.');
            return;
        }
        if (!this.canBan) return this.refuse('ban this member');
        this.error = null;
        this.banConfirming = true;
    }
    cancelBan(): void {
        this.banConfirming = false;
    }
    confirmBan(): void {
        const m = this._member;
        if (!m) return;
        if (this.isSelf) {
            this.banConfirming = false;
            this.fail('You cannot ban your own account.');
            return;
        }
        if (!this.canBan) {
            this.banConfirming = false;
            return this.refuse('ban this member');
        }
        this.banBusy = true;
        this.run(
            this.members.ban(m.id, this.banReason || undefined),
            () => {
                this.banBusy = false;
                this.banConfirming = false;
            },
            (updated) => `${updated.inGameName} is banned and their access is revoked.`,
        );
    }

    unban(): void {
        const m = this._member;
        if (!m) return;
        if (!this.canUnban) return this.refuse("lift this member's ban");
        this.banBusy = true;
        this.run(
            this.members.unban(m.id),
            () => (this.banBusy = false),
            (updated) => `${updated.inGameName}'s ban is lifted.`,
        );
    }

    unsuspend(): void {
        const m = this._member;
        if (!m) return;
        if (!this.canUnsuspend) return this.refuse("lift this member's suspension");
        this.unsuspendBusy = true;
        this.run(
            this.members.unsuspend(m.id),
            () => (this.unsuspendBusy = false),
            (updated) => `${updated.inGameName}'s suspension is lifted.`,
        );
    }

    // ── Shared plumbing ──────────────────────────────────────────────────────

    /**
     * Run one admin action. `success` builds the confirmation toast from the
     * member the SERVER returned — every action raises one (T-0284), so a
     * completed action never looks the same as a click that did nothing.
     */
    private run(
        obs: Observable<Member>,
        stop: () => void,
        success: (updated: Member) => string,
    ): void {
        this.error = null;
        obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (updated) => {
                stop();
                this.applyUpdate(updated);
                this.toast.success(success(updated));
            },
            error: this.onFailure(stop),
        });
    }

    /**
     * The shared error arm, so the actions that do not return a bare member (the
     * derive) cannot drift from the ones that do — including the 403 handling,
     * which is the part that must never be forgotten.
     */
    private onFailure(stop: () => void): (error: unknown) => void {
        return (e) => {
            stop();
            const err = e as HttpErrorResponse;
            if (err?.status === 403) {
                // The projection this modal gated on is provably stale, so drop
                // it: the offered controls fold away instead of sitting there
                // inviting a second rejected click.
                this.revokePermittedActions();
            }
            this.fail(this.extractError(e));
        };
    }

    /**
     * Surface a failure. The inline notice lives inside a scrollable body and can
     * sit off-screen on a phone, so every failure ALSO raises a toast — a
     * rejected action must never look like nothing happened (T-0246).
     */
    private fail(message: string): void {
        this.error = message;
        this.toast.error(message);
    }

    /** Refuse an action this caller is not permitted to take on this member. */
    private refuse(what: string): void {
        this.fail(`You don't have permission to ${what}.`);
    }

    /**
     * Forget the server's permission block after a 403. Fail closed: whatever the
     * projection said, the API has just told us otherwise.
     */
    private revokePermittedActions(): void {
        if (this._member?.permittedActions) {
            this._member = { ...this._member, permittedActions: undefined };
        }
    }

    private applyUpdate(updated: Member): void {
        this._member = updated;
        this.seedSelects();
        this.memberUpdated.emit(updated);
    }

    private extractError(e: unknown): string {
        const err = e as HttpErrorResponse;
        if (err?.status === 403) {
            return this.forbiddenMessage(err);
        }
        return err?.error?.message ?? err?.message ?? 'Something went wrong. Please try again.';
    }

    /**
     * A 403 here means the server refused something the modal was still
     * offering — the caller's permissions, or the target's role, changed under
     * the session. Say that plainly (keeping the server's own reason when it
     * sent one) so a race reads as a rule and not as a broken button (T-0266).
     */
    private forbiddenMessage(err: HttpErrorResponse): string {
        const raw = err?.error?.message;
        const reason = typeof raw === 'string' ? raw.trim().replace(/\.$/, '') : '';
        const name = this._member?.inGameName ?? 'this member';
        const head = reason || `You're no longer allowed to do that to ${name}`;
        return `${head} — your permissions may have changed. Reload the page and try again.`;
    }
}
