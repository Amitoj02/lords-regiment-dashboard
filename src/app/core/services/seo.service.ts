import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/** Everything a page can declare about itself. */
export interface SeoTags {
    title: string;
    description: string;
    /** Absolute or root-relative; resolved against the current origin. */
    canonicalPath?: string;
    imageUrl?: string | null;
    type?: 'website' | 'profile' | 'article';
    /** Keep this page out of the index (a members-only or transient page). */
    noIndex?: boolean;
    /** schema.org payload, serialized into a single ld+json block. */
    jsonLd?: unknown;
}

const SITE_NAME = 'Lords Regiment';
const JSON_LD_ID = 'hf-json-ld';

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

        this.setName('description', tags.description);
        this.setProperty('og:site_name', SITE_NAME);
        this.setProperty('og:type', tags.type ?? 'website');
        this.setProperty('og:title', fullTitle);
        this.setProperty('og:description', tags.description);
        this.setName('twitter:card', tags.imageUrl ? 'summary_large_image' : 'summary');
        this.setName('twitter:title', fullTitle);
        this.setName('twitter:description', tags.description);

        const url = this.absolute(tags.canonicalPath);
        this.setProperty('og:url', url);
        this.setCanonical(url);

        const image = tags.imageUrl ? this.absolute(tags.imageUrl) : null;
        this.setProperty('og:image', image);
        this.setName('twitter:image', image);

        // `noindex, follow`: a page we do not want ranked is still a page whose
        // links are worth crawling.
        this.setName('robots', tags.noIndex ? 'noindex, follow' : null);
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
