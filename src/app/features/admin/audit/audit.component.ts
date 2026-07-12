import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuditLog, DiscordSyncStatus } from '../../../core/models/audit-log.model';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';
import { DiscordService } from '../../../core/services/discord.service';

@Component({
    selector: 'app-audit',
    templateUrl: './audit.component.html',
    styleUrls: ['./audit.component.scss'],
    standalone: false,
})
export class AuditComponent implements OnInit {
    logs: AuditLog[] = [];
    filteredLogs: AuditLog[] = [];
    selectedLog: AuditLog | null = null;

    searchQuery = '';
    filterActor = '';
    filterAction = '';
    filterDate = '';

    actors: string[] = [];
    actions: string[] = [];

    exporting = false;
    loading = true;
    loadError = '';

    /** True when the bot is off or no audit-log channel is bound — entries won't cross-post. */
    discordSyncDisabled = false;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private auditService: AuditService,
        private auth: AuthService,
        private discord: DiscordService,
    ) {}

    /** Capability gate for a template action (see the spec's capability keys). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    ngOnInit(): void {
        this.loading = true;
        this.loadError = '';
        this.auditService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (logs) => {
                    this.loading = false;
                    this.logs = logs;
                    this.filteredLogs = logs;
                    this.selectedLog = logs[0] ?? null;
                    this.actors = [...new Set(logs.map((l) => l.actor))];
                    this.actions = [...new Set(logs.map((l) => l.action))];
                },
                error: (err) => {
                    this.loading = false;
                    this.loadError = 'Could not load the audit ledger — please try again.';
                    console.error('Failed to load audit ledger', err);
                },
            });

        // Surface why entries may read pending/not-applicable: the bot must be
        // enabled AND an audit-log channel bound for entries to cross-post.
        this.discord
            .getSettings()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (settings) => {
                    this.discordSyncDisabled =
                        !settings.botEnabled || settings.auditLogChannelId === null;
                },
                error: (err) => {
                    // Non-blocking: leave the banner hidden if settings can't be read.
                    console.error('Failed to load Discord settings', err);
                },
            });
    }

    applyFilters(): void {
        this.filteredLogs = this.logs.filter((l) => {
            const matchSearch =
                !this.searchQuery ||
                l.actor.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                l.action.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                l.detail.toLowerCase().includes(this.searchQuery.toLowerCase());
            const matchActor = !this.filterActor || l.actor === this.filterActor;
            const matchAction = !this.filterAction || l.action === this.filterAction;
            return matchSearch && matchActor && matchAction;
        });
    }

    selectLog(log: AuditLog): void {
        this.selectedLog = log;
    }

    /** Pin the ledger to a single actor (the detail panel's "All by …" affordance). */
    filterByActor(actor: string): void {
        this.filterActor = actor;
        this.applyFilters();
    }

    /** Human label for the entry's Discord cross-post state. */
    syncStatusLabel(status?: DiscordSyncStatus | null): string {
        switch (status) {
            case 'synced':
                return 'Synced';
            case 'pending':
                return 'Pending';
            case 'failed':
                return 'Failed';
            case 'not_applicable':
                return 'Not applicable';
            default:
                // Historical rows recorded before sync tracking existed.
                return 'Unknown';
        }
    }

    /** Status-dot modifier for the entry's Discord cross-post state. */
    syncStatusClass(status?: DiscordSyncStatus | null): string {
        switch (status) {
            case 'synced':
                return 'sync-synced';
            case 'pending':
                return 'sync-pending';
            case 'failed':
                return 'sync-failed';
            default:
                // not_applicable + null/undefined read as muted (not a false "off").
                return 'sync-muted';
        }
    }

    formatTimestamp(ts: string): string {
        return new Date(ts).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    getSeverityClass(severity: string): string {
        if (severity === 'err') return 'badge ox';
        if (severity === 'warn') return 'badge';
        return 'badge';
    }

    /** Download the filtered ledger as a CSV (ViewAuditLog). */
    exportCsv(): void {
        if (this.exporting) {
            return;
        }
        this.exporting = true;
        this.auditService
            .exportCsv({
                action: this.filterAction || undefined,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (blob) => {
                    this.triggerDownload(blob);
                    this.exporting = false;
                },
                error: (err) => {
                    console.error('Failed to export audit ledger', err);
                    this.exporting = false;
                },
            });
    }

    private triggerDownload(blob: Blob): void {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `audit-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    }
}
