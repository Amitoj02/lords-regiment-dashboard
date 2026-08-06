import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { GalleryItem } from '../../../core/models/gallery.model';
import { GalleryService, UpdateGalleryPayload } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { SeoService, SeoVideo } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { DEFAULT_REGIMENT_NAME } from '../../../core/seo/seo-copy';
import { MediaEmbed, MediaEmbedService } from '../../../shared/services/media-embed.service';
import { formatCount } from '../../../shared/utils/format-count';

/** Matches the share shell's own trim, so the two descriptions cannot differ. */
const MAX_DESCRIPTION = 200;

/**
 * The like animation runs off a pair of identical keyframe names that alternate
 * on each tap (see `likeTick`). Angular re-rendering an element with the SAME
 * `animation-name` does not restart it, so a fast double-tap would play once and
 * look broken; swapping the name is what makes every tap land.
 */
const POP_KEYFRAMES = ['hfLikePopA', 'hfLikePopB'] as const;
const BURST_KEYFRAMES = ['hfLikeBurstA', 'hfLikeBurstB'] as const;
const RING_KEYFRAMES = ['hfLikeRingA', 'hfLikeRingB'] as const;
const ROLL_KEYFRAMES = ['hfLikeRollA', 'hfLikeRollB'] as const;

/** Six pips, evenly spaced, thrown outward when a like lands. */
const BURST_PIPS = [0, 60, 120, 180, 240, 300];

/**
 * Public gallery detail page (T-0078) at /gallery/:id. Reads the id from the
 * route and renders the full item — media, submitter, date, tags, caption — using
 * the existing GalleryService.getById (no new service method needed). Moderators
 * additionally get an inline edit (caption + tags) / delete panel (T-0183).
 */
