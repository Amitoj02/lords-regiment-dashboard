import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentEvent } from '../../../core/models/event.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { Application } from '../../../core/models/application.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuthService } from '../../../core/services/auth.service';
import { MembersService } from '../../../core/services/members.service';
import { EventsService } from '../../../core/services/events.service';
import { GallerySubmissionSummary, GalleryService } from '../../../core/services/gallery.service';
import { BotStatus, DiscordService } from '../../../core/services/discord.service';

interface HonorMedal {
    imageUrl: string | null;
    letter: string;
    title: string;
}

@Component({
    selector: 'hf-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    standalone: false,
})
export class DashboardComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    private readonly membersService = inject(MembersService);
    private readonly applicationsService = inject(ApplicationsService);
    private readonly eventsService = inject(EventsService);
    private readonly galleryService = inject(GalleryService);
    private readonly discordService = inject(DiscordService);
    private readonly PREVIEW_COUNT = 3;

    upcomingEvents: RegimentEvent[] = [];
    recentGallery: GalleryItem[] = [];
    // Gallery submissions awaiting moderation (T-0127) — shown to ManageEvents holders.
    gallerySubmissions: GallerySubmissionSummary[] = [];
    pendingApplications: Application[] = [];

    /** Live bot status for the STAFF-only Lord Adjutant bot widget (T-0081). */
    botStatus: BotStatus | null = null;
    botStatusError = false;

    // The signed-in member's real honors (hydrated from /auth/me + /members/:id).
    currentMember: {
        name: string;
        rank: string;
        rankImageUrl: string | null;
        medals: HonorMedal[];
    } = { name: '', rank: '—', rankImageUrl: null, medals: [] };

    ngOnInit(): void {
        const user = this.auth.currentUser();
        if (user) {
            this.currentMember.name = user.inGameName;
            this.currentMember.rank = user.rank ?? '—';
        }

        // Load the caller's own roster record for the rank icon + medals.
        if (user?.isMember) {
            this.membersService
                .getById(user.id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((m) => {
                    this.currentMember = {
                        name: m.inGameName,
                        rank: m.rank || '—',
                        rankImageUrl: m.rankImageUrl ?? null,
                        medals: (m.medalAwards ?? []).map((a) => ({
                            imageUrl: a.imageUrl ?? null,
                            letter: a.glyph,
                            title: a.title,
                        })),
                    };
                });
        }

        // Recruitment review preview — only meaningful for staff who can manage it.
        if (this.auth.hasCapability('manage_applications')) {
            this.applicationsService
                .getAll('pending')
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((apps) => {
                    this.pendingApplications = apps.slice(0, this.PREVIEW_COUNT);
                });
        }

        // Upcoming Events — the next 5 (member projection, T-0076).
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

        // Recent Gallery — the latest 10 approved items (T-0079).
        this.galleryService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (items) => {
                    this.recentGallery = items.filter((i) => i.status === 'approved').slice(0, 10);
                },
                error: (err) => console.error('Failed to load recent gallery', err),
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

        // Lord Adjutant bot status — STAFF only (Owner/Admin/Moderator), T-0081.
        if (this.isStaff) {
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

    /** STAFF gate for the applications preview + bot widget. */
    get isStaff(): boolean {
        return this.auth.isAdmin();
    }

    /** Gate for the "Gallery submissions" panel (T-0127). */
    get canManageEvents(): boolean {
        return this.auth.hasCapability('manage_events');
    }

    /** Whether the role-gated right column has any content (T-0168). When false,
     * the main column spans the full width instead of leaving a blank gutter. */
    get hasAside(): boolean {
        return this.isStaff || this.canManageEvents;
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
