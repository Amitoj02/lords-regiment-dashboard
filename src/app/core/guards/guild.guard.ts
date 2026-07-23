import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, catchError, map, of, timeout } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * The URLs a gated user may still reach inside `/app` (CONTRACT decision #4).
 * `/app/account-deletion` is not a courtesy: Discord's Developer ToS requires the
 * account-deletion path to stay reachable, and a gate that hid it would put the
 * regiment in breach. `/app/profile` is the user's own record — matched exactly,
 * so `/app/profile/:id` (somebody else's) stays gated.
 */
const GATE_ALLOWED_URLS = ['/app/profile', '/app/account-deletion'];

/**
 * Longest a navigation may wait on the guild re-check. Past it we decide on the
 * verdict we already hold and let the request land in the background — a slow
 * Discord lookup must never make the dashboard feel broken.
 */
const NAVIGATION_BUDGET_MS = 2500;

/**
 * Keeps a user who is not in the regiment's Discord guild out of the
 * authenticated app (T-0261) and re-checks that verdict on entry (T-0262).
 *
 * It sits on the two `/app` parents, which is the one place every authenticated
 * route already passes through — that is why nothing in the app shell or the
 * pages themselves has to know the gate exists. Being the parent also means
 * `state.url` is the full URL the user asked for, which is what the allowlist and
 * the resume-after-gate stash both read.
 *
 * This is the only asynchronous guard in the app. It never blocks on the network:
 * inside the throttle window AuthService resolves synchronously without a
 * request, and a slow, failed or `degraded` check resolves to the verdict already
 * in hand rather than gating or logging anyone out.
 */
export const guildGuard: CanActivateFn = (
    _route,
    state: RouterStateSnapshot,
): Observable<boolean | UrlTree> => {
    const auth = inject(AuthService);
    const router = inject(Router);

    // An anonymous visitor is authGuard's business. Returning early also
    // guarantees no guild-status call is ever made without a session.
    if (!auth.isAuthenticated()) return of(true);

    // Always reachable, gated or not — and cheap enough to answer before we
    // consider spending a request.
    if (isGateAllowed(state.url)) return of(true);

    return auth.refreshGuildStatus().pipe(
        timeout({ first: NAVIGATION_BUDGET_MS, with: () => of(null) }),
        map(() => verdict(auth, router, state.url)),
        // Belt and braces: AuthService already swallows failures, so anything
        // reaching here is unexpected and still must not strand the user.
        catchError(() => of(true)),
    );
};

/** True for a URL a gated user keeps access to (query string and fragment ignored). */
function isGateAllowed(url: string): boolean {
    const path = url.split('?')[0].split('#')[0];
    return GATE_ALLOWED_URLS.includes(path);
}

function verdict(auth: AuthService, router: Router, url: string): boolean | UrlTree {
    if (!auth.isGuildGated()) return true;
    // Remember where they were headed so the gate can resume it once the
    // re-check flips (T-0263).
    auth.stashGateReturnUrl(url);
    return router.createUrlTree(['/guild-required']);
}
