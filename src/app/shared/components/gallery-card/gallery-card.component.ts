import { Component, Input, inject } from '@angular/core';
import { GalleryItem } from '../../../core/models/gallery.model';
import { MediaEmbed, MediaEmbedService } from '../../services/media-embed.service';

/**
 * Reusable gallery card (T-0077). Renders a single approved gallery item — a
 * media preview (with a varied aspect ratio driven by `aspectIndex`), a
 * video/link overlay, title and submitter — and links to the detail page
 * (T-0078) unless `linkToDetail` is disabled. Extracted from the inline
 * public-gallery card so the public archive AND the dashboard "Recent Gallery"
 * strip share one component.
 *
 * The preview is derived from `item.mediaUrl` via MediaEmbedService (T-0146):
 * `thumbnailUrl` alone can't classify the media, so the real file/link URL is
 * resolved into an image/video/youtube/link preview. `thumbnailUrl` IS however
 * populated for uploads that carry a poster frame (the API persists the poster
 * storage key on submit), so it supplies the still image — see `posterSrc`.
 */
@Component({
    selector: 'hf-gallery-card',
    templateUrl: './gallery-card.component.html',
    styleUrls: ['./gallery-card.component.scss'],
    standalone: false,
})
export class GalleryCardComponent {
    private readonly mediaEmbed = inject(MediaEmbedService);

    private _item!: GalleryItem;
    /** The resolved media preview for the current item. */
    preview: MediaEmbed | null = null;
    /**
     * Still image to paint instead of an inline `<video>`, when one exists.
     * Two sources, persisted poster first: the API stores an uploaded clip's
     * poster frame in `thumbnailUrl`, and MediaEmbedService derives one for
     * youtube/medal.tv links. Rendering it as a plain `<img>` means the `<video>`
     * element is never created — the only thing that shows a frame on iOS Safari,
     * which paints nothing for a `preload="metadata"` clip it hasn't buffered
     * (T-0242). Truthiness, not `??`: mapGalleryItem maps a null column to ''.
     */
    posterSrc: string | null = null;
    /** Set when the poster image fails to load, so the card falls back further down the chain. */
    posterFailed = false;
    /** Set when the clip itself can't be decoded, so the card shows the placeholder + play badge. */
    videoFailed = false;

    @Input({ required: true })
    set item(value: GalleryItem) {
        this._item = value;
        this.posterFailed = false;
        this.videoFailed = false;
        this.preview = this.mediaEmbed.resolve(value?.mediaUrl ?? value?.thumbnailUrl);
        this.posterSrc = value?.thumbnailUrl?.trim() || this.preview?.posterUrl || null;
    }
    get item(): GalleryItem {
        return this._item;
    }

    /** 0..2 — selects one of the three masonry aspect ratios. */
    @Input() aspectIndex = 0;
    /** When true (default) the whole card links to /gallery/:id. */
    @Input() linkToDetail = true;

    get aspectClass(): string {
        return `gallery-card-thumb--ar${((this.aspectIndex % 3) + 3) % 3}`;
    }

    /** Play overlay for anything that resolves to a clip (video / youtube / medal.tv). */
    get showPlay(): boolean {
        const kind = this.preview?.kind;
        return kind === 'video' || kind === 'youtube' || kind === 'medaltv';
    }

    /** VOD badge for an external non-media link. */
    get showLinkBadge(): boolean {
        return this.preview?.kind === 'link' || (!this.preview && this._item?.type === 'link');
    }
}
