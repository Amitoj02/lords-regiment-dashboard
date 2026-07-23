import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

/**
 * Owns the document-title format (T-0244). Route tables carry only a page name;
 * the site suffix lives here so it is written once and every surface agrees.
 *
 * Pages whose name is only known after an HTTP call — a gallery item, a member
 * profile — call `setPageTitle()` once loaded. Nothing has to undo that:
 * `AppTitleStrategy` rewrites the title on every completed navigation, so a
 * component-supplied name cannot outlive the page that set it.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleService {
    /** The site name, and the title of any route that does not name itself. */
    readonly baseTitle = 'Lords Regiment';

    private readonly title = inject(Title);

    /**
     * `"Gallery | Lords Regiment"` for a named page, the bare base title for an
     * unnamed one. A blank/whitespace name is treated as absent rather than
     * producing a leading separator.
     */
    format(pageTitle?: string | null): string {
        const page = (pageTitle ?? '').trim();
        return page ? `${page} | ${this.baseTitle}` : this.baseTitle;
    }

    /** Apply a title a route cannot know statically. See the class note on reverting. */
    setPageTitle(pageTitle?: string | null): void {
        this.title.setTitle(this.format(pageTitle));
    }
}
