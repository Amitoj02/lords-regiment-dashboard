import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryItem } from '../../../core/models/gallery.model';
import { GalleryService, UpdateGalleryPayload } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';
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
     * `type` is 'article' because that is what the shell emits for everything
     * that is not a playable video, and `SeoService` has no video type to offer
     * for the ones that are — a video item is described as an article here and
     * as `video.other` there, which is the one difference, and it is the shell's
     * tags that reach the unfurler.
     */
    private applySeo(item: GalleryItem): void {
        this.seo.apply({
            title: item.title,
            description: this.describe(item),
            canonicalPath: `/gallery/${item.id}`,
            imageUrl: this.shareImage(item),
            type: 'article',
        });
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
            ? `Shared by ${author} in the Lords Regiment gallery.`
            : 'From the Lords Regiment gallery.';
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
