import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/** The card image, when a page has more to say about it than its URL. */
export interface SeoImage {
    /** Absolute or root-relative; resolved against the current origin. */
    url: string;
    alt?: string | null;
    width?: number | null;
    height?: number | null;
    /**
     * Which card this image can fill.
     *
     * Mirrors `ShellImage.shape` in the API's `page-shell.ts`: a square avatar
     * asked to fill a wide card is demoted to a thumbnail by Discord anyway, so
     * a profile with no banner asks for the layout it can actually fill.
     */
    shape?: 'wide' | 'square';
}

/** A playable video, for a page whose subject IS one (a gallery clip). */
export interface SeoVideo {
    url: string;
    /** `video/mp4`, `video/webm`, or `text/html` for an external embed page. */
    type: string;
    width?: number | null;
    height?: number | null;
}

/** Everything a page can declare about itself. */
export interface SeoTags {
    title: string;
    description: string;
    /** Absolute or root-relative; resolved against the current origin. */
    canonicalPath?: string;
    /** A bare string is shorthand for `{ url }`. */
    imageUrl?: string | SeoImage | null;
    video?: SeoVideo | null;
    type?: 'website' | 'profile' | 'article' | 'video.other';
    /** Keep this page out of the index (a members-only or transient page). */
    noIndex?: boolean;
    /** `rel=prev`/`rel=next`, for a page of a paginated list. */
    prevPath?: string | null;
    nextPath?: string | null;
    /**
     * Suppress the site-banner fallback.
     *
     * Only for a page that must NOT advertise itself — a 404, a sign-in bounce.
     * Everything else wants an image, because a card with none is what a broken
     * link looks like in a Discord channel.
     */
    noImage?: boolean;
    /** schema.org payload, serialized into a single ld+json block. */
    jsonLd?: unknown;
}

const SITE_NAME = 'Lords Regiment';
const JSON_LD_ID = 'hf-json-ld';

/**
 * The card image for a page with nothing of its own to show.
 *
 * The same asset, the same dimensions and the same rule as `DEFAULT_CARD_IMAGE`
 * in the API's `seo.service.ts` — before this existed, four of the site's
 * highest-traffic public URLs (the landing page, the roster, the calendar and
 * the gallery index) passed no image, and `apply()` REMOVES `og:image` when it
 * is absent. The static default in `index.html` was therefore deleted by the
 * first `apply()` after boot, so a cold share of any of them unfurled with no
 * picture at all.
 */
const DEFAULT_IMAGE: SeoImage = {
    url: '/assets/images/banner.png',
    width: 853,
    height: 480,
    alt: SITE_NAME,
};

