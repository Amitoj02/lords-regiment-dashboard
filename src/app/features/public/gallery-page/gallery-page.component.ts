import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryItem, GalleryItemType } from '../../../core/models/gallery.model';
import { GalleryService } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'hf-gallery-page',
    templateUrl: './gallery-page.component.html',
    styleUrls: ['./gallery-page.component.scss'],
    standalone: false,
})
export class GalleryPageComponent implements OnInit {
    allItems: GalleryItem[] = [];
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
        this.galleryService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                this.allItems = items.filter((i) => i.status === 'approved');
                // Rank tags by how often they appear across approved items, with an
                // alphabetical tiebreak so ties are stable (T-0176).
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
            });
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
