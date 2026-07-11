import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuditLog } from '../../../core/models/audit-log.model';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';

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

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private auditService: AuditService,
        private auth: AuthService,
    ) {}

    /** Capability gate for a template action (see the spec's capability keys). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    ngOnInit(): void {
        this.auditService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((logs) => {
                this.logs = logs;
                this.filteredLogs = logs;
                this.selectedLog = logs[0] ?? null;
                this.actors = [...new Set(logs.map((l) => l.actor))];
                this.actions = [...new Set(logs.map((l) => l.action))];
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
