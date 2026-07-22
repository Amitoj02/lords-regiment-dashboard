import { Injectable } from '@angular/core';

/**
 * Captures a still frame from a locally-selected video so a gallery submission
 * can carry a poster image (lords-dashboard-backend:T-0152).
 *
 * ## Why client-side
 * The alternative was ffmpeg in the API image: a much heavier container and a new
 * failure mode on the submit path. A hostile client controlling the poster is an
 * accepted trade because every gallery submission passes through moderation
 * before it is public, and the uploaded key is namespace-validated server-side
 * exactly like the media itself.
 *
 * ## Why it must never block a submission
 * Frame extraction fails for perfectly ordinary reasons — a codec the browser
 * cannot decode, a zero-length file, a stalled load. Every failure path here
 * resolves to `null` rather than rejecting, so a video always submits; it simply
 * falls back to the placeholder tile, which is exactly today's behaviour.
 */
@Injectable({ providedIn: 'root' })
export class VideoPosterService {
    /** Give up on a stubborn decode rather than leaving the submit button spinning. */
    private static readonly TIMEOUT_MS = 8_000;

    /**
     * Seek target, in seconds. NOT 0: many encodes open on a black or blank
     * frame, which produces a poster indistinguishable from the bug this fixes.
     * Clamped below the duration for videos shorter than this.
     */
    private static readonly SEEK_SECONDS = 1;

    /** Cap the long edge — this is a grid thumbnail, not a second copy of the video. */
    private static readonly MAX_EDGE_PX = 1280;

    /**
     * Decode a frame from `file` and return it as a JPEG blob, or null when a
     * frame cannot be obtained for any reason.
     */
    async capture(file: File): Promise<Blob | null> {
        if (!file.type.startsWith('video/')) {
            return null;
        }

        const objectUrl = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.muted = true;
        // Required for the frame to be decodable without a user gesture on iOS.
        video.playsInline = true;
        video.preload = 'auto';
        video.src = objectUrl;

        try {
            return await this.withTimeout(
                this.drawFirstFrame(video),
                VideoPosterService.TIMEOUT_MS,
            );
        } catch {
            // Deliberately swallowed: a missing poster is a cosmetic fallback,
            // never a reason to fail the upload the user actually asked for.
            return null;
        } finally {
            URL.revokeObjectURL(objectUrl);
            // Drop the decoder's hold on the buffer.
            video.removeAttribute('src');
            video.load();
        }
    }

    /** Wait for metadata, seek, wait for the seek, then paint one frame. */
    private drawFirstFrame(video: HTMLVideoElement): Promise<Blob | null> {
        return new Promise<Blob | null>((resolve, reject) => {
            video.onerror = () => reject(new Error('video failed to load'));

            video.onloadedmetadata = () => {
                // A duration of 0/NaN means nothing decodable was found.
                if (!video.videoWidth || !video.videoHeight) {
                    reject(new Error('video has no decodable dimensions'));
                    return;
                }
                const duration = Number.isFinite(video.duration) ? video.duration : 0;
                video.currentTime = Math.min(
                    VideoPosterService.SEEK_SECONDS,
                    Math.max(duration - 0.1, 0),
                );
            };

            video.onseeked = () => {
                try {
                    const { width, height } = this.fit(video.videoWidth, video.videoHeight);
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const context = canvas.getContext('2d');
                    if (!context) {
                        reject(new Error('no 2d context'));
                        return;
                    }
                    context.drawImage(video, 0, 0, width, height);
                    // JPEG, not PNG: a photographic frame as PNG is several times
                    // larger for no visible gain, and the target caps at 4MB.
                    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82);
                } catch (error) {
                    // A cross-origin frame taints the canvas and toBlob throws.
                    reject(error instanceof Error ? error : new Error('frame capture failed'));
                }
            };
        });
    }

    /** Scale the frame down to {@link MAX_EDGE_PX} on its long edge, preserving aspect. */
    private fit(width: number, height: number): { width: number; height: number } {
        const longest = Math.max(width, height);
        if (longest <= VideoPosterService.MAX_EDGE_PX) {
            return { width, height };
        }
        const scale = VideoPosterService.MAX_EDGE_PX / longest;
        return { width: Math.round(width * scale), height: Math.round(height * scale) };
    }

    private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('poster capture timed out')), ms);
            promise.then(
                (value) => {
                    clearTimeout(timer);
                    resolve(value);
                },
                (error) => {
                    clearTimeout(timer);
                    reject(error);
                },
            );
        });
    }
}
