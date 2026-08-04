import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guards the onboarding (apply / status) routes so they are only reachable by an
 * authenticated NON-member (T-0027): an anonymous visitor is sent to sign in,
 * and an already-enrolled member is sent to the dashboard (they have nothing to
 * apply for).
 */
export const onboardingGuard: CanActivateFn = (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
        return router.createUrlTree(['/login']);
    }
    if (auth.isMember()) {
        // T-0287: /app/dashboard was where every member landed; it is now the
        // staff console, which would refuse them a second time. Send them to
        // the public front page.
        return router.createUrlTree(['/home']);
    }
    return true;
};
