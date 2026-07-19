import {
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
    ViewChild,
    inject,
    OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuditLog, DiscordSyncStatus } from '../../../core/models/audit-log.model';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';
import { DiffLine, diffLines, isJsonValue, prettyAuditValue } from './audit-diff.util';

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

    /** The dialog container — focused on open so the modal is announced (a11y). */
    @ViewChild('auditDialog') auditDialog?: ElementRef<HTMLElement>;
    /** The element that opened the dialog, so focus can be restored on close. */
    private lastFocused: HTMLElement | null = null;

    // ── Before/After view (T-0219..T-0221), derived once per opened entry ─────────
    /** Before/After, JSON-prettified (2-space) when parseable, else verbatim. */
    beforePretty = '';
    afterPretty = '';
    /** Whether each side is JSON (drives mono block vs plain-text rendering). */
    beforeIsJson = false;
    afterIsJson = false;
    /** Git-style line diff of the prettified states (only when both are present). */
    stateDiff: DiffLine[] = [];
    /** Both Before and After present — the only case a diff is meaningful. */
    bothStatesPresent = false;
    /** Toggle: show the raw side-by-side view instead of the diff (defaults to diff). */
    showRawState = false;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private auditService: AuditService,
        private auth: AuthService,
    ) {}

    /** Capability gate for a template action (see the spec's capability keys). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    /** Only Owners/Admins may export the ledger as a CSV. */
    get canExport(): boolean {
        return this.auth.isOwnerOrAdmin();
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
                    // No auto-select: the page opens with the detail dialog closed;
                    // it opens on row click (T-0189).
                    this.actors = [...new Set(logs.map((l) => l.actor))];
                    this.actions = [...new Set(logs.map((l) => l.action))];
                },
                error: (err) => {
                    this.loading = false;
                    this.loadError = 'Could not load the audit ledger — please try again.';
                    console.error('Failed to load audit ledger', err);
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

    /** Open the detail dialog for a row. */
    selectLog(log: AuditLog): void {
        // Remember the trigger so focus can return to it when the dialog closes.
        this.lastFocused = document.activeElement as HTMLElement | null;
        this.selectedLog = log;
        this.prepareStateView(log);
        // Move focus into the dialog once it has rendered, so screen readers
        // announce it and keyboard focus is no longer on the obscured background.
        setTimeout(() => this.auditDialog?.nativeElement.focus());
    }

    /**
     * Derive the Before/After view for an opened entry (T-0219..T-0221): prettify
     * each side (JSON → indented, else verbatim), decide whether a git-style diff
     * is meaningful (both sides present), and default to the diff view. Computed
     * once here rather than in template getters so the O(n·m) diff never re-runs on
     * every change-detection pass.
     */
    private prepareStateView(log: AuditLog): void {
        const before = log.beforeState ?? '';
        const after = log.afterState ?? '';
        this.beforeIsJson = isJsonValue(before);
        this.afterIsJson = isJsonValue(after);
        this.beforePretty = prettyAuditValue(before);
        this.afterPretty = prettyAuditValue(after);
        this.bothStatesPresent = !!before && !!after;
        this.stateDiff = this.bothStatesPresent
            ? diffLines(this.beforePretty, this.afterPretty)
            : [];
        // Default to the diff view whenever one is available.
        this.showRawState = false;
    }

    /** Flip between the git-style diff and the raw side-by-side Before/After view. */
    toggleStateView(): void {
        this.showRawState = !this.showRawState;
    }

    /** Close the detail dialog and restore focus to the row that opened it. */
    closeDetail(): void {
        this.selectedLog = null;
        this.lastFocused?.focus?.();
        this.lastFocused = null;
    }

    /** Close when the backdrop (not the dialog) is clicked. */
    onBackdrop(event: MouseEvent): void {
        if (event.target === event.currentTarget) this.closeDetail();
    }

    /** Escape closes the dialog for keyboard users (the backdrop click is mouse-only). */
    @HostListener('document:keydown.escape')
    onEscapeKey(): void {
        if (this.selectedLog) this.closeDetail();
    }

    /** Pin the ledger to a single actor (the dialog's "All by …" affordance). */
    filterByActor(actor: string): void {
        this.filterActor = actor;
        this.applyFilters();
        // Close the dialog so the freshly-filtered table is visible (the modal
        // overlay would otherwise keep covering it).
        this.closeDetail();
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