/**
 * Per-page document metadata (T-0287).
 *
 * ── WHY THIS EXISTS, GIVEN THE API ALREADY RENDERS A CRAWLER SHELL ──────────
 * Two different readers, and they must agree.
 *
 * Search engines and unfurlers are rewritten at the edge to `/api/seo/*`, which
 * server-renders the real tags — that is the reliable path, because no
 * unfurler runs JavaScript. But Googlebot ALSO renders JS on a second pass, and
 * if the client-side document disagreed with the shell it would look like
 * cloaking. So this service exists to make the SPA say the same thing.
 *
 * It is also what a HUMAN sees. Sharing a link from inside the app, a browser
 * tab title, a bookmark — all of those read the live document, and until now
 * every member profile in the app was titled the literal string
 * "Profile | Lords Regiment". `PageTitleService` was written for exactly this
 * and shipped with zero callers.
 *
 * Every setter is idempotent and every page is expected to call {@link apply}
 * on load, so tags never bleed from one route into the next.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    /** Set every tag this page owns, clearing whatever the last page set. */
    apply(tags: SeoTags): void {
        const fullTitle = tags.title.includes(SITE_NAME)
            ? tags.title
            : `${tags.title} | ${SITE_NAME}`;
        this.title.setTitle(fullTitle);

        const image = this.resolveImage(tags);
        const video = tags.video ? this.sizeForDiscord(tags.video) : null;

        this.setName('description', tags.description);
        this.setProperty('og:site_name', SITE_NAME);
        this.setProperty('og:type', tags.type ?? 'website');
        this.setProperty('og:locale', 'en_GB');
        this.setProperty('og:title', fullTitle);
        this.setProperty('og:description', tags.description);
        this.setName('twitter:card', this.twitterCard(image, video));
        this.setName('twitter:title', fullTitle);
        this.setName('twitter:description', tags.description);

        const url = this.absolute(tags.canonicalPath);
        this.setProperty('og:url', url);
        this.setCanonical(url);
        this.setPageLink('prev', tags.prevPath);
        this.setPageLink('next', tags.nextPath);

        this.setProperty('og:image', image?.url);
        this.setProperty(
            'og:image:secure_url',
            image?.url.startsWith('https://') ? image.url : null,
        );
        this.setProperty('og:image:width', image?.width ? String(image.width) : null);
        this.setProperty('og:image:height', image?.height ? String(image.height) : null);
        this.setProperty('og:image:alt', image?.alt);
        this.setName('twitter:image', image?.url);
        this.setName('twitter:image:alt', image?.alt);

        this.setProperty('og:video', video?.url);
        this.setProperty(
            'og:video:secure_url',
            video?.url.startsWith('https://') ? video.url : null,
        );
        this.setProperty('og:video:type', video?.type);
        this.setProperty('og:video:width', video?.width ? String(video.width) : null);
        this.setProperty('og:video:height', video?.height ? String(video.height) : null);

        // `noindex, follow`: a page we do not want ranked is still a page whose
        // links are worth crawling. The indexable branch opts into the LARGE
        // image preview, which is opt-in — a site that says nothing gets a
        // thumbnail — and matches what the API's shell emits for the same URL.
        this.setName(
            'robots',
            tags.noIndex
                ? 'noindex, follow'
                : 'index, follow, max-image-preview:large, max-snippet:-1',
        );
        this.setJsonLd(tags.jsonLd ?? null);
    }

    /**
     * Reset to the site defaults. Called by pages that have nothing specific to
     * say, so a stale profile title cannot survive a navigation.
     */
    reset(): void {
        this.apply({
            title: SITE_NAME,
            description: 'Roster, events and gallery for a Holdfast: Nations at War regiment.',
            canonicalPath: this.document.location?.pathname,
        });
    }

    /**
     * The page's image, made absolute, falling back to the site banner.
     *
     * An unfurler cannot resolve a relative URL, so every one of these is
     * absolutised against the live origin rather than the production host —
     * which is also what makes a locally-served page unfurl correctly against a
     * tunnel.
     */
    private resolveImage(tags: SeoTags): SeoImage | null {
        if (tags.noImage) return null;
        const input = tags.imageUrl;
        const image = typeof input === 'string' ? { url: input } : (input ?? null);
        const chosen = image?.url ? image : DEFAULT_IMAGE;
        return { ...chosen, url: this.absolute(chosen.url) };
    }

    /**
     * `player` when there is a clip AND a still — several unfurlers drop a
     * player card with no poster, which turns a video into no preview at all.
     * `summary` for a square image, because Discord inspects the real file and
     * demotes it to a thumbnail whatever the tag claims.
     *
     * The same three-way rule as `twitterCard()` in the API's `page-shell.ts`.
     */
    private twitterCard(image: SeoImage | null, video: SeoVideo | null): string {
        if (video && image) return 'player';
        if (!image) return 'summary';
        return image.shape === 'square' ? 'summary' : 'summary_large_image';
    }

    /**
     * Discord sizes its player purely from the declared dimensions, refusing
     * anything it reads as too large and rendering anything it reads as tiny at
     * postage-stamp size. Halving a 4K clip and doubling a 360p one is the
     * workaround FxEmbed carries in production for exactly this. The real file
     * is untouched — no unfurler uses these numbers to decode, only to lay out.
     *
     * Identical to `sizeForDiscord` in the API's `page-shell.ts`.
     */
    private sizeForDiscord(video: SeoVideo): SeoVideo {
        const { width, height } = video;
        if (!width || !height) return video;
        if (width > 1920 || height > 1920) {
            return { ...video, width: Math.round(width / 2), height: Math.round(height / 2) };
        }
        if (width < 400 && height < 400) {
            return { ...video, width: width * 2, height: height * 2 };
        }
        return video;
    }

    private setPageLink(rel: 'prev' | 'next', path: string | null | undefined): void {
        const head = this.document.head;
        const existing = head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
        if (!path) {
            existing?.remove();
            return;
        }
        const link = existing ?? this.document.createElement('link');
        link.setAttribute('rel', rel);
        link.setAttribute('href', this.absolute(path));
        if (!existing) head.appendChild(link);
    }

    private setName(name: string, content: string | null | undefined): void {
        if (content) this.meta.updateTag({ name, content });
        else this.meta.removeTag(`name="${name}"`);
    }

    private setProperty(property: string, content: string | null | undefined): void {
        if (content) this.meta.updateTag({ property, content });
        else this.meta.removeTag(`property="${property}"`);
    }

    private setCanonical(href: string): void {
        const head = this.document.head;
        let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!link) {
            link = this.document.createElement('link');
            link.setAttribute('rel', 'canonical');
            head.appendChild(link);
        }
        link.setAttribute('href', href);
    }

    /**
     * One ld+json block, replaced wholesale.
     *
     * `textContent` rather than `innerHTML`, so a member-authored name inside
     * the payload is inserted as text and cannot close the element. The block
     * itself is allowed under the site's `script-src 'self'` CSP because
     * `application/ld+json` is data — the browser never executes it.
     */
    private setJsonLd(payload: unknown): void {
        const existing = this.document.getElementById(JSON_LD_ID);
        if (existing) existing.remove();
        if (!payload) return;

        const script = this.document.createElement('script');
        script.id = JSON_LD_ID;
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(payload);
        this.document.head.appendChild(script);
    }

    private absolute(pathOrUrl?: string | null): string {
        const origin = this.document.location?.origin ?? '';
        if (!pathOrUrl) return origin + (this.document.location?.pathname ?? '/');
        if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
        return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
    }
}