@Component({
    selector: 'hf-gallery-detail',
    templateUrl: './gallery-detail.component.html',
    styleUrls: ['./gallery-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class GalleryDetailComponent implements OnInit {
    item: GalleryItem | null = null;
    embed: MediaEmbed | null = null;
    loading = true;
    notFound = false;

    // Moderator edit state (T-0183). The media itself is never editable here.
    editing = false;
    editTitle = '';
    editCaption = '';
    editTags: string[] = [];
    tagInput = '';
    readonly maxTags = 10;
    saving = false;
    deleting = false;

    // ── Likes + views (T-0311) ──────────────────────────────────────────────
    /** Live likes count; seeded from the item, then owned by the toggle. */
    likes = 0;
    /** Live views count; seeded from the item, then replaced by the recorded total. */
    views = 0;
    /**
     * Whether the signed-in caller has liked this. Resolved by a second request
     * because `GET /gallery/:id` is public and carries no `liked` — see
     * `GalleryService.likeState`. Stays false for a signed-out reader, who has
     * no button anyway.
     */
    liked = false;
    /** A like/unlike request is in flight; the button refuses a second one. */
    likePending = false;
    /**
     * Taps so far. Zero means "never touched", which is how the button knows to
     * render with no animation at all on first paint; after that its parity
     * picks which of the two identical keyframe sets to use so a repeat tap
     * restarts the animation instead of being ignored.
     */
    likeTick = 0;
    readonly burstPips = BURST_PIPS;

    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly gallery = inject(GalleryService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly mediaEmbed = inject(MediaEmbedService);
    private readonly seo = inject(SeoService);
    private readonly document = inject(DOCUMENT);
    private readonly regiment = inject(RegimentService);
    private readonly toast = inject(ToastService);

    /**
     * The live regiment name (T-0293). It is in the description's author
     * fallback and in the JSON-LD credit, and the shell builds both from the
     * editable field — a hardcoded "Lords Regiment" here would have disagreed
     * with it after any rename.
     */
    private regimentName = DEFAULT_REGIMENT_NAME;

    /** Capability gate for the moderator edit/delete panel (T-0183). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    /** The signed-in member is the post's author (T-0191). */
    get isAuthor(): boolean {
        return (
            !!this.item &&
            this.auth.isAuthenticated() &&
            this.auth.currentUser()?.id === this.item.submittedByMemberId
        );
    }

    /** Editing details (title/caption/tags) requires the moderate_gallery capability (T-0191). */
    get canEditDetails(): boolean {
        return this.can('moderate_gallery');
    }

    /** Moderators may delete any post; the author may delete their own (T-0191). */
    get canDelete(): boolean {
        return this.canEditDetails || this.isAuthor;
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.loading = false;
            this.notFound = true;
            this.applyMissingSeo();
            return;
        }

        // Navigation-independent; folded into the metadata whenever it lands.
        this.regiment
            .getProfile()
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((profile) => {
                this.regimentName = profile?.name?.trim() || DEFAULT_REGIMENT_NAME;
                if (this.item) this.applySeo(this.item);
            });

        this.gallery
            .getById(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (item) => {
                    this.item = item;
                    this.embed = this.mediaEmbed.resolve(item.mediaUrl ?? item.thumbnailUrl);
                    this.loading = false;
                    this.applySeo(item);
                    this.likes = item.likes;
                    this.views = item.views;
                    this.resolveLikeState(item.id);
                    this.countView(item.id);
                },
                error: (err) => {
                    console.error('Failed to load gallery item', err);
                    this.loading = false;
                    this.notFound = true;
                    this.applyMissingSeo();
                },
            });
    }

    /**
     * The client-side half of this item's card.
     *
     * ── IT HAS TO MATCH THE SERVER'S ────────────────────────────────────────
     * Unfurlers and crawlers are rewritten to `/api/seo/gallery/:id`, whose
     * shell (`GalleryShareService`) is the tags that actually get read. Googlebot
     * then renders this page on a second pass and compares — a document that
     * disagreed with the shell it was served reads as cloaking. So the title,
     * the description's caption-then-author fallback, its 200-character trim and
     * the image choice below are all deliberately the same rules, in the same
     * order, as `GalleryShareService.cardFor`/`describe`.
     *
     * The last divergence between the two closed in T-0293: `SeoTags` had no
     * video member, so a playable dispatch called itself an `article` here and
     * `video.other` in the shell. Both now emit the same `og:type`, the same
     * `og:video` set and the same `VideoObject`/`ImageObject` payload.
     */
    private applySeo(item: GalleryItem): void {
        const video = this.shareVideo(item);
        this.seo.apply({
            title: item.title,
            description: this.describe(item),
            canonicalPath: `/gallery/${item.id}`,
            imageUrl: this.shareImage(item),
            video,
            type: video ? 'video.other' : 'article',
            jsonLd: this.itemJsonLd(item, video),
        });
    }

    /**
     * The playable clip, when this dispatch is one (T-0293).
     *
     * Only a DIRECT file — an uploaded `.mp4`/`.webm` that Discord can play from
     * the URL. A YouTube or Medal.tv link resolves to an iframe page instead,
     * and claiming `og:video` of an embed URL from a domain no unfurler has
     * allowlisted produces a card that shows nothing rather than a poster.
     */
    private shareVideo(item: GalleryItem): SeoVideo | null {
        if (this.embed?.kind !== 'video' || !this.embed.rawUrl) return null;
        return {
            url: this.embed.rawUrl,
            type: this.embed.rawUrl.toLowerCase().split('?')[0].endsWith('.webm')
                ? 'video/webm'
                : 'video/mp4',
            // The shell clamps these for Discord (halving anything over 1920);
            // `SeoService` applies the identical rule, so the raw stored size is
            // what both sides are handed.
            width: item.mediaWidth,
            height: item.mediaHeight,
        };
    }

    /**
     * `VideoObject` / `ImageObject` for the dispatch, mirroring
     * `GalleryShareService.jsonLdFor`.
     *
     * A `VideoObject` is only claimed when there is a poster AND an upload date,
     * because Google treats both as required and an incomplete one is a
     * structured-data ERROR rather than a partial win. `ImageObject` needs
     * `contentUrl` plus at least one of creator/creditText/copyrightNotice —
     * hence the credit line even on an item with no named author.
     */
    private itemJsonLd(item: GalleryItem, video: SeoVideo | null): unknown {
        const image = this.shareImage(item);
        const author = item.submittedBy?.trim();
        const common = {
            '@context': 'https://schema.org',
            name: item.title,
            description: this.describe(item),
            url: this.absolute(`/gallery/${item.id}`),
            datePublished: item.approvedAt ?? item.submittedAt,
            ...(author
                ? {
                      author: { '@type': 'Person', name: author },
                      creator: { '@type': 'Person', name: author },
                      creditText: `${author} · ${this.regimentName}`,
                  }
                : { creditText: this.regimentName }),
            copyrightNotice: `© ${this.regimentName}`,
            ...(item.tags.length ? { keywords: item.tags.join(', ') } : {}),
        };

        if (video && image) {
            return {
                ...common,
                '@type': 'VideoObject',
                thumbnailUrl: image,
                uploadDate: item.approvedAt ?? item.submittedAt,
                contentUrl: video.url,
            };
        }
        if (image) {
            return { ...common, '@type': 'ImageObject', contentUrl: image, thumbnailUrl: image };
        }
        return { ...common, '@type': 'CreativeWork' };
    }

    private absolute(path: string): string {
        const origin = this.document.location?.origin ?? '';
        return `${origin}${path}`;
    }

    /** A dispatch that did not resolve is not a page worth indexing. */
    private applyMissingSeo(): void {
        this.seo.apply({
            title: 'Dispatch not found',
            description: 'This gallery dispatch is no longer available.',
            noIndex: true,
        });
    }

    private describe(item: GalleryItem): string {
        const base = this.baseDescription(item);
        // An unrecognised external link: the shell names the origin it points at,
        // because a card that says where a link goes beats one that says nothing.
        // Recognised providers get a poster instead and are left alone here —
        // the same split as `GalleryShareService.linkCard`.
        if (item.type === 'link' && this.embed?.kind === 'link') {
            const origin = this.originOf(this.embed.rawUrl);
            if (origin) {
                return `${base} — ${origin}`.slice(0, 300);
            }
        }
        return base;
    }

    /** Caption first, then the author line, then a bare site line. */
    private baseDescription(item: GalleryItem): string {
        const caption = item.caption?.trim();
        if (caption) {
            return caption.length > MAX_DESCRIPTION
                ? `${caption.slice(0, MAX_DESCRIPTION - 1)}…`
                : caption;
        }
        const author = item.submittedBy?.trim();
        return author
            ? `Shared by ${author} in the ${this.regimentName} gallery.`
            : `From the ${this.regimentName} gallery.`;
    }

    /** The link's origin, or null when it is not a parseable absolute URL. */
    private originOf(url: string): string | null {
        try {
            return new URL(url).origin;
        } catch {
            return null;
        }
    }

    /**
     * The still the card shows: an uploaded image is its own preview, a YouTube
     * or Medal.tv link resolves to the provider's poster (the same computed URLs
     * the shell uses), and everything else — an uploaded video above all — falls
     * back to the stored thumbnail.
     */
    private shareImage(item: GalleryItem): string | null {
        if (this.embed?.kind === 'image') {
            return this.embed.rawUrl;
        }
        return this.embed?.posterUrl || item.thumbnailUrl || null;
    }

    get mediaUrl(): string | null {
        return this.item?.mediaUrl ?? this.item?.thumbnailUrl ?? null;
    }

    /**
     * The clip URL with a `#t=` media fragment appended, so the hero shows a
     * frame rather than a black rectangle before it is played.
     *
     * Same WebKit behaviour as the gallery grid (see `videoPreviewSrc` on
     * GalleryCardComponent): iOS Safari and iOS Chrome paint nothing for a clip
     * until they are asked for a specific time. 0.1s rather than 0, because
     * plenty of encodes open on a black frame.
     */
    get videoSrc(): string | null {
        const raw = this.embed?.kind === 'video' ? this.embed.rawUrl : null;
        if (!raw) {
            return null;
        }
        return raw.includes('#') ? raw : `${raw}#t=0.1`;
    }

    // ── Likes + views (T-0311) ──────────────────────────────────────────────

    /**
     * Only a signed-in member gets the button. A signed-out reader sees the same
     * two figures rendered as plain chips — the counts are public, the act is not.
     * This is UX, not enforcement: the API rejects an unauthenticated like too.
     */
    get canLike(): boolean {
        return this.auth.isAuthenticated();
    }

    /** `Like` while the count is zero, then the figure itself. */
    get likesLabel(): string {
        return this.likes > 0 ? formatCount(this.likes) : 'Like';
    }

    get viewsLabel(): string {
        return formatCount(this.views);
    }

    get viewsNoun(): string {
        return this.views === 1 ? 'view' : 'views';
    }

    get likesNoun(): string {
        return this.likes === 1 ? 'like' : 'likes';
    }

    get likeAriaLabel(): string {
        return this.liked ? 'Unlike this dispatch' : 'Like this dispatch';
    }

    /** Which half of each keyframe pair this tap uses — see POP_KEYFRAMES. */
    private get animationPhase(): 0 | 1 {
        return (this.likeTick % 2) as 0 | 1;
    }

    /** The heart's squash-and-stretch. `none` until the reader has tapped once. */
    get popAnimation(): string {
        if (this.likeTick === 0) return 'none';
        return `${POP_KEYFRAMES[this.animationPhase]} .44s cubic-bezier(.34,1.56,.64,1)`;
    }

    /** Pips + ring fire only when a tap ADDS a like, never when it removes one. */
    get burstAnimation(): string {
        if (this.likeTick === 0 || !this.liked) return 'none';
        return `${BURST_KEYFRAMES[this.animationPhase]} .62s ease-out`;
    }

    get ringAnimation(): string {
        if (this.burstAnimation === 'none') return 'none';
        return `${RING_KEYFRAMES[this.animationPhase]} .6s ease-out`;
    }

    /** The figure rolls up as it changes, so the number reads as having moved. */
    get rollAnimation(): string {
        if (this.likeTick === 0) return 'none';
        return `${ROLL_KEYFRAMES[this.animationPhase]} .34s ease-out`;
    }

    /**
     * Toggle the caller's like.
     *
     * Optimistic: the heart fills and the figure moves on the tap, then the
     * server's authoritative count replaces the guess. A tap is a 34px target on
     * a page the reader is already looking at — waiting a round trip to
     * acknowledge it is the thing that makes a like button feel broken. On
     * failure the optimistic state is rolled back and a toast says so, rather
     * than leaving a filled heart that the next reload will contradict.
     */
    toggleLike(): void {
        if (!this.item || this.likePending || !this.canLike) {
            return;
        }
        const id = this.item.id;
        const wasLiked = this.liked;
        const previousLikes = this.likes;

        this.liked = !wasLiked;
        this.likes = Math.max(0, previousLikes + (wasLiked ? -1 : 1));
        this.likeTick += 1;
        this.likePending = true;

        const request = wasLiked ? this.gallery.unlike(id) : this.gallery.like(id);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (state) => {
                // The server's count wins: another member may have liked this
                // between the page load and the tap.
                this.likes = state.likesCount;
                this.liked = state.liked;
                this.likePending = false;
            },
            error: (err: unknown) => {
                this.liked = wasLiked;
                this.likes = previousLikes;
                this.likePending = false;
                console.error('Failed to update the like', err);
                this.toast.error(
                    wasLiked ? 'Could not remove your like.' : 'Could not record your like.',
                );
            },
        });
    }

    /**
     * Ask the API whether this caller has already liked the dispatch.
     *
     * Skipped entirely when signed out: the endpoint is authenticated by design
     * (whether a given person liked something is not public), so calling it
     * anonymously would be a guaranteed 401 in the console on every public page
     * view. A failure here is silent — the heart simply renders hollow, which is
     * what it would have done without this call at all.
     */
    private resolveLikeState(id: string): void {
        if (!this.canLike) {
            return;
        }
        this.gallery
            .likeState(id)
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((state) => {
                if (state) {
                    this.liked = state.liked;
                    this.likes = state.likesCount;
                }
            });
    }

    /**
     * Record this visit. Fire-and-forget, and failure is invisible on purpose —
     * a view counter that could interrupt reading a page would be worse than one
     * that occasionally misses. The server dedupes by address, so a reader who
     * has been here before simply does not move the number.
     */
    private countView(id: string): void {
        this.gallery
            .recordView(id)
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((state) => {
                if (state) {
                    this.views = state.viewsCount;
                }
            });
    }

    /** Whether the tag input has hit the 10-tag cap. */
    get tagsAtLimit(): boolean {
        return this.editTags.length >= this.maxTags;
    }

    /** Enter edit mode, seeding the form from the current item. */
    startEdit(): void {
        if (!this.item) {
            return;
        }
        this.editTitle = this.item.title;
        this.editCaption = this.item.caption ?? '';
        this.editTags = [...this.item.tags];
        this.tagInput = '';
        this.editing = true;
    }

    cancelEdit(): void {
        this.editing = false;
        this.tagInput = '';
    }

    addTag(value?: string): void {
        const t = (value ?? this.tagInput).trim().toLowerCase();
        if (t && !this.editTags.includes(t) && !this.tagsAtLimit) {
            this.editTags.push(t);
        }
        this.tagInput = '';
    }

    removeTag(t: string): void {
        this.editTags = this.editTags.filter((tag) => tag !== t);
    }

    /** Persist the caption/tags edit (PATCH /gallery/:id). */
    save(): void {
        if (!this.item || this.saving) {
            return;
        }
        const title = this.editTitle.trim();
        if (!title) {
            // Title is required (backend column is NOT NULL) — refuse an empty save.
            return;
        }
        this.saving = true;
        const payload: UpdateGalleryPayload = {
            title,
            caption: this.editCaption.trim() || undefined,
            tags: [...this.editTags],
        };
        this.gallery
            .update(this.item.id, payload)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (updated) => {
                    this.item = updated;
                    this.editing = false;
                    this.saving = false;
                    // The title and caption ARE the card, so a moderator's edit
                    // has to move the document's tags with it.
                    this.applySeo(updated);
                },
                error: (err) => {
                    console.error('Failed to update gallery item', err);
                    this.saving = false;
                },
            });
    }

    /** Delete the item + its stored media, then return to the gallery (T-0183). */
    deleteItem(): void {
        if (
            !this.item ||
            this.deleting ||
            !confirm(
                'Delete this dispatch permanently? This also removes the stored media and cannot be undone.',
            )
        ) {
            return;
        }
        this.deleting = true;
        this.gallery
            .delete(this.item.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.router.navigateByUrl('/gallery');
                },
                error: (err) => {
                    console.error('Failed to delete gallery item', err);
                    this.deleting = false;
                },
            });
    }
}
