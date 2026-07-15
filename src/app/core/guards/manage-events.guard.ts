import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Moderator+ route guard for authoring/managing events (T-0084). Passes when the
 * caller is authenticated AND holds the `manage_events` capability (Owner/Admin/
 * Moderator by default) — capability-based rather than a role check, per the
 * repo convention. Non-holders are redirected to the member dashboard. Members
 * without the capability can still READ events (guarded by authGuard only).
 */
export const manageEventsGuard: CanActivateFn = (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated() && auth.hasCapability('manage_events')) {
        return true;
    }
    return router.createUrlTree(['/app/dashboard']);
};
