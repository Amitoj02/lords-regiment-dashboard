import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard for the gallery moderation queue (T-0107). Passes when the caller
 * is authenticated AND holds the `moderate_gallery` capability (moderators +
 * admins). Non-holders are redirected to the member dashboard.
 */
export const moderateGalleryGuard: CanActivateFn = (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated() && auth.hasCapability('moderate_gallery')) {
        return true;
    }
    // T-0287: /app/dashboard was where every member landed; it is now the
    // staff console, which would refuse them a second time. Send them to
    // the public gallery — the queue is the only part they lack.
    return router.createUrlTree(['/gallery']);
};
