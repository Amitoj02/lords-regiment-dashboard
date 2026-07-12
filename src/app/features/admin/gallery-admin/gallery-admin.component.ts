import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryItem } from '../../../core/models/gallery.model';
import { GalleryService } from '../../../core/services/gallery.service';

@Component({
    selector: 'app-gallery-admin',
    templateUrl: './gallery-admin.component.html',
    styleUrls: ['./gallery-admin.component.scss'],
    standalone: false,
})
export class GalleryAdminComponent implements OnInit {
    /** The approved archive (public feed). */
    items: GalleryItem[] = [];
    /** Count of submissions still awaiting a moderation decision. */
    pendingCount = 0;

    loading = true;
    loadError = '';

    private readonly destroyRef = inject(DestroyRef);

    constructor(private galleryService: GalleryService) {}

    ngOnInit(): void {
        this.loading = true;
        this.loadError = '';
        this.galleryService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (items) => {
                    this.loading = false;
                    this.items = items.filter((i) => i.status === 'approved');
                },
                error: (err) => {
                    this.loading = false;
                    this.loadError = 'Could not load the gallery archive — please try again.';
                    console.error('Failed to load gallery archive', err);
                },
            });

        this.galleryService
            .moderationQueue()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (queue) => (this.pendingCount = queue.length),
                error: (err) => console.error('Failed to load the moderation queue count', err),
            });
    }

    /** A CSS `background` for a card thumbnail — the uploaded image, or a stable tint. */
    thumb(item: GalleryItem): string {
        if (item.thumbnailUrl) {
            return `center / cover no-repeat url('${item.thumbnailUrl}')`;
        }
        const hue = Array.from(item.id).reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360;
        return `oklch(0.32 0.05 ${hue})`;
    }
}
