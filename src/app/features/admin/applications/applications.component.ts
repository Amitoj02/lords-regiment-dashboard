import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Application } from '../../../core/models/application.model';
import { ApplicationsService } from '../../../core/services/applications.service';

type QueueTab = 'pending' | 'held' | 'approved' | 'declined' | 'reapply';

@Component({
    selector: 'app-applications',
    templateUrl: './applications.component.html',
    styleUrls: ['./applications.component.scss'],
    standalone: false,
})
export class ApplicationsComponent implements OnInit {
    activeTab: QueueTab = 'pending';
    selectedId: string | null = null;

    moderatorNote = '';
    discordDmMessage = '';

    /**
     * Server-side refusal of the last decision (approve / decline / hold), shown
     * beside the decision buttons. The API explains *why* it refused — e.g. the
     * mercenary track being closed blocks approving a Mercenary onto it — and
     * that message is the only thing telling the moderator what to do next, so
     * it must reach the pane rather than the console.
     */
    moderationError: string | null = null;

    /** The full review queue (every status) loaded from the API. */
    applications: Application[] = [];
    loading = false;

    private readonly destroyRef = inject(DestroyRef);

    constructor(private applicationsService: ApplicationsService) {}

    ngOnInit(): void {
        this.loadApplications();
    }

    private loadApplications(): void {
        this.loading = true;
        this.applicationsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (apps) => {
                    this.applications = apps;
                    this.loading = false;
                    if (
                        !this.selectedId ||
                        !this.applications.some((a) => a.id === this.selectedId)
                    ) {
                        this.selectFirst();
                    }
                },
                error: (err) => {
                    console.error('Failed to load applications', err);
                    this.loading = false;
                },
            });
    }

    private matchesTab(app: Application, tab: QueueTab): boolean {
        if (tab === 'reapply') {
            return !!app.isPreviousApplicant;
        }
        return app.status === tab;
    }

    /** Applications shown in the queue for the active tab. */
    get queue(): Application[] {
        return this.applications.filter((a) => this.matchesTab(a, this.activeTab));
    }

    tabCount(tab: QueueTab): number {
        return this.applications.filter((a) => this.matchesTab(a, tab)).length;
    }

    get selectedApplication(): Application | null {
        return this.applications.find((a) => a.id === this.selectedId) ?? null;
    }

    /**
     * The applicant's live display name (T-0222): the promoted member's name or
     * linked Discord global name, falling back to the submit-time snapshot when
     * the backend has no live identity for them.
     */
    displayName(app: Application): string {
        return app.currentDisplayName || app.applicantName;
    }

    private selectFirst(): void {
        this.selectApplication(this.queue[0]?.id ?? null);
    }

    selectApplication(id: string | null): void {
        this.selectedId = id;
        this.moderatorNote = '';
        this.discordDmMessage = '';
        // A refusal belongs to the application it was raised on — never let it
        // bleed onto the next one the moderator opens.
        this.moderationError = null;
    }

    isSelected(id: string): boolean {
        return this.selectedId === id;
    }

    get selectedIndex(): number {
        return this.queue.findIndex((q) => q.id === this.selectedId);
    }

    prev(): void {
        const idx = this.selectedIndex;
        if (idx > 0) {
            this.selectApplication(this.queue[idx - 1].id);
        }
    }

    next(): void {
        const idx = this.selectedIndex;
        if (idx > -1 && idx < this.queue.length - 1) {
            this.selectApplication(this.queue[idx + 1].id);
        }
    }

    setTab(tab: QueueTab): void {
        this.activeTab = tab;
        this.selectFirst();
    }

    private afterDecision(): void {
        // Re-pull the queue so the decided application moves to its new bucket.
        this.selectedId = null;
        this.moderationError = null;
        this.loadApplications();
    }

    /**
     * Surface a refused decision. The server's own message is preferred — it is
     * written for the moderator and names the actual blocker — with a generic
     * line only when the failure carries no body (network drop, 5xx).
     */
    private decisionFailed(err: unknown, fallback: string): void {
        console.error(fallback, err);
        this.moderationError =
            (err as { error?: { message?: string } })?.error?.message ?? fallback;
    }

    approve(): void {
        const id = this.selectedId;
        if (!id) {
            return;
        }
        this.moderationError = null;
        // Approve takes no moderator note server-side (it promotes to a member),
        // but the Discord DM message is sent to the applicant on approval too.
        this.applicationsService
            .approve(id, this.discordDmMessage)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.afterDecision(),
                error: (err) =>
                    this.decisionFailed(
                        err,
                        'This application could not be approved. Please try again.',
                    ),
            });
    }

    decline(): void {
        const id = this.selectedId;
        if (!id) {
            return;
        }
        this.moderationError = null;
        this.applicationsService
            .decline(id, this.moderatorNote, this.discordDmMessage)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.afterDecision(),
                error: (err) =>
                    this.decisionFailed(
                        err,
                        'This application could not be declined. Please try again.',
                    ),
            });
    }

    hold(): void {
        const id = this.selectedId;
        if (!id) {
            return;
        }
        this.moderationError = null;
        this.applicationsService
            .hold(id, this.moderatorNote, this.discordDmMessage)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.afterDecision(),
                error: (err) =>
                    this.decisionFailed(
                        err,
                        'This application could not be held for committee. Please try again.',
                    ),
            });
    }

    // ── Applicant blocklist (T-0033) ─────────────────────────────────────────────
    moderating = false;

    /** Permanently block the selected applicant from submitting further applications. */
    blockApplicant(): void {
        const id = this.selectedId;
        if (!id) {
            return;
        }
        this.moderationError = null;
        this.moderating = true;
        this.applicationsService
            .blockApplicant(id, this.moderatorNote || undefined)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.moderating = false;
                    this.loadApplications();
                },
                error: (err) => {
                    this.moderating = false;
                    this.decisionFailed(
                        err,
                        'This applicant could not be blocked. Please try again.',
                    );
                },
            });
    }

    /** Re-enable a previously blocked applicant. */
    unblockApplicant(): void {
        const id = this.selectedId;
        if (!id) {
            return;
        }
        this.moderationError = null;
        this.moderating = true;
        this.applicationsService
            .unblockApplicant(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.moderating = false;
                    this.loadApplications();
                },
                error: (err) => {
                    this.moderating = false;
                    this.decisionFailed(
                        err,
                        'This applicant could not be re-enabled. Please try again.',
                    );
                },
            });
    }
}
