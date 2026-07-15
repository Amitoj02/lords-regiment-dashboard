import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export type MediaEmbedKind = 'youtube' | 'medaltv' | 'image' | 'video' | 'link';

export interface MediaEmbed {
    kind: MediaEmbedKind;
    /** Sanitized URL for iframe embeds (youtube/medaltv). */
    safeUrl?: SafeResourceUrl;
    /** The raw URL (used for <img>/<video>/plain-link rendering). */
    rawUrl: string;
}

/**
 * Resolves a gallery item's media URL into a renderable embed (T-0113):
 *   - medal.tv clip links   → the medal.tv iframe embed
 *   - YouTube links         → the YouTube iframe embed
 *   - direct image/video    → inline <img> / <video>
 *   - anything else         → a safe plain external link
 * iframe URLs are trusted via DomSanitizer; raw links are rendered as plain
 * anchors, never as embeds, so an unknown/hostile URL can't inject markup.
 */
@Injectable({ providedIn: 'root' })
export class MediaEmbedService {
    private readonly sanitizer = inject(DomSanitizer);

    resolve(url: string | null | undefined): MediaEmbed | null {
        if (!url) {
            return null;
        }
        const raw = url.trim();
        let parsed: URL;
        try {
            parsed = new URL(raw);
        } catch {
            return { kind: 'link', rawUrl: raw };
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { kind: 'link', rawUrl: raw };
        }
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

        const youtubeId = this.youtubeId(parsed, host);
        if (youtubeId) {
            return {
                kind: 'youtube',
                rawUrl: raw,
                safeUrl: this.trust(`https://www.youtube.com/embed/${youtubeId}`),
            };
        }

        const medalId = this.medalTvId(parsed, host);
        if (medalId) {
            return {
                kind: 'medaltv',
                rawUrl: raw,
                safeUrl: this.trust(`https://medal.tv/clip/${medalId}/embed`),
            };
        }

        if (/\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(parsed.pathname)) {
            return { kind: 'image', rawUrl: raw };
        }
        if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(parsed.pathname)) {
            return { kind: 'video', rawUrl: raw };
        }
        return { kind: 'link', rawUrl: raw };
    }

    private youtubeId(parsed: URL, host: string): string | null {
        if (host === 'youtu.be') {
            const id = parsed.pathname.slice(1);
            return this.validId(id);
        }
        if (host === 'youtube.com' || host === 'm.youtube.com') {
            if (parsed.pathname === '/watch') {
                return this.validId(parsed.searchParams.get('v'));
            }
            const m = parsed.pathname.match(/^\/(?:embed|shorts|v)\/([^/?]+)/);
            return m ? this.validId(m[1]) : null;
        }
        return null;
    }

    private medalTvId(parsed: URL, host: string): string | null {
        if (host !== 'medal.tv') {
            return null;
        }
        // Accepts /clips/<id>, /clip/<id>, /games/<game>/clips/<id>, /?contentId=<id>
        const m = parsed.pathname.match(/\/clips?\/([A-Za-z0-9_-]+)/);
        if (m) {
            return m[1];
        }
        return this.validId(parsed.searchParams.get('contentId'));
    }

    private validId(id: string | null | undefined): string | null {
        return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
    }

    private trust(url: string): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}
