import {
    Component,
    DestroyRef,
    EventEmitter,
    HostListener,
    Input,
    Output,
    inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Medal, Member, MemberRole, Rank } from '../../../core/models/member.model';
import { MembersService } from '../../../core/services/members.service';
import { RanksService } from '../../../core/services/ranks.service';
import { MedalsService } from '../../../core/services/medals.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Single admin-action modal for a member. Each section is gated by capability
 * and hidden when the caller lacks it. Shown while [member] is non-null.
 */
@Component({
    selector: 'hf-admin-action-modal',
    templateUrl: './admin-action-modal.component.html',
    styleUrls: ['./admin-action-modal.component.scss'],
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

    /** Roles a caller may assign (owner transfer is a separate flow). */
    readonly assignableRoles: MemberRole[] = [
        'Admin',
        'Moderator',
        'Member',
        'Mercenary',
        'Applicant',
    ];

    // ── Per-action loading + error ───────────────────────────────────────────
    rankBusy = false;
    roleBusy = false;
    awardBusy = false;
    removingMedalId: string | null = null;
    suspendBusy = false;
    banBusy = false;
    error: string | null = null;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private members: MembersService,
        private ranksService: RanksService,
        private medalsService: MedalsService,
        private auth: AuthService,
    ) {}

    // ── Capability gates ─────────────────────────────────────────────────────
    get canRanksMedals(): boolean {
        return this.auth.hasCapability('edit_ranks_medals');
    }
    get canRoles(): boolean {
        return this.auth.hasCapability('manage_roles');
    }
    get hasAnyCapability(): boolean {
        return this.canRanksMedals || this.canRoles;
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
        this.banConfirming = false;
        this.medalDetail = '';
        this.suspendUntil = '';
        this.suspendReason = '';
        this.banReason = '';
        this.seedSelects();
        this.loadCatalogues();
    }

    private seedSelects(): void {
        const m = this._member;
        this.selectedRankId = m?.rankId ?? '';
        this.selectedRole = m && m.role !== 'Owner' ? m.role : '';
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
    changeRank(): void {
        const m = this._member;
        if (!m || !this.selectedRankId) return;
        this.rankBusy = true;
        this.run(this.members.changeRank(m.id, this.selectedRankId), () => (this.rankBusy = false));
    }

    changeRole(): void {
        const m = this._member;
        if (!m || !this.selectedRole) return;
        this.roleBusy = true;
        this.run(this.members.changeRole(m.id, this.selectedRole), () => (this.roleBusy = false));
    }

    awardMedal(): void {
        const m = this._member;
        if (!m || !this.selectedMedalId) return;
        this.awardBusy = true;
        this.run(
            this.members.awardMedal(m.id, this.selectedMedalId, this.medalDetail || undefined),
            () => {
                this.awardBusy = false;
                this.medalDetail = '';
                this.selectedMedalId = '';
            },
        );
    }

    removeMedal(medalId: string): void {
        const m = this._member;
        if (!m || this.removingMedalId) return;
        this.removingMedalId = medalId;
        this.run(this.members.removeMedal(m.id, medalId), () => (this.removingMedalId = null));
    }

    suspend(): void {
        const m = this._member;
        if (!m) return;
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
        );
    }

    startBan(): void {
        this.error = null;
        this.banConfirming = true;
    }
    cancelBan(): void {
        this.banConfirming = false;
    }
    confirmBan(): void {
        const m = this._member;
        if (!m) return;
        this.banBusy = true;
        this.run(this.members.ban(m.id, this.banReason || undefined), () => {
            this.banBusy = false;
            this.banConfirming = false;
        });
    }

    unban(): void {
        const m = this._member;
        if (!m) return;
        this.banBusy = true;
        this.run(this.members.unban(m.id), () => (this.banBusy = false));
    }

    // ── Shared plumbing ──────────────────────────────────────────────────────
    private run(obs: Observable<Member>, stop: () => void): void {
        this.error = null;
        obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (updated) => {
                stop();
                this.applyUpdate(updated);
            },
            error: (e) => {
                stop();
                this.error = this.extractError(e);
            },
        });
    }

    private applyUpdate(updated: Member): void {
        this._member = updated;
        this.seedSelects();
        this.memberUpdated.emit(updated);
    }

    private extractError(e: unknown): string {
        const err = e as HttpErrorResponse;
        return err?.error?.message ?? err?.message ?? 'Something went wrong. Please try again.';
    }
}
