import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { RegimentPresentation } from '../../../core/models/api.model';
import { instantToWallClock, viewerZoneLabel } from '../../../core/models/event-time';
import { RegimentEvent } from '../../../core/models/event.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { SeoService } from '../../../core/services/seo.service';
import { MediaEmbedService } from '../../../shared/services/media-embed.service';
import { LANDING_DEFAULTS } from './landing.defaults';

/** A gallery item plus a resolved still-image preview URL for the landing strip. */
type GalleryPreview = GalleryItem & { previewUrl: string };

@Component({
    selector: 'hf-landing',
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
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

    /**
     * The regiment's configured Discord invite (T-0234). Null until the profile
     * lands, and null forever if no invite is configured — the "Join the …
     * Server" CTA is then hidden rather than rendered as a dead link.
     */
    discordInviteUrl: string | null = null;

    /**
     * The regiment's crest and its share-card banner, straight off the profile
     * (T-0293). Both are null until it lands and both stay null when unset —
     * they feed the Organization `logo`/`image` and the card, never the layout,
     * so an absent one must degrade to no claim rather than to a shipped asset
     * the crawler shell has never heard of.
     */
    crestUrl: string | null = null;
    cardBannerUrl: string | null = null;

    /**
     * Admin-authored hero presentation (T-0238), read off the ANONYMOUS regiment
     * profile. Every field is independently nullable and null means "shipped
     * default" — hence `LANDING_DEFAULTS` below and `== null` everywhere. An API
     * that omits `presentation` entirely (older backend, failed request) lands on
     * exactly the same defaults, so the hero is never blank.
     */
    heroBannerUrl: string = LANDING_DEFAULTS.heroBannerUrl;
    charterQuote: string = LANDING_DEFAULTS.charterQuote;
    charterQuoteAttribution: string = LANDING_DEFAULTS.charterQuoteAttribution;
    /**
     * Scrim alpha (0–1) handed to the SCSS as `--hero-scrim`. The shipped
     * gradient's stops are expressed relative to this value, so the default
     * reproduces the shipped hero exactly and `0` really is no scrim at all.
     */
    heroScrim: number = LANDING_DEFAULTS.heroOverlayDensity / 100;

    // Hero stats, gated by the Regiment-statistics visibility toggle.
    // getStats() → 403 (visibility off) hides the whole block.
    statsVisible = false;
    establishedLabel: string | null = null; // 'MM / YYYY'
    memberCount = 0;

    private readonly auth = inject(AuthService);
    private readonly media = inject(MediaEmbedService);
    private readonly seo = inject(SeoService);
    private readonly document = inject(DOCUMENT);

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
     * Hero CTA label, following the session — and it has to agree with where
     * `applyToJoin()` actually sends the click (T-0287).
     *
     * It used to read "Go to Dashboard" for every member. That was true when
     * every member had a dashboard; now `/app` is staff-only, so for an ordinary
     * member it promised a place staffGuard would bounce them out of, and the
     * click had already been re-pointed at their profile. A button whose label
     * and destination disagree is worse than either being wrong on its own.
     */
    get applyLabel(): string {
        if (!this.auth.isAuthenticated()) return 'Apply to Join';
        if (!this.auth.isMember()) return 'View Application';
        return this.auth.isStaff() ? 'Go to Dashboard' : 'View My Profile';
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

        // Hero title + description from the live regiment profile, plus the
        // Discord invite behind the sidebar CTA.
        this.regiment
            .getProfile()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((profile) => {
                if (profile?.name) this.regimentName = profile.name;
                if (profile?.missionStatement) this.missionStatement = profile.missionStatement;
                this.discordInviteUrl = profile?.discordInviteUrl?.trim() || null;
                this.crestUrl = profile?.crestUrl?.trim() || null;
                this.cardBannerUrl =
                    profile?.presentation?.heroBannerUrl?.trim() ||
                    profile?.bannerUrl?.trim() ||
                    null;
                this.applyPresentation(profile?.presentation);
                this.applySeo();
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

        // Tags for the fallback copy first: if the profile request never lands,
        // the home page still describes itself rather than inheriting whatever
        // the previous route set.
        this.applySeo();
    }

    /**
     * Home is the site's root entity, so it is where the Organization and WebSite
     * nodes for the whole domain belong — the pages that hang off it (profiles,
     * gallery items) describe themselves and let this one describe the regiment.
     *
     * Re-applied once the profile lands because the regiment's real name and
     * mission are what belong in those nodes, not the shipped placeholder.
     * `canonicalPath` is '/home' on both `/` and `/home`, which is the only thing
     * stopping the two routes competing to be indexed as separate pages.
     */
    private applySeo(): void {
        const origin = this.document.location?.origin;
        this.seo.apply({
            title: this.regimentName,
            description: this.missionStatement,
            canonicalPath: '/home',
            // `cardBannerUrl`, NOT `heroBannerUrl`: the latter falls back to a
            // shipped background the API's `renderHome` knows nothing about, so
            // using it here would make the two documents advertise different
            // pictures for the same URL. Null falls through to the site banner
            // in `SeoService`, which is the shell's fallback too. Until T-0293
            // this page passed no image at all and `apply()` REMOVED the static
            // default from index.html — so a cold share of the site's own front
            // door unfurled with no picture whatsoever.
            imageUrl: this.cardBannerUrl
                ? { url: this.cardBannerUrl, alt: this.regimentName }
                : null,
            jsonLd: [
                {
                    '@context': 'https://schema.org',
                    '@type': 'Organization',
                    // ── THE NODE EVERY PROFILE POINTS AT (T-0297) ────────────
                    // A profile's `memberOf` is now `{"@id": "<origin>/#organization"}`,
                    // and this is the only place that id is DEFINED. Without it
                    // the reference dangles — a consumer reading a profile finds
                    // an id with no node behind it, which is worse than the
                    // inline copy it replaced. Built from `origin` exactly as the
                    // API's `organizationId()` builds it from `siteUrl()`, so the
                    // two strings match character for character.
                    '@id': `${origin}/#organization`,
                    name: this.regimentName,
                    description: this.missionStatement,
                    url: origin || undefined,
                    ...(this.crestUrl ? { logo: this.crestUrl } : {}),
                    ...(this.cardBannerUrl ? { image: this.cardBannerUrl } : {}),
                    sameAs: this.discordInviteUrl ? [this.discordInviteUrl] : undefined,
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: this.regimentName,
                    url: origin || undefined,
                },
            ],
        });
    }

    /**
     * Fold the admin's presentation over the shipped defaults.
     *
     * Every branch is `== null`, never truthiness: an empty quote and a `0`
     * overlay density are both legitimate configured values, and treating either
     * as "unset" would silently reinstate copy the admin deliberately removed.
     */
    private applyPresentation(presentation: RegimentPresentation | undefined): void {
        if (!presentation) {
            return;
        }
        this.heroBannerUrl = presentation.heroBannerUrl ?? LANDING_DEFAULTS.heroBannerUrl;
        this.charterQuote = presentation.charterQuote ?? LANDING_DEFAULTS.charterQuote;
        // The attribution belongs to ITS quote: once the quote is custom, an empty
        // attribution means "no attribution", so the line is dropped rather than
        // borrowing the shipped charter's author or printing a bare dash.
        this.charterQuoteAttribution =
            presentation.charterQuoteAttribution ??
            (presentation.charterQuote == null ? LANDING_DEFAULTS.charterQuoteAttribution : '');
        this.heroScrim =
            (presentation.heroOverlayDensity ?? LANDING_DEFAULTS.heroOverlayDensity) / 100;
    }

    // ── Event rows (T-0236 / T-0237) ─────────────────────────────────────────
    /**
     * The event's start–end window in the VIEWER's own zone.
     *
     * The old template printed `startTime – endTime` sliced straight off the
     * stored UTC instant while labelling it with the event's authored timezone —
     * so a 20:00 CEST muster read "18:00 Berlin". `instantToWallClock` with no
     * zone converts to wherever the reader actually is, and the label says so.
     */
    eventTimeRange(event: RegimentEvent): string {
        if (!event.startsAt) {
            // `startsAt` is optional on the model, so a projection without it
            // prints the already-converted wall clock rather than nothing —
            // better a row without a zone label than an empty one.
            return event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime;
        }
        const start = instantToWallClock(event.startsAt);
        const end = event.endsAt ? instantToWallClock(event.endsAt) : null;
        if (!start) {
            return '';
        }
        const zone = viewerZoneLabel(event.startsAt);
        const window = end ? `${start.time} – ${end.time}` : start.time;
        return zone ? `${window} ${zone}` : window;
    }

    /**
     * Whether to render the Server field at all. `hasServerName` is a presence
     * flag carried by every projection, public included, so an anonymous visitor
     * can tell a bound event from an unbound one without seeing the binding.
     * Falls back to the (redacted) name only while that flag is unavailable.
     */
    showsServer(event: RegimentEvent): boolean {
        return event.hasServerName ?? !!event.serverName?.trim();
    }

    /**
     * 'YYYY-MM-DD' → 'MM / YYYY' (timezone-safe: no Date parsing). Spaced, because
     * the hero sets this at 34px in the display serif, where an unspaced slash
     * runs into the digits either side of it.
     */
    private formatEstablished(dateStr: string | null): string | null {
        if (!dateStr) return null;
        const [year, month] = dateStr.split('-');
        return year && month ? `${month} / ${year}` : null;
    }

    /** A still-image URL for a gallery item (image → itself, YouTube → poster; else ''). */
    private previewUrl(url: string | undefined): string {
        const embed = this.media.resolve(url);
        if (!embed) return '';
        if (embed.kind === 'image') return embed.rawUrl;
        return embed.posterUrl ?? '';
    }
}
