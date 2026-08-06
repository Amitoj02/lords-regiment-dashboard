import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
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
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class GalleryCardComponent {
    private readonly mediaEmbed = inject(MediaEmbedService);
    private readonly auth = inject(AuthService);

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

    /**
     * The clip URL with a `#t=` media fragment, for the case where there is no
     * poster to paint instead.
     *
     * iOS Safari — and iOS Chrome, which is the same WebKit underneath — renders
     * NOTHING for a `preload="metadata"` clip it has not been asked for a
     * specific frame of: the tile stays flat black behind the play badge, which
     * is what T-0242's poster was meant to solve and still does for every clip
     * uploaded since. Clips submitted BEFORE it, and any whose capture failed,
     * have no poster at all, and a media fragment is the only thing that makes
     * WebKit fetch and paint a frame without playing the video.
     *
     * 0.1s rather than 0: plenty of encodes open on a black frame, which would
     * be indistinguishable from the bug. An existing fragment is left alone.
     */
    get videoPreviewSrc(): string | null {
        const raw = this.preview?.kind === 'video' ? this.preview.rawUrl : null;
        if (!raw) {
            return null;
        }
        return raw.includes('#') ? raw : `${raw}#t=0.1`;
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

    /**
     * Whether to name the approving officer on this card.
     *
     * Two conditions on purpose. The FIELD is the real gate — the API sends
     * `approvedBy` only to `moderate_gallery` holders — and the capability check
     * is a second, local one so a future endpoint that over-shares cannot turn
     * this card into the leak. Either alone would be enough today; both together
     * mean the card is never the weakest link.
     */
    get showApprover(): boolean {
        return !!this._item?.approvedBy && this.auth.hasCapability('moderate_gallery');
    }
}
