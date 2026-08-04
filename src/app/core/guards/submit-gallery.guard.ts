import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard for submitting to the gallery (T-0107). Passes when the caller is
 * authenticated AND holds the `submit_to_gallery` capability (members only —
 * Mercenary excluded by the seed defaults). Non-holders are redirected to the
 * member dashboard.
 */
export const submitGalleryGuard: CanActivateFn = (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated() && auth.hasCapability('submit_to_gallery')) {
        return true;
    }
    // T-0287: /app/dashboard was where every member landed; it is now the
    // staff console, which would refuse them a second time. Send them to
    // the public gallery they were trying to contribute to.
    return router.createUrlTree(['/gallery']);
};
