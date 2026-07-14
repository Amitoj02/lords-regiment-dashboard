import { Component, Input } from '@angular/core';
import { GalleryItem } from '../../../core/models/gallery.model';

/**
 * Reusable gallery card (T-0077). Renders a single approved gallery item — thumb
 * (with a varied aspect ratio driven by `aspectIndex`), a video/link overlay,
 * title, submitter and like count — and links to the detail page (T-0078) unless
 * `linkToDetail` is disabled. Extracted from the inline public-gallery card so the
 * public archive AND the dashboard "Recent Gallery" strip share one component.
 */
@Component({
    selector: 'hf-gallery-card',
    templateUrl: './gallery-card.component.html',
    styleUrls: ['./gallery-card.component.scss'],
    standalone: false,
})
export class GalleryCardComponent {
    @Input({ required: true }) item!: GalleryItem;
    /** 0..2 — selects one of the three masonry aspect ratios. */
    @Input() aspectIndex = 0;
    /** When true (default) the whole card links to /gallery/:id. */
    @Input() linkToDetail = true;

    get aspectClass(): string {
        return `gallery-card-thumb--ar${((this.aspectIndex % 3) + 3) % 3}`;
    }

    isVideo(item: GalleryItem): boolean {
        return item.type === 'video';
    }

    isLink(item: GalleryItem): boolean {
        return item.type === 'link';
    }
}
