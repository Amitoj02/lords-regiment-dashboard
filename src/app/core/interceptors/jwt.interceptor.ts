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
                // Don't redirect on the /auth/me probe (hydration handles it) to
                // avoid bouncing a public visitor to /login.
                if (!req.url.endsWith('/auth/me')) {
                    void router.navigateByUrl('/login');
                }
            }
            return throwError(() => error);
        }),
    );
};
