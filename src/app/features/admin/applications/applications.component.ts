import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Application } from '../../../core/models/application.model';
import { ApplicationsService } from '../../../core/services/applications.service';

type QueueTab = 'pending' | 'held' | 'approved' | 'declined' | 'reapply';

/** Who-did-what line shown for a decided (or held) application. */
export interface DecisionAttribution {
    /** 'Approved' / 'Declined' / 'Held' — the action actually taken. */
    verb: string;
    /** Null when the decider's member row was removed (the FK is ON DELETE SET NULL). */
    name: string | null;
    avatarUrl: string | null;
    /**
     * Profile deep-link target for the officer (T-0274). Null alongside
     * {@link name} when their member row is gone — the chip then renders as
     * plain text rather than as a link to a profile that no longer exists.
     */
    memberId: string | null;
    /** Null for a HELD application — a hold is not a final decision, so it has no timestamp. */
    at: string | null;
}

/** Past-tense label per decided status (pending is never attributed). */
const DECISION_VERB: Record<string, string> = {
    approved: 'Approved',
    declined: 'Declined',
    held: 'Held',
};

@Component({
    selector: 'app-applications',
    templateUrl: './applications.component.html',
    styleUrls: ['./applications.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class ApplicationsComponent implements OnInit {
    activeTab: QueueTab = 'pending';
    selectedId: string | null = null;

    /** Staff-only note. Never leaves the console except as the `note` field. */
    moderatorNote = '';
    /** What the applicant receives — DM'd on decision and shown on their status page. */
    userMessage = '';

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

    /**
     * The single reset point for the decision pane — prev/next/setTab and
     * afterDecision all funnel through here. Both boxes are re-filled from the
     * newly selected row (empty for a pending application, so the placeholders
     * show), which is what stops one application's text being carried onto the
     * next one the moderator opens (T-0247). Resetting only some of this state
     * elsewhere reintroduces exactly that bug.
     */
    selectApplication(id: string | null): void {
        this.selectedId = id;
        const app = this.selectedApplication;
        this.moderatorNote = app?.moderatorNote ?? '';
        this.userMessage = app?.userMessage ?? '';
        // A refusal belongs to the application it was raised on — never let it
        // bleed onto the next one the moderator opens.
        this.moderationError = null;
    }

    /**
     * Who took the last action on the selected application (T-0250), or null
     * when there is nothing to attribute. Driven by status rather than by
     * `decidedAt`, because a HELD application has a decider while its
     * `decidedAt` is still null. Both the name and the date are individually
     * optional — the decider's member row may have been deleted since — so a
     * decision with neither left to show renders no block at all.
     */
    get decisionAttribution(): DecisionAttribution | null {
        const app = this.selectedApplication;
        if (!app || app.status === 'pending') {
            return null;
        }
        const name = app.decidedByName ?? null;
        const at = app.decidedAt ?? null;
        if (!name && !at) {
            return null;
        }
        return {
            verb: DECISION_VERB[app.status] ?? 'Decided',
            name,
            avatarUrl: app.decidedByAvatarUrl ?? null,
            // Only offer the profile link when we still have a name to hang it
            // on — an id without a name would render an empty clickable chip.
            memberId: name ? (app.decidedByMemberId ?? null) : null,
            at,
        };
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
        // Clear through the single reset point rather than nulling fields here —
        // a partial reset is how one application's text ends up on another
        // (T-0247). Then re-pull so the decided application moves to its new
        // bucket, which re-selects and re-fills from the stored values.
        this.selectApplication(null);
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
        // but the user message is sent to the applicant on approval too.
        this.applicationsService
            .approve(id, this.userMessage)
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
            // The note stays internal; only the user message reaches the applicant.
            .decline(id, this.moderatorNote, this.userMessage)
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
            .hold(id, this.moderatorNote, this.userMessage)
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

    /**
     * Permanently block the selected applicant from submitting further
     * applications. The block endpoint takes a `reason`, and the moderator note
     * is what it is given — including the note already stored on the
     * application, which the pane now prefills. Block/unblock deliberately do
     * NOT go through {@link selectApplication}: the selection is unchanged, so
     * there is nothing to reset and re-filling here would discard whatever the
     * moderator has just typed.
     */
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
