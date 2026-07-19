import { Component, Input } from '@angular/core';

/**
 * A rank insignia: renders the uploaded rank image (padded, never cropped) and
 * falls back to the rank's initial tile when the image is missing or fails to
 * load. Replaces the retired hf-chevrons pip strip (T-0193); mirrors hf-avatar's
 * image-with-initials pattern.
 */
@Component({
    standalone: false,
    selector: 'hf-rank-icon',
    templateUrl: './rank-icon.component.html',
    styleUrls: ['./rank-icon.component.scss'],
})
export class RankIconComponent {
    /** Public URL of the rank image; when absent/broken the initial tile shows. */
    @Input() imageUrl?: string | null;
    /** Rank name — drives the fallback initial + the accessible label. */
    @Input() name = '';
    /** Rendered square size in px. */
    @Input() size = 24;

    imageFailed = false;

    onImgError(): void {
        this.imageFailed = true;
    }

    get showImage(): boolean {
        return !!this.imageUrl && !this.imageFailed;
    }

    get initial(): string {
        return (this.name.trim()[0] ?? '').toUpperCase();
    }
}
