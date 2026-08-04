import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The chrome every public page shares (T-0287).
 *
 * ── WHY A LAYOUT ROUTE, WHEN NOTHING ELSE IN THIS APP USES ONE ──────────────
 * `AppComponent`'s template is a bare `<router-outlet>`, so both existing
 * shells — `hf-app-shell` and the `hf-public-nav`/`hf-public-footer` pair — are
 * hand-pasted as the root element of every page template that wants them: 15
 * templates for one, 5 for the other. That has already drifted (the active-nav
 * item is a string each page passes by hand, and the profile page passes an
 * empty one when you view somebody else, so nothing highlights).
 *
 * The public tree is roughly tripling in size here — roster, profiles, event
 * detail, gallery submit, account — so pasting the same two elements into eight
 * more templates was not the version of this worth shipping. One layout route
 * mounts the chrome once, and the nav derives its own active state from the
 * router instead of being told.
 *
 * The dashboard keeps `hf-app-shell` as-is. Converting that too would have
 * meant touching every admin template in the same change as a routing rewrite,
 * and the win there is much smaller now that `/app` is a handful of staff
 * screens rather than fifteen pages.
 */
@Component({
    selector: 'hf-public-layout',
    templateUrl: './public-layout.component.html',
    styleUrls: ['./public-layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class PublicLayoutComponent {}
