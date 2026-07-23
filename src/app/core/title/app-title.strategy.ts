import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { PageTitleService } from './page-title.service';

/**
 * Applies `"<Page> | Lords Regiment"` after every completed navigation (T-0244).
 *
 * Two deliberate differences from Angular's `DefaultTitleStrategy`:
 *
 * 1. It writes on *every* navigation, not only when the route declares a title.
 *    The default leaves the previous page's title in the tab, so an untitled
 *    route would inherit a stale name instead of falling back to the site name.
 * 2. `updateTitle` is total. The router invokes it inside the navigation
 *    pipeline, *before* it resolves the transition, so a throw here does not
 *    merely mis-title one page — it aborts navigation for every route in the app.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);
    private readonly pageTitle = inject(PageTitleService);

    override updateTitle(snapshot: RouterStateSnapshot): void {
        try {
            this.title.setTitle(this.pageTitle.format(this.buildTitle(snapshot)));
        } catch {
            // Never let a title failure take navigation down with it (see 2 above).
            this.title.setTitle(this.pageTitle.baseTitle);
        }
    }
}
