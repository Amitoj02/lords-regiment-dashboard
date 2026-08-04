import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

function runGuard(auth: Partial<AuthService>, url = '/account') {
    TestBed.configureTestingModule({
        providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    });
    return TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
}

/** The guard calls this on every refusal, so every stub needs it. */
function stub(overrides: Partial<AuthService> = {}): Partial<AuthService> {
    return { stashReturnUrl: jasmine.createSpy('stashReturnUrl'), ...overrides };
}

describe('authGuard', () => {
    it('allows an authenticated caller', () => {
        const result = runGuard(stub({ isAuthenticated: () => true }));
        expect(result).toBe(true);
    });

    it('redirects an anonymous caller to /login', () => {
        const result = runGuard(stub({ isAuthenticated: () => false }));
        const router = TestBed.inject(Router);
        expect(result).not.toBe(true);
        expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/login');
    });

    // T-0287: without this, "Sign in to RSVP" on a public event page deposits the
    // member on their profile with no way back to the event they were reading.
    it('stashes the attempted URL so sign-in can return there', () => {
        const auth = stub({ isAuthenticated: () => false });
        runGuard(auth, '/events/aB3x9KqLm2Zt');
        expect(auth.stashReturnUrl).toHaveBeenCalledWith('/events/aB3x9KqLm2Zt');
    });
});
