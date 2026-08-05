import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApplicantApplication, MyApplication } from '../models/application.model';
import { RegimentProfile } from '../models/api.model';
import { ApplicationsService } from './applications.service';
import { AuthService, CurrentUser, GuildStatus } from './auth.service';
import { RegimentService } from './regiment.service';

/**
 * Pins the post-login routing branches (T-0027/T-0030/T-0037), which all share
 * the same login redirect path — the flagged regression surface.
 */
describe('AuthService post-login routing', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    let router: jasmine.SpyObj<Router>;
    let applications: jasmine.SpyObj<ApplicationsService>;
    let regiment: jasmine.SpyObj<RegimentService>;

    const meUrl = `${environment.apiBaseUrl}/auth/me`;

    beforeEach(() => {
        router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        applications = jasmine.createSpyObj('ApplicationsService', ['getMine']);
        regiment = jasmine.createSpyObj('RegimentService', ['getProfile']);
        TestBed.configureTestingModule({
            providers: [
                AuthService,
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: Router, useValue: router },
                { provide: ApplicationsService, useValue: applications },
                { provide: RegimentService, useValue: regiment },
            ],
        });
        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
        localStorage.removeItem('lords_access_token');
    });

    afterEach(() => httpMock.verify());

    // Guild-gate defaults mirror how the feature ships: flag OFF, so every
    // pre-existing routing expectation below is unaffected by its arrival.
    const flushMe = (over: Partial<CurrentUser>): void => {
        const user: CurrentUser = {
            id: 'u',
            inGameName: 'U',
            username: null,
            rank: null,
            role: 'Member',
            discordTag: null,
            discordLinked: true,
            avatarUrl: null,
            isMember: true,
            capabilities: [],
            guildMember: true,
            discordInviteUrl: null,
            guildGateEnabled: false,
            guildGateExempt: false,
            ...over,
        };
        httpMock.expectOne(meUrl).flush(user);
    };

    const profile = (setupComplete: boolean): RegimentProfile =>
        ({ setupComplete }) as unknown as RegimentProfile;
    const mine = (application: ApplicantApplication | null): MyApplication => ({
        application,
        blocked: false,
    });

    // T-0287: the dashboard is staff-only, so an ordinary member sent there
    // would be bounced straight back off staffGuard. They land on their own
    // public profile instead — at the SHORT-ID path, because this member has no
    // vanity handle to prefer.
    it('routes an enrolled member with no handle to their short-id profile', () => {
        service.completeLogin('t', true);
        flushMe({ isMember: true, role: 'Member', id: 'aB3x9KqLm2Zt' });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/u/aB3x9KqLm2Zt');
    });

    it('prefers the vanity handle when the member has claimed one', () => {
        service.completeLogin('t', true);
        flushMe({ isMember: true, role: 'Member', username: 'panda' });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/u/@panda');
    });

    it('routes a STAFF member to the console instead', () => {
        service.completeLogin('t', true);
        flushMe({ isMember: true, role: 'Moderator', capabilities: ['manage_applications'] });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/app');
    });

    it('routes an enrolled Owner straight to the console (no first-run setup detour, T-0129)', () => {
        // Even with an incomplete-setup profile available, Owners are not detoured.
        regiment.getProfile.and.returnValue(of(profile(false)));
        service.completeLogin('t', true);
        flushMe({ isMember: true, role: 'Owner', capabilities: ['manage_settings'] });
        // getProfile is no longer consulted on login (the setup detour was dropped).
        expect(regiment.getProfile).not.toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/app');
    });

    it('routes a returning applicant (has an application) to /onboarding/status', () => {
        applications.getMine.and.returnValue(
            of(mine({ id: 'a' } as unknown as ApplicantApplication)),
        );
        service.completeLogin('t', false);
        flushMe({ isMember: false, role: 'Applicant' });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding/status');
    });

    it('routes a brand-new applicant (no application) to /onboarding/apply', () => {
        applications.getMine.and.returnValue(of(mine(null)));
        service.completeLogin('t', false);
        flushMe({ isMember: false, role: 'Applicant' });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding/apply');
    });

    it('applyToJoin sends a signed-in member to their profile without hitting the API', () => {
        service.currentUser.set({
            isMember: true,
            role: 'Member',
            id: 'aB3x9KqLm2Zt',
            username: null,
        } as CurrentUser);
        service.applyToJoin();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/u/aB3x9KqLm2Zt');
    });

    it('applyToJoin routes a signed-in non-member through their onboarding status', () => {
        applications.getMine.and.returnValue(
            of(mine({ id: 'a' } as unknown as ApplicantApplication)),
        );
        service.currentUser.set({ isMember: false, role: 'Applicant' } as CurrentUser);
        service.applyToJoin();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding/status');
    });

    // ── T-0263: the gate diverts post-login routing for BOTH projections ───────

    it('routes a gated member to /guild-required instead of the dashboard (T-0263)', () => {
        service.completeLogin('t', true);
        flushMe({ isMember: true, guildGateEnabled: true, guildMember: false });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/guild-required');
        expect(router.navigateByUrl).not.toHaveBeenCalledWith('/u/u');
    });

    it('routes a gated applicant to /guild-required without looking up their application', () => {
        service.completeLogin('t', false);
        flushMe({
            isMember: false,
            role: 'Applicant',
            guildGateEnabled: true,
            guildMember: false,
        });
        expect(applications.getMine).not.toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/guild-required');
    });

    it('never gates a caller whose /auth/me failed — a null projection is no verdict', () => {
        applications.getMine.and.returnValue(of(mine(null)));
        service.completeLogin('t', false);
        httpMock.expectOne(meUrl).flush('nope', { status: 500, statusText: 'Server Error' });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding/apply');
    });

    it('does not gate a manage_settings holder (exempt, CONTRACT decision #2)', () => {
        service.completeLogin('t', true);
        flushMe({
            isMember: true,
            guildGateEnabled: true,
            guildMember: false,
            guildGateExempt: true,
        });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/u/u');
    });

    it('does not gate anyone while the feature flag is off, even outside the guild', () => {
        service.completeLogin('t', true);
        flushMe({ isMember: true, guildGateEnabled: false, guildMember: false });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/u/u');
    });

    it('applyToJoin sends a gated non-member to the gate rather than the form', () => {
        service.currentUser.set({
            isMember: false,
            role: 'Applicant',
            guildGateEnabled: true,
            guildMember: false,
        } as CurrentUser);
        service.applyToJoin();
        expect(applications.getMine).not.toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/guild-required');
    });

    // ── T-0263: resuming the destination the gate interrupted ─────────────────

    it('resumeAfterGate replays the destination a gated member was headed for', () => {
        service.completeLogin('t', true);
        flushMe({ isMember: true, guildGateEnabled: true, guildMember: false });
        // The user joins the server and the re-check flips the verdict.
        service.currentUser.update((u) => ({ ...u!, guildMember: true }));
        service.resumeAfterGate();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/u/u');
    });

    it('resumeAfterGate replays the applicant branch, status page and all', () => {
        applications.getMine.and.returnValue(
            of(mine({ id: 'a' } as unknown as ApplicantApplication)),
        );
        service.completeLogin('t', false);
        flushMe({
            isMember: false,
            role: 'Applicant',
            guildGateEnabled: true,
            guildMember: false,
        });
        service.currentUser.update((u) => ({ ...u!, guildMember: true }));
        service.resumeAfterGate();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding/status');
    });

    it('resumeAfterGate prefers the deep link the guard stashed over the login default', () => {
        service.currentUser.set({ isMember: true, role: 'Member' } as CurrentUser);
        service.stashGateReturnUrl('/app/events/42');
        service.resumeAfterGate();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/app/events/42');
    });

    it('resumeAfterGate consumes the stash, so a second call does not replay it', () => {
        service.currentUser.set({
            isMember: true,
            role: 'Member',
            id: 'u',
            username: null,
        } as CurrentUser);
        service.stashGateReturnUrl('/roster');
        service.resumeAfterGate();
        service.resumeAfterGate();
        expect(router.navigateByUrl.calls.allArgs()).toEqual([['/roster'], ['/u/u']]);
    });

    // ── T-0287: the anonymous return URL, separate from the gate's ────────────

    it('replays the URL authGuard stashed, ahead of the post-login default', () => {
        service.stashReturnUrl('/events/aB3x9KqLm2Zt');
        service.completeLogin('t', true);
        flushMe({ isMember: true, role: 'Member' });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/events/aB3x9KqLm2Zt');
    });

    it('never stashes /login itself — that would loop the sign-in back on itself', () => {
        service.stashReturnUrl('/login');
        service.completeLogin('t', true);
        flushMe({ isMember: true, role: 'Member' });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/u/u');
    });
});

