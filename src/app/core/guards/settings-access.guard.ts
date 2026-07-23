import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * The capabilities that put at least one settings section within reach.
 *
 * `manage_settings` covers the Regiment group (profile, Discord, permission
 * matrix); `manage_regiment_details` covers the Public pages group (landing +
 * sign-in presentation, legal documents). Holding EITHER is enough to be on the
 * page — the in-page nav then hides whichever group the caller cannot use.
 *
 * The sidebar entry reads the same list, so the link and the route can never
 * disagree about who may go there (T-0265).
 */
export const SETTINGS_CAPABILITIES: readonly string[] = [
    'manage_settings',
    'manage_regiment_details',
];

/**
 * Route guard for `/app/admin/settings` (T-0265).
 *
 * The admin routes are behind `adminGuard`, which is ROLE-based (Owner | Admin |
 * Moderator). The settings page is not: every one of its sections is gated on a
 * capability the API enforces, so a role-only check let a Moderator holding
 * neither capability walk into a panel of empty chrome while the API 403'd every
 * request behind it. This guard closes that gap; `adminGuard` still does its
 * role job for the other admin routes.
 */
export const settingsAccessGuard: CanActivateFn = (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated() && SETTINGS_CAPABILITIES.some((c) => auth.hasCapability(c))) {
        return true;
    }
    return router.createUrlTree(['/app/dashboard']);
};
