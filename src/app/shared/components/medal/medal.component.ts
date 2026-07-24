import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

/** Rendered size of a medal tile. */
export type MedalSize = 'sm' | 'md' | 'lg';

/**
 * A medal decoration: renders the uploaded medal image (padded, never cropped)
 * and falls back to the glyph/letter tile when the image is missing or fails to
 * load — mirroring hf-avatar's image-with-initials pattern (T-0193).
 */
@Component({
    standalone: false,
    selector: 'hf-medal',
    templateUrl: './medal.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./medal.component.scss'],
})
export class MedalComponent {
    /** Public URL of the medal image; when absent/broken the letter tile shows. */
    @Input() imageUrl?: string | null;
    /** Fallback label (medal glyph) shown when there is no image. */
    @Input() letter = '';
    @Input() title = '';
    @Input() size: MedalSize = 'md';

    imageFailed = false;

    onImgError(): void {
        this.imageFailed = true;
    }

    get showImage(): boolean {
        return !!this.imageUrl && !this.imageFailed;
    }
}
