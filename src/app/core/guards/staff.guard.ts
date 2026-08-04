import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * The capabilities that make someone STAFF — i.e. that give them a reason to
 * open the dashboard at all (T-0287).
 *
 * Capability-based rather than role-based on purpose. `adminGuard`, which this
 * replaces on `/app`, tested `role === Owner|Admin|Moderator`, but the
 * permission matrix is per-regiment and editable through
 * `PATCH /api/settings/permissions` — so an owner who grants `manage_events` to
 * plain Members would have created people the API lets in and the router
 * bounces. Reading the same keys the API reads means the two cannot disagree.
 */
export const STAFF_CAPABILITIES = [
    'manage_applications',
    'manage_events',
    'moderate_gallery',
    'view_audit_log',
    'edit_ranks_medals',
    'manage_roles',
    'manage_settings',
    'manage_regiment_details',
] as const;

/** True when the caller holds at least one dashboard-worthy capability. */
export function isStaff(auth: AuthService): boolean {
    return STAFF_CAPABILITIES.some((capability) => auth.hasCapability(capability));
}

/**
 * Gate for `/app` now that the dashboard is a STAFF-ONLY surface (T-0287).
 *
 * Ordinary members no longer have anything here: their profile, the roster,
 * events, the gallery and their own account settings all live on the public
 * site. So a member who follows an old bookmark is sent to the PUBLIC HOME
 * PAGE, not to `/login` — they are signed in perfectly well, there is simply
 * nothing behind this door for them, and bouncing them to a sign-in form they
 * have already completed is the most confusing possible answer.
 */
export const staffGuard: CanActivateFn = (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated() && isStaff(auth)) {
        return true;
    }
    return router.createUrlTree(['/home']);
};
