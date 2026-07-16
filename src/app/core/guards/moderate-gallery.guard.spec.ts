import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { moderateGalleryGuard } from './moderate-gallery.guard';
import { AuthService } from '../services/auth.service';

function runGuard(auth: Partial<AuthService>) {
    TestBed.configureTestingModule({
        providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    });
    return TestBed.runInInjectionContext(() =>
        moderateGalleryGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
}

describe('moderateGalleryGuard', () => {
    it('allows an authenticated caller with moderate_gallery', () => {
        const result = runGuard({
            isAuthenticated: () => true,
            hasCapability: (c) => c === 'moderate_gallery',
        });
        expect(result).toBe(true);
    });

    it('redirects a non-moderator to /app/dashboard', () => {
        const result = runGuard({ isAuthenticated: () => true, hasCapability: () => false });
        const router = TestBed.inject(Router);
        expect(result).not.toBe(true);
        expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
            '/app/dashboard',
        );
    });

    it('redirects an anonymous caller', () => {
        const result = runGuard({ isAuthenticated: () => false, hasCapability: () => true });
        expect(result).not.toBe(true);
    });
});
