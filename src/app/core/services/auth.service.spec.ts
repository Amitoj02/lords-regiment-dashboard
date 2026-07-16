import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Application, MyApplication } from '../models/application.model';
import { RegimentProfile } from '../models/api.model';
import { ApplicationsService } from './applications.service';
import { AuthService, CurrentUser } from './auth.service';
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
                provideHttpClient(),
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

    const flushMe = (over: Partial<CurrentUser>): void => {
        const user: CurrentUser = {
            id: 'u',
            inGameName: 'U',
            rank: null,
            role: 'Member',
            discordTag: null,
            discordLinked: true,
            avatarUrl: null,
            isMember: true,
            capabilities: [],
            ...over,
        };
        httpMock.expectOne(meUrl).flush(user);
    };

    const profile = (setupComplete: boolean): RegimentProfile =>
        ({ setupComplete }) as unknown as RegimentProfile;
    const mine = (application: Application | null): MyApplication => ({
        application,
        blocked: false,
    });

    it('routes an enrolled member to /app/dashboard', () => {
        service.completeLogin('t', true);
        flushMe({ isMember: true, role: 'Member' });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
    });

    it('routes an enrolled Owner straight to /app/dashboard (no first-run setup detour, T-0129)', () => {
        // Even with an incomplete-setup profile available, Owners are not detoured.
        regiment.getProfile.and.returnValue(of(profile(false)));
        service.completeLogin('t', true);
        flushMe({ isMember: true, role: 'Owner' });
        // getProfile is no longer consulted on login (the setup detour was dropped).
        expect(regiment.getProfile).not.toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
    });

    it('routes a returning applicant (has an application) to /onboarding/status', () => {
        applications.getMine.and.returnValue(of(mine({ id: 'a' } as unknown as Application)));
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

    it('applyToJoin sends a signed-in member to /app/dashboard without hitting the API', () => {
        service.currentUser.set({ isMember: true, role: 'Member' } as CurrentUser);
        service.applyToJoin();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
    });

    it('applyToJoin routes a signed-in non-member through their onboarding status', () => {
        applications.getMine.and.returnValue(of(mine({ id: 'a' } as unknown as Application)));
        service.currentUser.set({ isMember: false, role: 'Applicant' } as CurrentUser);
        service.applyToJoin();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding/status');
    });
});
