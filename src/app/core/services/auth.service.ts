import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, of, shareReplay, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Member } from '../models/member.model';
import { isStaff } from '../guards/staff.guard';
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
    /**
     * The caller's vanity handle backing `/u/@handle`, or null when unclaimed.
     * Always null for an identity-only (non-member) session (T-0287).
     */
    username: string | null;
    rank: string | null;
    role: Member['role'];
    discordTag: string | null;
    discordLinked: boolean;
    avatarUrl: string | null;
    isMember: boolean;
    /** Effective capability keys from the role_permissions matrix (gate UI on these). */
    capabilities: string[];

    // ── Guild-membership gate (T-0261/T-0262) ────────────────────────────────
    // REQUIRED, per CONTRACT §1: the API sends all four on the member AND the
    // identity-only (Applicant) projection, and never omits them.
    //
    // The runtime helpers below still treat an absent value as "gate off" — they
    // compare against `true` explicitly rather than testing truthiness — because
    // the gate must fail OPEN for a payload that predates the feature (an older
    // API, a cached response). That defensiveness is deliberate and must stay:
    // this type states the contract, it does not enforce it at runtime.

    /** Last known verdict for "is this Discord identity in the regiment guild?". */
    guildMember: boolean;
    /** The regiment's Discord invite, or null when unconfigured. Never omitted. */
    discordInviteUrl: string | null;
    /** Whether guild-membership gating is switched on for this regiment. */
    guildGateEnabled: boolean;
    /** Whether this caller bypasses the gate (holds manage_settings). */
    guildGateExempt: boolean;
}

/** The `GET /api/auth/guild-status` payload (T-0262). */
export interface GuildStatus {
    guildMember: boolean;
    gateEnabled: boolean;
    exempt: boolean;
    /** ISO-8601 of the last successful bot lookup, or null if never checked. */
    checkedAt: string | null;
    /** True when the verdict could not be refreshed (bot down / breaker open). */
    degraded: boolean;
}

const TOKEN_KEY = 'lords_access_token';

/**
 * How long a guild verdict is trusted client-side before {@link
 * AuthService.refreshGuildStatus} will ask the API again (T-0262). The server
 * keeps its own 15-minute TTL and its own in-flight collapsing; this window
 * exists purely so the route guard does not fire a request per navigation.
 */
const GUILD_RECHECK_WINDOW_MS = 5 * 60 * 1000;

/**
 * Ceiling on a single guild-status request. Past it we keep the last known
 * verdict — a slow Discord lookup must never strand a signed-in user.
 */
