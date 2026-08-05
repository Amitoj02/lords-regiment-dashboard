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
import { DEFAULT_REGIMENT_NAME } from '../../../core/seo/seo-copy';
import { MediaEmbed, MediaEmbedService } from '../../../shared/services/media-embed.service';

/** Matches the share shell's own trim, so the two descriptions cannot differ. */
const MAX_DESCRIPTION = 200;

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

    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly gallery = inject(GalleryService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly mediaEmbed = inject(MediaEmbedService);
    private readonly seo = inject(SeoService);
    private readonly document = inject(DOCUMENT);
    private readonly regiment = inject(RegimentService);

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