/**
 * The guild verdict and its client-side throttle (T-0262). The point of the
 * throttle is that entering the authenticated app costs at most one Discord
 * lookup per window, however many times the guard runs.
 */
describe('AuthService guild-membership gate (T-0261/T-0262)', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    let router: jasmine.SpyObj<Router>;

    const statusUrl = `${environment.apiBaseUrl}/auth/guild-status`;
    const WINDOW_MS = 5 * 60 * 1000;

    beforeEach(() => {
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date('2026-07-22T10:00:00Z'));
        router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        TestBed.configureTestingModule({
            providers: [
                AuthService,
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: Router, useValue: router },
                {
                    provide: ApplicationsService,
                    useValue: jasmine.createSpyObj('ApplicationsService', ['getMine']),
                },
                {
                    provide: RegimentService,
                    useValue: jasmine.createSpyObj('RegimentService', ['getProfile']),
                },
            ],
        });
        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
        localStorage.removeItem('lords_access_token');
    });

    afterEach(() => {
        httpMock.verify();
        jasmine.clock().uninstall();
    });

    const signIn = (over: Partial<CurrentUser> = {}): void => {
        service.currentUser.set({
            id: 'u',
            inGameName: 'U',
            username: null,
            rank: null,
            role: 'Member',
            discordTag: null,
            discordLinked: true,
            avatarUrl: null,
            isMember: true,
            capabilities: [],
            guildMember: true,
            discordInviteUrl: null,
            guildGateEnabled: true,
            guildGateExempt: false,
            ...over,
        });
    };

    const status = (over: Partial<GuildStatus> = {}): GuildStatus => ({
        guildMember: true,
        gateEnabled: true,
        exempt: false,
        checkedAt: '2026-07-22T09:59:00Z',
        degraded: false,
        ...over,
    });

    // ── The verdict itself ────────────────────────────────────────────────────

    it('gates only when the flag is on, the user is outside the guild and not exempt', () => {
        signIn({ guildGateEnabled: true, guildMember: false, guildGateExempt: false });
        expect(service.isGuildGated()).toBe(true);
    });

    it('gates nobody while the flag is off — how the feature ships', () => {
        signIn({ guildGateEnabled: false, guildMember: false });
        expect(service.isGuildGated()).toBe(false);
    });

    it('never gates an exempt (manage_settings) caller', () => {
        signIn({ guildGateEnabled: true, guildMember: false, guildGateExempt: true });
        expect(service.isGuildGated()).toBe(false);
    });

    it('never gates a signed-out visitor', () => {
        service.currentUser.set(null);
        expect(service.isGuildGated()).toBe(false);
    });

    // An API predating the gate omits the fields entirely; that must read as "off".
    it('treats a projection without the gate fields as ungated', () => {
        service.currentUser.set({ isMember: true, role: 'Member' } as CurrentUser);
        expect(service.isGuildGated()).toBe(false);
    });

    it('exposes a blank invite URL as null so the CTA can be hidden', () => {
        signIn({ discordInviteUrl: '   ' });
        expect(service.guildInviteUrl()).toBeNull();
        signIn({ discordInviteUrl: ' https://discord.gg/lords ' });
        expect(service.guildInviteUrl()).toBe('https://discord.gg/lords');
    });

    // ── The throttle ──────────────────────────────────────────────────────────

    it('issues one request for five navigations inside the throttle window', () => {
        signIn();
        for (let i = 0; i < 5; i++) service.refreshGuildStatus().subscribe();
        const inFlight = httpMock.match(statusUrl);
        expect(inFlight.length).toBe(1);
        inFlight[0].flush(status());

        // Still inside the window once it has landed.
        jasmine.clock().tick(WINDOW_MS - 1);
        service.refreshGuildStatus().subscribe();
        expect(httpMock.match(statusUrl).length).toBe(0);
    });

    it('asks again once the throttle window has elapsed', () => {
        signIn();
        service.refreshGuildStatus().subscribe();
        httpMock.expectOne(statusUrl).flush(status());
        jasmine.clock().tick(WINDOW_MS + 1);
        service.refreshGuildStatus().subscribe();
        const second = httpMock.match(statusUrl);
        expect(second.length).toBe(1);
        second[0].flush(status());
    });

    it('makes no request at all for an unauthenticated visitor', () => {
        service.currentUser.set(null);
        service.refreshGuildStatus().subscribe();
        expect(httpMock.match(statusUrl).length).toBe(0);
    });

    // /auth/me carries the same verdict, so hydration opens the window.
    it('does not re-ask straight after /auth/me has just answered', () => {
        service.loadCurrentUser().subscribe();
        httpMock.expectOne(`${environment.apiBaseUrl}/auth/me`).flush({
            id: 'u',
            isMember: true,
            role: 'Member',
            capabilities: [],
            guildMember: true,
            guildGateEnabled: true,
            guildGateExempt: false,
            discordInviteUrl: null,
        });
        service.refreshGuildStatus().subscribe();
        expect(httpMock.match(statusUrl).length).toBe(0);
    });

    it('the gate screen re-check bypasses the throttle', () => {
        signIn();
        service.refreshGuildStatus().subscribe();
        httpMock.expectOne(statusUrl).flush(status());
        // No clock movement: the user has just told us the situation changed.
        service.recheckGuildStatus().subscribe();
        const forced = httpMock.match(statusUrl);
        expect(forced.length).toBe(1);
        forced[0].flush(status());
    });

    // ── Applying (and refusing to apply) a verdict ────────────────────────────

    it('folds a fresh verdict into the session, flipping the gate on', () => {
        signIn({ guildMember: true });
        service.refreshGuildStatus().subscribe();
        httpMock.expectOne(statusUrl).flush(status({ guildMember: false }));
        expect(service.isGuildGated()).toBe(true);
    });

    it('lets a user straight through the moment the verdict flips back', () => {
        signIn({ guildMember: false });
        expect(service.isGuildGated()).toBe(true);
        service.recheckGuildStatus().subscribe();
        httpMock.expectOne(statusUrl).flush(status({ guildMember: true }));
        expect(service.isGuildGated()).toBe(false);
    });

    it('ignores a degraded verdict — it is "we could not ask", not "you are out"', () => {
        signIn({ guildMember: true });
        service.refreshGuildStatus().subscribe();
        httpMock.expectOne(statusUrl).flush(status({ guildMember: false, degraded: true }));
        expect(service.isGuildGated()).toBe(false);
    });

    it('leaves the user in place when the check fails outright', () => {
        signIn({ guildMember: true });
        let emitted: GuildStatus | null | undefined;
        service.refreshGuildStatus().subscribe((value) => (emitted = value));
        httpMock.expectOne(statusUrl).flush('bot down', { status: 502, statusText: 'Bad Gateway' });
        expect(emitted).toBeNull();
        expect(service.isGuildGated()).toBe(false);
        expect(service.currentUser()).not.toBeNull();
    });

    it('drops the verdict and its throttle on logout, so a new session re-checks', () => {
        signIn();
        service.refreshGuildStatus().subscribe();
        httpMock.expectOne(statusUrl).flush(status());
        service.logout();
        httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`).flush({});

        signIn();
        service.refreshGuildStatus().subscribe();
        const afterLogout = httpMock.match(statusUrl);
        expect(afterLogout.length).toBe(1);
        afterLogout[0].flush(status());
    });
});