const GUILD_STATUS_TIMEOUT_MS = 8000;

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly applications = inject(ApplicationsService);

    /** Null until hydrated from `/auth/me` (see hydrate()). */
    readonly currentUser = signal<CurrentUser | null>(null);

    /** Epoch ms of the last guild-status request we started. 0 = never. */
    private guildCheckedAt = 0;
    /** The single in-flight guild-status call, shared by every concurrent caller. */
    private guildStatusInFlight: Observable<GuildStatus | null> | null = null;
    /** URL the gate interrupted, replayed by {@link resumeAfterGate} (T-0263). */
    private gateReturnUrl: string | null = null;
    /** Post-login `isMember` hint the gate interrupted, replayed the same way. */
    private gateReturnIsMemberHint: boolean | null = null;
    /** URL an anonymous visitor was refused, replayed after sign-in (T-0287). */
    private returnUrl: string | null = null;

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
            // Already enrolled — there is nothing to apply for. Staff go to the
            // console; everyone else to their own profile, because /app is
            // staff-only now and would bounce them (T-0287). This branch has to
            // agree with LandingComponent.applyLabel, which renders the button.
            this.router.navigateByUrl(this.isStaff() ? '/app' : this.myProfilePath());
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
     *  - a gated caller → the guild gate, whichever projection they carry (T-0263);
     *  - anyone who was refused a specific URL → back to that URL (T-0287);
     *  - an enrolled STAFF member → the dashboard;
     *  - any other enrolled member → their own public profile, because the
     *    dashboard is staff-only now and would bounce them straight back;
     *  - non-member who already has an application → their status page (T-0030);
     *  - brand-new non-member → the blank application form.
     */
    private routeAfterLogin(user: CurrentUser | null, isMemberHint: boolean): void {
        const enrolled = user?.isMember ?? isMemberHint;
        // `user` is null when /auth/me failed — we have no verdict to gate on, and
        // gating on a missing projection would be a dead end. Only a projection we
        // actually received can send someone to the gate.
        if (user && this.isGuildGated()) {
            // Stash the branch we were about to take so a successful re-check
            // resumes it (including the applicant's status-vs-apply lookup, which
            // is deliberately not run while the caller is gated).
            this.gateReturnIsMemberHint = isMemberHint;
            this.gateReturnUrl = null;
            this.router.navigateByUrl('/guild-required');
            return;
        }
        // An explicitly attempted URL beats every default below (T-0287). This is
        // what makes "Sign in to RSVP" land back on the event rather than on a
        // dashboard the member may not even be able to open.
        const attempted = this.returnUrl;
        this.returnUrl = null;
        // Replayed for ANY caller, not just an enrolled one. The locked panels on
        // a public profile and an event page show "Sign in" to whoever is
        // reading, and most of them are not on the roster yet — gating the
        // replay on enrolment sent exactly those people to the application form
        // instead of back to the page they asked for. Every stashed URL is
        // either public or behind a guard that handles a non-member itself.
        if (attempted) {
            this.router.navigateByUrl(attempted);
            return;
        }
        if (enrolled) {
            // The dashboard is STAFF-ONLY now (T-0287), so sending every member
            // there would bounce most of them straight back off staffGuard.
            // Ordinary members belong on their own public profile.
            this.router.navigateByUrl(this.isStaff() ? '/app' : this.myProfilePath());
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
            tap((user) => {
                this.currentUser.set(user);
                // /auth/me carries a fresh guild verdict, so it opens a new
                // throttle window: the guard must not immediately re-ask for
                // something we were just told.
                this.guildCheckedAt = Date.now();
            }),
            catchError(() => {
                this.clearToken();
                this.currentUser.set(null);
                this.resetGuildState();
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
                this.resetGuildState();
                // Home, not /login (T-0287). Signing out from a public page used
                // to drop the reader on "Continue with Discord" one click after
                // they asked to LEAVE, which reads as the sign-out having failed.
                // The whole site is readable signed-out now, so there is
                // somewhere sensible to land.
                this.router.navigateByUrl('/home');
            });
    }

    /** Called by the JWT interceptor on a 401 — drop the session. */
    handleUnauthorized(): void {
        this.clearToken();
        this.currentUser.set(null);
        this.resetGuildState();
    }

    // ── Guild-membership gate (T-0261/T-0262/T-0263) ────────────────────────────

    /**
     * The one place the gate is decided. All three conditions must hold, so with
     * the feature flag off — how this ships to production — it is always false
     * and nothing about the app changes. An absent flag reads as "off".
     */
    isGuildGated(): boolean {
        const user = this.currentUser();
        if (!user) return false;
        return user.guildGateEnabled === true && !user.guildMember && !user.guildGateExempt;
    }

    /** The regiment's Discord invite, or null when unconfigured/blank. */
    guildInviteUrl(): string | null {
        return this.currentUser()?.discordInviteUrl?.trim() || null;
    }

    /**
     * Throttled re-check for the route guard (T-0262). Inside the 5-minute window
     * this resolves synchronously with `null` and issues no request, so the guard
     * costs nothing on the navigations between checks. Concurrent callers share
     * one in-flight request.
     */
    refreshGuildStatus(): Observable<GuildStatus | null> {
        // Never probe on behalf of an anonymous visitor — the public site must
        // make no guild-status call at all.
        if (!this.isAuthenticated()) return of(null);
        if (this.guildStatusInFlight) return this.guildStatusInFlight;
        if (Date.now() - this.guildCheckedAt < GUILD_RECHECK_WINDOW_MS) return of(null);
        return this.requestGuildStatus();
    }

    /**
     * Forced re-check behind the gate screen's "I have joined" button (T-0261):
     * the whole point is to bypass the throttle the moment the user says the
     * situation changed. Still collapses onto an in-flight request.
     */
    recheckGuildStatus(): Observable<GuildStatus | null> {
        if (!this.isAuthenticated()) return of(null);
        if (this.guildStatusInFlight) return this.guildStatusInFlight;
        return this.requestGuildStatus();
    }

    /**
     * Replay whatever the gate interrupted (T-0263). An explicitly attempted URL
     * wins; otherwise we re-run the post-login decision, so an applicant still
     * gets the status-vs-apply branch they would originally have had.
     */
    resumeAfterGate(): void {
        const url = this.gateReturnUrl;
        const hint = this.gateReturnIsMemberHint;
        this.gateReturnUrl = null;
        this.gateReturnIsMemberHint = null;
        if (url) {
            this.router.navigateByUrl(url);
            return;
        }
        this.routeAfterLogin(this.currentUser(), hint ?? this.isMember());
    }

    /** Called by guildGuard before it diverts a navigation, so we can replay it. */
    stashGateReturnUrl(url: string): void {
        this.gateReturnUrl = url;
        // An explicit deep link supersedes the generic post-login destination.
        this.gateReturnIsMemberHint = null;
    }

    /**
     * Called by authGuard before it diverts an ANONYMOUS caller to /login, so
     * sign-in returns them to what they were trying to reach (T-0287).
     *
     * `/login` itself is filtered out: it is reachable directly from the public
     * nav, and stashing it would make a successful sign-in navigate back to the
     * sign-in page.
     */
    stashReturnUrl(url: string): void {
        this.returnUrl = url.startsWith('/login') ? null : url;
    }

    /**
     * Issue the request. The timestamp is stamped up front, not on success: a bot
     * outage must not turn every navigation into a doomed retry.
     */
    private requestGuildStatus(): Observable<GuildStatus | null> {
        this.guildCheckedAt = Date.now();
        this.guildStatusInFlight = this.http
            .get<GuildStatus>(`${environment.apiBaseUrl}/auth/guild-status`)
            .pipe(
                timeout(GUILD_STATUS_TIMEOUT_MS),
                tap((status) => this.applyGuildStatus(status)),
                catchError((err: unknown) => {
                    // Fail open, log once: the caller stays exactly where it is.
                    console.warn('Guild status check failed; keeping the last verdict', err);
                    return of(null);
                }),
                finalize(() => (this.guildStatusInFlight = null)),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        return this.guildStatusInFlight;
    }

    /**
     * Fold a fresh verdict into the session. A `degraded` response means the bot
     * could not be reached, so it carries no news — keep the last known verdict
     * rather than acting on a placeholder.
     */
    private applyGuildStatus(status: GuildStatus): void {
        if (status.degraded) return;
        this.currentUser.update((user) =>
            user
                ? {
                      ...user,
                      guildMember: status.guildMember,
                      guildGateEnabled: status.gateEnabled,
                      guildGateExempt: status.exempt,
                  }
                : user,
        );
    }

    /** Drop every guild-gate remnant when the session ends. */
    private resetGuildState(): void {
        this.guildCheckedAt = 0;
        this.guildStatusInFlight = null;
        this.gateReturnUrl = null;
        this.gateReturnIsMemberHint = null;
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

    /**
     * True when the caller has any reason to open the dashboard (T-0287).
     * Shares its definition with `staffGuard` so the nav and the router cannot
     * disagree about who sees a "Dashboard" link that then bounces them.
     */
    isStaff(): boolean {
        return isStaff(this);
    }

    /**
     * The caller's own public profile path.
     *
     * Prefers the vanity handle, exactly as the API's `canonicalPath` does — so
     * a member with a handle is never sent to their short-id URL only to be
     * redirected off it a moment later.
     */
    myProfilePath(): string {
        const user = this.currentUser();
        if (!user) return '/roster';
        return user.username ? `/u/@${user.username}` : `/u/${user.id}`;
    }
}
