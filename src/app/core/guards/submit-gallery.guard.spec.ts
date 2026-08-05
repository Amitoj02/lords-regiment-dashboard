import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { submitGalleryGuard } from './submit-gallery.guard';
import { AuthService } from '../services/auth.service';

function runGuard(auth: Partial<AuthService>) {
    TestBed.configureTestingModule({
        providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    });
    return TestBed.runInInjectionContext(() =>
        submitGalleryGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
}

describe('submitGalleryGuard', () => {
    it('allows an authenticated member with submit_to_gallery', () => {
        const result = runGuard({
            isAuthenticated: () => true,
            hasCapability: (c) => c === 'submit_to_gallery',
        });
        expect(result).toBe(true);
    });

    it('redirects a caller lacking submit_to_gallery (e.g. a mercenary) to /gallery', () => {
        const result = runGuard({ isAuthenticated: () => true, hasCapability: () => false });
        const router = TestBed.inject(Router);
        expect(result).not.toBe(true);
        expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/gallery');
    });

    it('redirects an anonymous caller', () => {
        const result = runGuard({ isAuthenticated: () => false, hasCapability: () => true });
        expect(result).not.toBe(true);
    });
});
