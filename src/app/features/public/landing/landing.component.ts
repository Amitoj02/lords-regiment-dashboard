import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { RegimentEvent } from '../../../core/models/event.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { MediaEmbedService } from '../../../shared/services/media-embed.service';

/** A gallery item plus a resolved still-image preview URL for the landing strip. */
type GalleryPreview = GalleryItem & { previewUrl: string };

@Component({
    selector: 'hf-landing',
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.scss'],
    standalone: false,
})
export class LandingComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly previewLimit = 3;

    upcomingEvents: RegimentEvent[] = [];
    galleryItems: GalleryPreview[] = [];

    // Hero copy, bound to the live regiment profile (falls back until it loads).
    regimentName = 'The Lord Regiment';
    missionStatement =
        'An organized regiment built on drill, camaraderie, and the pursuit of ' +
        'excellence on the field of battle. We fight together, or we do not fight at all.';

    // Hero stats, gated by the Regiment-statistics visibility toggle.
    // getStats() → 403 (visibility off) hides the whole block.
    statsVisible = false;
    establishedLabel: string | null = null; // 'MM/YYYY'
    memberCount = 0;

    private readonly auth = inject(AuthService);
    private readonly media = inject(MediaEmbedService);

    constructor(
        private eventsService: EventsService,
        private galleryService: GalleryService,
        private regiment: RegimentService,
    ) {}

    /** "Apply to Join" = sign in with Discord (members go to the dashboard). */
    applyToJoin(): void {
        this.auth.applyToJoin();
    }

    /**
     * Hero CTA label follows the session (the click target is handled by
     * applyToJoin): member → dashboard, applicant → their application, anonymous
     * → apply.
     */
    get applyLabel(): string {
        if (!this.auth.isAuthenticated()) return 'Apply to Join';
        return this.auth.isMember() ? 'Go to Dashboard' : 'View Application';
    }

    ngOnInit(): void {
        this.eventsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((events) => {
                this.upcomingEvents = events
                    .filter((e) => e.status === 'upcoming')
                    .slice(0, this.previewLimit);
            });
        this.galleryService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                // Derive a still-image preview from the real media (mediaUrl) — the
                // legacy thumbnailUrl column is never populated by the upload flow
                // (T-0146). Only items that resolve to an image/YouTube poster are
                // shown in this compact marketing strip.
                this.galleryItems = items
                    .filter((i) => i.status === 'approved')
                    .map((i) => ({ ...i, previewUrl: this.previewUrl(i.mediaUrl) }))
                    .filter((i) => !!i.previewUrl)
                    .slice(0, this.previewLimit);
            });

        // Hero title + description from the live regiment profile.
        this.regiment
            .getProfile()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((profile) => {
                if (profile?.name) this.regimentName = profile.name;
                if (profile?.missionStatement) this.missionStatement = profile.missionStatement;
            });

        // Hero stats. A 403 means the Regiment-statistics visibility toggle is
        // off — swallow it and leave the block hidden.
        this.regiment
            .getStats()
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((stats) => {
                if (!stats) {
                    this.statsVisible = false;
                    return;
                }
                this.statsVisible = true;
                this.memberCount = stats.enrolledExcludingMercenaries;
                this.establishedLabel = this.formatEstablished(stats.establishedAt);
            });
    }

    /** 'YYYY-MM-DD' → 'MM/YYYY' (timezone-safe: no Date parsing). */
    private formatEstablished(dateStr: string | null): string | null {
        if (!dateStr) return null;
        const [year, month] = dateStr.split('-');
        return year && month ? `${month}/${year}` : null;
    }

    /** A still-image URL for a gallery item (image → itself, YouTube → poster; else ''). */
    private previewUrl(url: string | undefined): string {
        const embed = this.media.resolve(url);
        if (!embed) return '';
        if (embed.kind === 'image') return embed.rawUrl;
        return embed.posterUrl ?? '';
    }
}
