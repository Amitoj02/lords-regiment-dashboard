import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Member } from '../models/member.model';
import { ApplicationsService } from './applications.service';

/**
 * The `CurrentUser` projection returned by `GET /api/auth/me`. Mirrors the
 * backend CurrentUserDto exactly (see lords-dashboard-backend
 * src/auth/dto/current-user.dto.ts).
 */
export interface CurrentUser {
    id: string;
    /** In-game name (member) or Discord display name (identity-only). */
    inGameName: string;
    rank: string | null;
    role: Member['role'];
    discordTag: string | null;
    discordLinked: boolean;
    avatarUrl: string | null;
    isMember: boolean;
    /** Effective capability keys from the role_permissions matrix (gate UI on these). */
    capabilities: string[];
}

const TOKEN_KEY = 'lords_access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly applications = inject(ApplicationsService);

    /** Null until hydrated from `/auth/me` (see hydrate()). */
    readonly currentUser = signal<CurrentUser | null>(null);

    // ── Token storage (the JWT handed off by the OAuth callback) ─────────────
    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }
    private setToken(token: string): void {
        localStorage.setItem(TOKEN_KEY, token);
    }
    private clearToken(): void {
        localStorage.removeItem(TOKEN_KEY);
    }

    // ── OAuth flow ────────────────────────────────────────────────────────────

    /** Step 1: send the browser to the backend to begin Discord OAuth2. */
    initiateDiscordLogin(): void {
        // Top-level navigation (same-origin, proxied) so the CSRF state cookie sticks.
        window.location.href = `${environment.apiBaseUrl}/auth/discord`;
    }

    /**
     * The public "Apply to Join" CTA (T-0027). Applying IS signing in with
     * Discord: an anonymous visitor starts OAuth; a signed-in member is already
     * enrolled (→ dashboard); a signed-in non-member is routed into onboarding
     * (their status page or the blank form).
     */
    applyToJoin(): void {
        if (!this.isAuthenticated()) {
            // Route to the login page (which explains the flow + hosts the Discord
            // button) rather than opening OAuth directly (T-0105).
            this.router.navigateByUrl('/login');
            return;
        }
        if (this.isMember()) {
            this.router.navigateByUrl('/app/dashboard');
            return;
        }
        this.routeAfterLogin(this.currentUser(), false);
    }

    /**
     * Called by the /auth/callback route: persist the handed-off JWT, hydrate the
     * current user, then route to the right place (T-0030/T-0037).
     */
    completeLogin(token: string, isMember: boolean): void {
        this.setToken(token);
        this.loadCurrentUser().subscribe((user) => this.routeAfterLogin(user, isMember));
    }

    /**
     * Decide where a freshly-authenticated caller lands:
     *  - every enrolled member → the dashboard (T-0129) — Owners no longer detour
     *    to first-run setup;
     *  - non-member who already has an application → their status page (T-0030);
     *  - brand-new non-member → the blank application form.
     */
    private routeAfterLogin(user: CurrentUser | null, isMemberHint: boolean): void {
        const enrolled = user?.isMember ?? isMemberHint;
        if (enrolled) {
            this.router.navigateByUrl('/app/dashboard');
            return;
        }
        this.applications
            .getMine()
            .pipe(catchError(() => of(null)))
            .subscribe((mine) => {
                this.router.navigateByUrl(
                    mine?.application ? '/onboarding/status' : '/onboarding/apply',
                );
            });
    }

    /** GET /auth/me → set the currentUser signal. Clears the session on failure. */
    loadCurrentUser(): Observable<CurrentUser | null> {
        return this.http.get<CurrentUser>(`${environment.apiBaseUrl}/auth/me`).pipe(
            tap((user) => this.currentUser.set(user)),
            catchError(() => {
                this.clearToken();
                this.currentUser.set(null);
                return of(null);
            }),
        );
    }

    /**
     * Resolve before the app renders (APP_INITIALIZER): if a token is present,
     * hydrate the user so route guards see the correct state on first navigation.
     */
    hydrate(): Promise<void> {
        if (!this.getToken()) return Promise.resolve();
        return new Promise((resolve) => {
            this.loadCurrentUser().subscribe(() => resolve());
        });
    }

    logout(): void {
        this.http
            .post(`${environment.apiBaseUrl}/auth/logout`, {})
            .pipe(catchError(() => of(null)))
            .subscribe(() => {
                this.clearToken();
                this.currentUser.set(null);
                this.router.navigateByUrl('/login');
            });
    }

    /** Called by the JWT interceptor on a 401 — drop the session. */
    handleUnauthorized(): void {
        this.clearToken();
        this.currentUser.set(null);
    }

    // ── Guards / capability checks ──────────────────────────────────────────────

    isAuthenticated(): boolean {
        return this.currentUser() !== null;
    }

    /** True when the caller is on the roster (vs an identity-only session). */
    isMember(): boolean {
        return this.currentUser()?.isMember ?? false;
    }

    isAdmin(): boolean {
        const role = this.currentUser()?.role;
        return role === 'Owner' || role === 'Admin' || role === 'Moderator';
    }

    isOwnerOrAdmin(): boolean {
        const role = this.currentUser()?.role;
        return role === 'Owner' || role === 'Admin';
    }

    /** Capability-based gate — prefer this over role checks for admin UI. */
    hasCapability(capability: string): boolean {
        return this.currentUser()?.capabilities?.includes(capability) ?? false;
    }
}
