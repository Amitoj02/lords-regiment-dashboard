import { Component, DestroyRef, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentEvent } from '../../../core/models/event.model';
import { Application } from '../../../core/models/application.model';
import { AuditLog } from '../../../core/models/audit-log.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { GallerySubmissionSummary, GalleryService } from '../../../core/services/gallery.service';
import { BotStatus, DiscordService } from '../../../core/services/discord.service';

/**
 * The staff console's landing page (T-0287).
 *
 * It used to be the member dashboard, and carried the signed-in member's own
 * honours strip and a browsable Recent Gallery. Both moved out with the rest of
 * the member-facing site — decorations belong on the public profile and the
 * gallery archive is at `/gallery` — so what is left here answers one question:
 * WHAT NEEDS ATTENTION. Every panel is a queue, a calendar or a health signal,
 * and every panel is gated on the capability that makes its screen reachable, so
 * nothing links a moderator into a 403.
 */
@Component({
    selector: 'hf-overview',
    templateUrl: './overview.component.html',
    styleUrls: ['./overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class OverviewComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    private readonly applicationsService = inject(ApplicationsService);
    private readonly auditService = inject(AuditService);
    private readonly eventsService = inject(EventsService);
    private readonly galleryService = inject(GalleryService);
    private readonly discordService = inject(DiscordService);
    private readonly PREVIEW_COUNT = 3;
    private readonly ACTIVITY_COUNT = 6;

    upcomingEvents: RegimentEvent[] = [];
    /** Gallery submissions awaiting moderation (T-0127). */
    gallerySubmissions: GallerySubmissionSummary[] = [];
    pendingApplications: Application[] = [];
    /** Newest audit entries — the console's "what has been happening" line. */
    recentActivity: AuditLog[] = [];

    /** Live bot status for the Lord Adjutant widget (T-0081). */
    botStatus: BotStatus | null = null;
    botStatusError = false;

    ngOnInit(): void {
        // Recruitment review preview — only for staff who can act on it.
        if (this.canReviewApplications) {
            this.applicationsService
                .getAll('pending')
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (apps) => {
                        this.pendingApplications = apps.slice(0, this.PREVIEW_COUNT);
                    },
                    error: (err) => console.error('Failed to load pending applications', err),
                });
        }

        // Upcoming Events — the next 5 (T-0076).
        this.eventsService
            .getAllMine('upcoming')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (events) => {
                    this.upcomingEvents = [...events]
                        .sort((a, b) =>
                            `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
                        )
                        .slice(0, 5);
                },
                error: (err) => console.error('Failed to load upcoming events', err),
            });

        // Gallery submissions — pending queue preview for ManageEvents holders (T-0127).
        if (this.canManageEvents) {
            this.galleryService
                .pendingSummary()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (items) => (this.gallerySubmissions = items),
                    error: (err) => console.error('Failed to load gallery submissions', err),
                });
        }

        // Recent activity — the head of the audit ledger, for whoever may read it.
        if (this.canViewAudit) {
            this.auditService
                .getAll()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (logs) => (this.recentActivity = logs.slice(0, this.ACTIVITY_COUNT)),
                    error: (err) => console.error('Failed to load recent activity', err),
                });
        }

        // Lord Adjutant bot status (T-0081).
        if (this.canViewBotStatus) {
            this.discordService
                .getStatus()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (status) => (this.botStatus = status),
                    error: (err) => {
                        console.error('Failed to load bot status', err);
                        this.botStatusError = true;
                    },
                });
        }
    }

    /** Gate for the "Awaiting Review" panel and its link into /app/applications. */
    get canReviewApplications(): boolean {
        return this.auth.hasCapability('manage_applications');
    }

    /** Gate for the "Gallery submissions" panel (T-0127). */
    get canManageEvents(): boolean {
        return this.auth.hasCapability('manage_events');
    }

    /** Gate for the "Recent activity" panel and its link into /app/audit. */
    get canViewAudit(): boolean {
        return this.auth.hasCapability('view_audit_log');
    }

    /**
     * Gate for the Lord Adjutant widget. Role-based, not capability-based, on
     * purpose: GET /discord/status is itself guarded by Owner|Admin|Moderator,
     * so a capability check here would show the panel to staff the API refuses.
     */
    get canViewBotStatus(): boolean {
        return this.auth.isAdmin();
    }

    /** Whether the gated right column has any content (T-0168). When false, the
     * main column spans the full width instead of leaving a blank gutter. */
    get hasAside(): boolean {
        return this.canReviewApplications || this.canManageEvents || this.canViewBotStatus;
    }

    /** Everyone who has answered the RSVP question, however they answered it. */
    rsvpTotal(event: RegimentEvent): number {
        const c = event.rsvpCounts;
        return c.interested + c.tentative + c.declined + c.neutral;
    }

    /** ms → a compact "2d 3h" / "4h 12m" / "8m" uptime label. */
    formatUptime(ms: number | null): string {
        if (ms == null) return '—';
        const totalMin = Math.floor(ms / 60000);
        const d = Math.floor(totalMin / 1440);
        const h = Math.floor((totalMin % 1440) / 60);
        const m = totalMin % 60;
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    /** bytes → "128 MB". */
    formatMemory(bytes: number | null): string {
        if (bytes == null) return '—';
        return `${Math.round(bytes / (1024 * 1024))} MB`;
    }
}
