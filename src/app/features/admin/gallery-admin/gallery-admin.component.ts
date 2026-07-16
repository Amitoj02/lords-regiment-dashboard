import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryItem } from '../../../core/models/gallery.model';
import { GalleryService } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';
import { MediaEmbedService } from '../../../shared/services/media-embed.service';

@Component({
    selector: 'app-gallery-admin',
    templateUrl: './gallery-admin.component.html',
    styleUrls: ['./gallery-admin.component.scss'],
    standalone: false,
})
export class GalleryAdminComponent implements OnInit {
    /** The approved archive (authenticated member feed). */
    items: GalleryItem[] = [];
    /** Count of submissions still awaiting a moderation decision. */
    pendingCount = 0;

    loading = true;
    loadError = '';

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private galleryService: GalleryService,
        private auth: AuthService,
        private media: MediaEmbedService,
    ) {}

    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    ngOnInit(): void {
        this.loading = true;
        this.loadError = '';
        // Authenticated archive: approved items for the caller's regiment, even
        // when the public gallery is off (T-0086/T-0108).
        this.galleryService
            .getArchive()
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

        // Only moderators fetch the pending count (their queue link).
        if (this.can('moderate_gallery')) {
            this.galleryService
                .moderationQueue()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (queue) => (this.pendingCount = queue.length),
                    error: (err) => console.error('Failed to load the moderation queue count', err),
                });
        }
    }

    /**
     * A CSS `background` for a card thumbnail. Derived from the real media
     * (`mediaUrl`) via MediaEmbedService (T-0146) — an image file or a YouTube
     * poster becomes a cover image; video/other links fall back to a stable tint
     * (a CSS background can't play a clip inline).
     */
    thumb(item: GalleryItem): string {
        const embed = this.media.resolve(item.mediaUrl);
        const imageUrl = embed?.kind === 'image' ? embed.rawUrl : embed?.posterUrl;
        if (imageUrl) {
            return `center / cover no-repeat url('${imageUrl}')`;
        }
        const hue = Array.from(item.id).reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360;
        return `oklch(0.32 0.05 ${hue})`;
    }
}
