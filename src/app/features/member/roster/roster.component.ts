import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
    Member,
    deriveMemberStatus,
    statusTooltip,
    statusVariant,
} from '../../../core/models/member.model';
import { MembersService } from '../../../core/services/members.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'hf-roster',
    templateUrl: './roster.component.html',
    styleUrls: ['./roster.component.scss'],
    standalone: false,
})
export class RosterComponent implements OnInit {
    allMembers: Member[] = [];
    filteredMembers: Member[] = [];

    /** The member whose admin-action modal is open (null = closed). */
    selectedMember: Member | null = null;

    searchQuery = '';
    filterRank = '';
    filterRole = '';
    filterStatus = '';

    ranks = [
        'Colonel',
        'Major',
        'Captain',
        'Lieutenant',
        'Sergeant',
        'Corporal',
        'Private',
        'Mercenary',
        'Applicant',
    ];
    roles = ['Owner', 'Admin', 'Moderator', 'Member', 'Mercenary', 'Applicant'];
    statuses = ['Active', 'Inactive', 'Pending', 'Suspended', 'Banned'];

    // Pure status-derivation helpers exposed to the template (T-0184).
    readonly deriveStatus = deriveMemberStatus;
    readonly statusVariant = statusVariant;
    readonly statusTooltip = statusTooltip;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private membersService: MembersService,
        private auth: AuthService,
        private router: Router,
    ) {}

    /** Whether the caller may open the admin-action modal on a row. */
    get canManage(): boolean {
        return (
            this.auth.hasCapability('edit_ranks_medals') || this.auth.hasCapability('manage_roles')
        );
    }

    /** Only Owners/Admins may pull a roster ledger export. */
    get canExport(): boolean {
        return this.auth.isOwnerOrAdmin();
    }

    openActions(member: Member): void {
        this.selectedMember = member;
    }

    /** Row click → the member's profile (the actions button stops propagation). */
    goToProfile(id: string): void {
        this.router.navigate(['/app/profile', id]);
    }

    /** Build + download a CSV of the currently-filtered roster (Owners/Admins). */
    exportLedger(): void {
        if (!this.canExport) {
            return;
        }
        const headers = ['In-game name', 'Discord tag', 'Rank', 'Role', 'Status', 'Last seen'];
        const rows = this.filteredMembers.map((m) => [
            m.inGameName,
            m.discordTag,
            m.rank,
            m.role,
            // Export the derived status so the CSV matches the visible pill.
            deriveMemberStatus(m),
            m.lastSeen,
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => this.csvCell(cell)).join(','))
            .join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `roster-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    /** Escape a single CSV field (quote when it contains a comma/quote/newline). */
    private csvCell(value: string): string {
        const v = value ?? '';
        return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }

    /** Replace the updated member across the roster and re-apply filters. */
    onMemberUpdated(updated: Member): void {
        const swap = (list: Member[]) => {
            const i = list.findIndex((m) => m.id === updated.id);
            if (i !== -1) list[i] = updated;
        };
        swap(this.allMembers);
        this.applyFilters();
    }

    ngOnInit(): void {
        this.membersService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((members) => {
                this.allMembers = members;
                this.filteredMembers = members;
            });
    }

    applyFilters(): void {
        let results = this.allMembers;

        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            results = results.filter(
                (m) =>
                    m.discordTag.toLowerCase().includes(q) ||
                    m.inGameName.toLowerCase().includes(q),
            );
        }

        if (this.filterRank) {
            results = results.filter((m) => m.rank === this.filterRank);
        }

        if (this.filterRole) {
            results = results.filter((m) => m.role === this.filterRole);
        }

        if (this.filterStatus) {
            results = results.filter((m) => deriveMemberStatus(m) === this.filterStatus);
        }

        this.filteredMembers = results;
    }

    clearFilters(): void {
        this.searchQuery = '';
        this.filterRank = '';
        this.filterRole = '';
        this.filterStatus = '';
        this.filteredMembers = this.allMembers;
    }

    formatLastSeen(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    getRoleClass(role: string): string {
        switch (role) {
            case 'Owner':
                return 'brass';
            case 'Admin':
                return 'ox';
            case 'Moderator':
                return 'blue';
            case 'Member':
                return 'parch';
            default:
                return '';
        }
    }
}
