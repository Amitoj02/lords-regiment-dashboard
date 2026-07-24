import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryItem } from '../../../core/models/gallery.model';
import { GalleryService } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';
import { MediaEmbed, MediaEmbedService } from '../../../shared/services/media-embed.service';

@Component({
    selector: 'app-gallery-mod',
    templateUrl: './gallery-mod.component.html',
    styleUrls: ['./gallery-mod.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class GalleryModComponent implements OnInit {
    activeTab: 'pending' | 'approved' | 'declined' = 'pending';
    items: GalleryItem[] = [];
    selectedId: string | null = null;
    /** Resolved media preview for the selected submission (computed once per selection). */
    selectedEmbed: MediaEmbed | null = null;
    declineReason = '';
    loading = false;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private galleryService: GalleryService,
        private auth: AuthService,
        private media: MediaEmbedService,
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
                    this.select(items[0]?.id ?? null);
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

    /** Select a submission and resolve its media preview once (avoids re-embedding per CD). */
    select(id: string | null): void {
        this.selectedId = id;
        const item = id ? this.items.find((i) => i.id === id) : undefined;
        this.selectedEmbed = item ? this.media.resolve(item.mediaUrl) : null;
    }

    /**
     * A CSS `background` for a grid card thumbnail. Derived from the real media
     * (`mediaUrl`) via MediaEmbedService (T-0146) — an image file or YouTube
     * poster becomes a cover image; video/other links fall back to a stable tint.
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

    private removeFromQueue(id: string): void {
        const idx = this.items.findIndex((i) => i.id === id);
        if (idx === -1) {
            return;
        }
        this.items.splice(idx, 1);
        const nextItem = this.items[idx] ?? this.items[idx - 1];
        this.select(nextItem?.id ?? null);
    }
}
