import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryItem, GalleryItemType } from '../../../core/models/gallery.model';
import { GalleryService } from '../../../core/services/gallery.service';

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

    allTags: string[] = [];

    private readonly destroyRef = inject(DestroyRef);

    constructor(private galleryService: GalleryService) {}

    ngOnInit(): void {
        this.galleryService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                this.allItems = items.filter((i) => i.status === 'approved');
                const tagSet = new Set<string>();
                this.allItems.forEach((i) => i.tags.forEach((t) => tagSet.add(t)));
                this.allTags = Array.from(tagSet);
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
