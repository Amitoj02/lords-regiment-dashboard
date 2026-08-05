import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Requires a signed-in caller, and REMEMBERS WHERE THEY WERE GOING (T-0287).
 *
 * The return-URL capture is new, and it is load-bearing rather than polish. Now
 * that events are a public page, the primary call to action on an event a
 * visitor has just read about is "Sign in to RSVP" — and without stashing the
 * URL, `routeAfterLogin` would deposit them on the dashboard (or, being an
 * ordinary member, on the home page) with no way back to the event they were
 * looking at. The guild gate has always done this; the auth guard never did.
 */
export const authGuard: CanActivateFn = (
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated()) {
        return true;
    }
    auth.stashReturnUrl(state.url);
    return router.createUrlTree(['/login']);
};
