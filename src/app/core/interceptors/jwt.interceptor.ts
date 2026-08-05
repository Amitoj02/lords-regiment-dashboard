import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Attaches the session JWT (as a Bearer token) to same-origin `/api` requests,
 * and drops the session on a 401. The backend also sets an httpOnly cookie, but
 * the bearer header keeps the SPA working if cookies are unavailable.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const token = auth.getToken();
    const isApi = req.url.startsWith(environment.apiBaseUrl);
    const authorized =
        token && isApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

    return next(authorized).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && isApi) {
                auth.handleUnauthorized();
                // Only bounce to /login from INSIDE the dashboard (T-0287).
                //
                // This used to redirect on every 401 except the /auth/me probe,
                // which was safe while every page behind a session was under
                // /app. It is not safe now: the roster, profiles, events and the
                // gallery are public pages that a signed-out visitor reads
                // normally, and any one stale-token call from them would have
                // ejected an anonymous reader to a sign-in form they never asked
                // for. Dropping the session (above) is still right everywhere —
                // it is the NAVIGATION that has to be scoped.
                if (!router.url.startsWith('/app')) {
                    return throwError(() => error);
                }
                if (!req.url.endsWith('/auth/me')) {
                    void router.navigateByUrl('/login');
                }
            }
            return throwError(() => error);
        }),
    );
};
