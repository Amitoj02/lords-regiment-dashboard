import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { onboardingGuard } from './onboarding.guard';
import { AuthService } from '../services/auth.service';

function runGuard(auth: Partial<AuthService>) {
    TestBed.configureTestingModule({
        providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    });
    return TestBed.runInInjectionContext(() =>
        onboardingGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
}

describe('onboardingGuard', () => {
    it('allows an authenticated non-member (an applicant)', () => {
        const result = runGuard({ isAuthenticated: () => true, isMember: () => false });
        expect(result).toBe(true);
    });

    it('redirects an already-enrolled member to /home', () => {
        const result = runGuard({ isAuthenticated: () => true, isMember: () => true });
        const router = TestBed.inject(Router);
        expect(result).not.toBe(true);
        expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/home');
    });

    it('redirects an anonymous caller to /login', () => {
        const result = runGuard({ isAuthenticated: () => false, isMember: () => false });
        const router = TestBed.inject(Router);
        expect(result).not.toBe(true);
        expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/login');
    });
});
