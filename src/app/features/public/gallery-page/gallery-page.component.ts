import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { GalleryItem, GalleryItemType } from '../../../core/models/gallery.model';
import { GalleryService } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { SeoService } from '../../../core/services/seo.service';
import { DEFAULT_REGIMENT_NAME, galleryDescription } from '../../../core/seo/seo-copy';
import { MediaEmbedService } from '../../../shared/services/media-embed.service';

@Component({
    selector: 'hf-gallery-page',
    templateUrl: './gallery-page.component.html',
    styleUrls: ['./gallery-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class GalleryPageComponent implements OnInit {
    allItems: GalleryItem[] = [];
    /** In flight. The page had ONE non-grid state, so a pending fetch, an empty
     *  archive and a failed request all showed "No items match the selected
     *  filter" — to a reader who had touched no filter. */
    loading = true;
    loadFailed = false;
    filteredItems: GalleryItem[] = [];
    activeTab: 'all' | GalleryItemType = 'all';
    activeTag: string | null = null;

    tabs: { key: 'all' | GalleryItemType; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'image', label: 'Images' },
        { key: 'video', label: 'Videos' },
        { key: 'link', label: 'Links' },
    ];

    /** Every tag across approved items, ranked most-used first (T-0176). */
    allTags: string[] = [];
    /** Whether the tag bar is expanded to reveal the overflow tags (T-0177). */
    tagsExpanded = false;
    /** How many of the ranked tags stay inline before the More/Less expander. */
    readonly topTagCount = 5;

    private readonly destroyRef = inject(DestroyRef);
    private readonly seo = inject(SeoService);
    private readonly document = inject(DOCUMENT);
    private readonly regiment = inject(RegimentService);
    private readonly mediaEmbed = inject(MediaEmbedService);

    /** The live regiment name — the crawler shell builds the same sentence. */
    private regimentName = DEFAULT_REGIMENT_NAME;

    constructor(
        private galleryService: GalleryService,
        private auth: AuthService,
    ) {}

    /** A member with submit rights gets a direct Submit entry (T-0114). */
    get canSubmit(): boolean {
        return this.auth.isAuthenticated() && this.auth.hasCapability('submit_to_gallery');
    }

    /** The top-N most-used tags shown inline before the expander (T-0176). */
    get topTags(): string[] {
        return this.allTags.slice(0, this.topTagCount);
    }

    /** True once there are more tags than fit inline, so the More/Less chip shows. */
    get hasOverflowTags(): boolean {
        return this.allTags.length > this.topTagCount;
    }

    /**
     * The tags revealed inside the expandable region. While collapsed, the active
     * tag is dropped from here because visibleTags surfaces it inline — this avoids
     * rendering the same active chip twice (T-0176/T-0177).
     */
    get overflowTags(): string[] {
        const tail = this.allTags.slice(this.topTagCount);
        if (!this.tagsExpanded && this.activeTag) {
            return tail.filter((t) => t !== this.activeTag);
        }
        return tail;
    }

    /**
     * The always-visible inline tags: the top-N, plus the active tag appended when
     * it lives beyond the top-N and the bar is collapsed — so the current filter is
     * never hidden behind "More" (T-0176).
     */
    get visibleTags(): string[] {
        if (
            !this.tagsExpanded &&
            this.activeTag &&
            !this.topTags.includes(this.activeTag) &&
            this.allTags.includes(this.activeTag)
        ) {
            return [...this.topTags, this.activeTag];
        }
        return this.topTags;
    }

    toggleTags(): void {
        this.tagsExpanded = !this.tagsExpanded;
    }

    ngOnInit(): void {
        // Applied before the fetch, not only after it: a crawler whose request
        // for the items fails should still get a described page rather than
        // whatever the previous route left in the document.
        this.applySeo();
        this.regiment
            .getProfile()
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((profile) => {
                this.regimentName = profile?.name?.trim() || DEFAULT_REGIMENT_NAME;
                this.applySeo();
            });

        this.load();
    }

    /**
     * The archive's own card (T-0293).
     *
     * It used to be applied once in `ngOnInit` and never again, with no image
     * and no structured data — an image archive whose share link had no picture
     * and whose contents were invisible to a crawler. The newest dispatch with a
     * usable still is now the card, and the list is an `ImageGallery`, matching
     * `GalleryShareService.renderIndex` in the API.
     */
    private applySeo(): void {
        this.seo.apply({
            title: 'Gallery',
            description: galleryDescription(this.regimentName, this.allItems.length),
            canonicalPath: '/gallery',
            imageUrl: this.cardImage(),
            jsonLd: this.galleryJsonLd(),
        });
    }

    /** The newest approved item that resolves to a still, if there is one. */
    private cardImage(): string | null {
        for (const item of this.allItems) {
            const preview = this.mediaEmbed.resolve(item.mediaUrl ?? item.thumbnailUrl);
            const url = preview?.kind === 'image' ? preview.rawUrl : preview?.posterUrl;
            if (url) return url;
        }
        return null;
    }

    private galleryJsonLd(): unknown {
        if (this.allItems.length === 0) return null;
        const origin = this.document.location?.origin ?? '';
        return {
            '@context': 'https://schema.org',
            '@type': 'ImageGallery',
            name: `${this.regimentName} gallery`,
            url: `${origin}/gallery`,
            numberOfItems: this.allItems.length,
            mainEntity: {
                '@type': 'ItemList',
                itemListElement: this.allItems.map((item, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    url: `${origin}/gallery/${item.id}`,
                    name: item.title,
                })),
            },
        };
    }

    /** Fetch (or re-fetch, from the error state's retry) the public archive. */
    load(): void {
        this.loading = true;
        this.loadFailed = false;
        this.galleryService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (items) => {
                    this.loading = false;
                    this.allItems = items.filter((i) => i.status === 'approved');
                    // Rank tags by how often they appear across approved items, with
                    // an alphabetical tiebreak so ties are stable (T-0176).
                    const counts = new Map<string, number>();
                    this.allItems.forEach((i) =>
                        i.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)),
                    );
                    this.allTags = Array.from(counts.keys()).sort((a, b) => {
                        const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
                        return diff !== 0 ? diff : a.localeCompare(b);
                    });
                    this.tagsExpanded = false;
                    this.applyFilter();
                    // Re-applied now there is an archive to describe: the count
                    // is in the description, the newest still is the card and
                    // the ItemList names what actually loaded.
                    this.applySeo();
                },
                error: (err: unknown) => {
                    this.loading = false;
                    this.loadFailed = true;
                    console.error('Failed to load the gallery', err);
                },
            });
    }

    /** True when a tab or tag is narrowing the archive. */
    get hasActiveFilter(): boolean {
        return this.activeTab !== 'all' || !!this.activeTag;
    }

    setTab(tab: 'all' | GalleryItemType): void {
        this.activeTab = tab;
        this.applyFilter();
    }

    setTag(tag: string | null): void {
        this.activeTag = tag;
        this.applyFilter();
    }

    applyFilter(): void {
        let items = this.allItems;
        if (this.activeTab !== 'all') {
            items = items.filter((i) => i.type === this.activeTab);
        }
        if (this.activeTag) {
            const tag = this.activeTag;
            items = items.filter((i) => i.tags.includes(tag));
        }
        this.filteredItems = items;
    }

    isVideo(item: GalleryItem): boolean {
        return item.type === 'video';
    }

    isLink(item: GalleryItem): boolean {
        return item.type === 'link';
    }
}
