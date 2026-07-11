import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

function runGuard(auth: Partial<AuthService>) {
    TestBed.configureTestingModule({
        providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    });
    return TestBed.runInInjectionContext(() =>
        adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
}

describe('adminGuard', () => {
    it('allows an authenticated admin', () => {
        const result = runGuard({ isAuthenticated: () => true, isAdmin: () => true });
        expect(result).toBe(true);
    });

    it('redirects a signed-in non-admin to /dashboard', () => {
        const result = runGuard({ isAuthenticated: () => true, isAdmin: () => false });
        const router = TestBed.inject(Router);
        expect(result).not.toBe(true);
        expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
            '/dashboard',
        );
    });

    it('redirects an anonymous caller to /dashboard', () => {
        const result = runGuard({ isAuthenticated: () => false, isAdmin: () => false });
        expect(result).not.toBe(true);
    });
});
