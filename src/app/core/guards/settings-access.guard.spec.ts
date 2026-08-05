import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { SETTINGS_CAPABILITIES, settingsAccessGuard } from './settings-access.guard';
import { AuthService } from '../services/auth.service';

function runGuard(auth: Partial<AuthService>) {
    TestBed.configureTestingModule({
        providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    });
    return TestBed.runInInjectionContext(() =>
        settingsAccessGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
}

function redirect(result: unknown): string {
    return TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>);
}

describe('settingsAccessGuard (T-0265)', () => {
    it('names exactly the two capabilities that unlock a settings section', () => {
        expect([...SETTINGS_CAPABILITIES]).toEqual(['manage_settings', 'manage_regiment_details']);
    });

    it('allows a caller holding manage_settings', () => {
        const result = runGuard({
            isAuthenticated: () => true,
            hasCapability: (c) => c === 'manage_settings',
        });
        expect(result).toBe(true);
    });

    it('allows a caller holding only manage_regiment_details', () => {
        const result = runGuard({
            isAuthenticated: () => true,
            hasCapability: (c) => c === 'manage_regiment_details',
        });
        expect(result).toBe(true);
    });

    it('redirects a signed-in caller holding neither capability to /app/overview', () => {
        // The bug this guard exists for: a Moderator passes `adminGuard` on role
        // alone and would otherwise reach a panel the API 403s end to end.
        const result = runGuard({ isAuthenticated: () => true, hasCapability: () => false });
        expect(result).not.toBe(true);
        expect(redirect(result)).toBe('/app/overview');
    });

    it('redirects an anonymous caller even when capabilities somehow report true', () => {
        const result = runGuard({ isAuthenticated: () => false, hasCapability: () => true });
        expect(result).not.toBe(true);
        expect(redirect(result)).toBe('/app/overview');
    });
});
