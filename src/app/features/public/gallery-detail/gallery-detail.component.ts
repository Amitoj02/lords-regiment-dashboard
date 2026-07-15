import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryItem } from '../../../core/models/gallery.model';
import { GalleryService } from '../../../core/services/gallery.service';
import { MediaEmbed, MediaEmbedService } from '../../../shared/services/media-embed.service';

/**
 * Public gallery detail page (T-0078) at /gallery/:id. Reads the id from the
 * route and renders the full item — media, submitter, date, tags, caption — using
 * the existing GalleryService.getById (no new service method needed).
 */
@Component({
    selector: 'hf-gallery-detail',
    templateUrl: './gallery-detail.component.html',
    styleUrls: ['./gallery-detail.component.scss'],
    standalone: false,
})
export class GalleryDetailComponent implements OnInit {
    item: GalleryItem | null = null;
    embed: MediaEmbed | null = null;
    loading = true;
    notFound = false;

    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly gallery = inject(GalleryService);
    private readonly mediaEmbed = inject(MediaEmbedService);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.loading = false;
            this.notFound = true;
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
                },
                error: (err) => {
                    console.error('Failed to load gallery item', err);
                    this.loading = false;
                    this.notFound = true;
                },
            });
    }

    get mediaUrl(): string | null {
        return this.item?.mediaUrl ?? this.item?.thumbnailUrl ?? null;
    }
}
