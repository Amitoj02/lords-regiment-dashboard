import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryItem } from '../../../core/models/gallery.model';
import { GalleryService } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-gallery-mod',
    templateUrl: './gallery-mod.component.html',
    styleUrls: ['./gallery-mod.component.scss'],
    standalone: false,
})
export class GalleryModComponent implements OnInit {
    activeTab: 'pending' | 'approved' | 'declined' = 'pending';
    items: GalleryItem[] = [];
    selectedId: string | null = null;
    declineReason = '';
    loading = false;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private galleryService: GalleryService,
        private auth: AuthService,
    ) {}

    /** Capability gate for a template action (see the spec's capability keys). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    ngOnInit(): void {
        this.load();
    }

    /** Switch tabs and refetch that bucket from the backend (T-0115). */
    setTab(tab: 'pending' | 'approved' | 'declined'): void {
        if (this.activeTab === tab) {
            return;
        }
        this.activeTab = tab;
        this.declineReason = '';
        this.load();
    }

    private load(): void {
        this.loading = true;
        this.galleryService
            .moderationQueue(this.activeTab)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (items) => {
                    this.items = items;
                    this.selectedId = items[0]?.id ?? null;
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Failed to load the moderation queue', err);
                    this.loading = false;
                },
            });
    }

    get selected(): GalleryItem | undefined {
        return this.items.find((i) => i.id === this.selectedId);
    }

    /** A CSS `background` for a card thumbnail — the uploaded image, or a stable tint. */
    thumb(item: GalleryItem): string {
        if (item.thumbnailUrl) {
            return `center / cover no-repeat url('${item.thumbnailUrl}')`;
        }
        const hue = Array.from(item.id).reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360;
        return `oklch(0.32 0.05 ${hue})`;
    }

    approve(id: string): void {
        this.galleryService
            .approve(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.removeFromQueue(id),
                error: (err) => console.error('Failed to approve submission', err),
            });
    }

    decline(id: string): void {
        this.galleryService
            .decline(id, this.declineReason || undefined)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.declineReason = '';
                    this.removeFromQueue(id);
                },
                error: (err) => console.error('Failed to decline submission', err),
            });
    }

    remove(id: string): void {
        this.galleryService
            .delete(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.removeFromQueue(id),
                error: (err) => console.error('Failed to delete submission', err),
            });
    }

    skip(): void {
        const idx = this.items.findIndex((i) => i.id === this.selectedId);
        if (idx > -1 && idx < this.items.length - 1) {
            this.selectedId = this.items[idx + 1].id;
        }
    }

    private removeFromQueue(id: string): void {
        const idx = this.items.findIndex((i) => i.id === id);
        if (idx === -1) {
            return;
        }
        this.items.splice(idx, 1);
        const nextItem = this.items[idx] ?? this.items[idx - 1];
        this.selectedId = nextItem?.id ?? null;
    }
}
