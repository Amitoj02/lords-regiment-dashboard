import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { manageEventsGuard } from './manage-events.guard';
import { AuthService } from '../services/auth.service';

function runGuard(auth: Partial<AuthService>) {
    TestBed.configureTestingModule({
        providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    });
    return TestBed.runInInjectionContext(() =>
        manageEventsGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
}

describe('manageEventsGuard', () => {
    it('allows an authenticated caller with manage_events', () => {
        const result = runGuard({
            isAuthenticated: () => true,
            hasCapability: (c) => c === 'manage_events',
        });
        expect(result).toBe(true);
    });

    it('redirects a signed-in caller lacking manage_events to /events', () => {
        const result = runGuard({ isAuthenticated: () => true, hasCapability: () => false });
        const router = TestBed.inject(Router);
        expect(result).not.toBe(true);
        expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/events');
    });

    it('redirects an anonymous caller', () => {
        const result = runGuard({ isAuthenticated: () => false, hasCapability: () => true });
        expect(result).not.toBe(true);
    });
});
