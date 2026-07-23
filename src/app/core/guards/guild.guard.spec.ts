import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { AuthService, GuildStatus } from '../services/auth.service';
import { guildGuard } from './guild.guard';

type Result = boolean | UrlTree;

interface AuthStub {
    isAuthenticated: () => boolean;
    isGuildGated: () => boolean;
    refreshGuildStatus: () => Observable<GuildStatus | null>;
    stashGateReturnUrl: jasmine.Spy;
}

function stub(over: Partial<AuthStub> = {}): AuthStub {
    return {
        isAuthenticated: () => true,
        isGuildGated: () => false,
        refreshGuildStatus: () => of(null),
        stashGateReturnUrl: jasmine.createSpy('stashGateReturnUrl'),
        ...over,
    };
}

/**
 * Same harness as the other guard specs, plus a subscription: guildGuard is the
 * only asynchronous guard in the app. The result is handed back in a box rather
 * than returned, so the one deliberately-slow case can read the value that
 * arrives after a tick. `undefined` therefore means "has not decided yet".
 */
function runGuard(auth: AuthStub, url = '/app/dashboard'): { value?: Result } {
    // Reset first so a spec may run the guard against more than one URL.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    });
    const box: { value?: Result } = {};
    TestBed.runInInjectionContext(() => {
        const outcome = guildGuard(
            {} as ActivatedRouteSnapshot,
            { url } as RouterStateSnapshot,
        ) as Observable<Result>;
        outcome.subscribe((value) => (box.value = value));
    });
    return box;
}

function serialize(result: Result | undefined): string {
    const router = TestBed.inject(Router);
    return router.serializeUrl(result as UrlTree);
}

describe('guildGuard — Discord guild gate (T-0261/T-0262)', () => {
    it('lets an ungated user through', () => {
        expect(runGuard(stub()).value).toBe(true);
    });

    it('sends a gated user to /guild-required', () => {
        const result = runGuard(stub({ isGuildGated: () => true })).value;
        expect(result).not.toBe(true);
        expect(serialize(result)).toBe('/guild-required');
    });

    it('stashes the attempted URL so the gate can resume it once the verdict flips', () => {
        const auth = stub({ isGuildGated: () => true });
        runGuard(auth, '/app/dashboard/events/42');
        expect(auth.stashGateReturnUrl).toHaveBeenCalledWith('/app/dashboard/events/42');
    });

    // The gate ships flag-off; with the flag off AuthService.isGuildGated() is
    // false for everyone, so the guard is a pass-through.
    it('gates nobody when the feature flag is off', () => {
        const auth = stub({ isGuildGated: () => false });
        expect(runGuard(auth, '/app/admin/settings').value).toBe(true);
        expect(auth.stashGateReturnUrl).not.toHaveBeenCalled();
    });

    it('never asks for a guild status on behalf of an anonymous visitor', () => {
        const refresh = jasmine
            .createSpy('refreshGuildStatus')
            .and.returnValue(of(null as GuildStatus | null));
        const auth = stub({ isAuthenticated: () => false, refreshGuildStatus: refresh });
        expect(runGuard(auth).value).toBe(true);
        expect(refresh).not.toHaveBeenCalled();
    });

    // CONTRACT decision #4 — the account-deletion path in particular is a Discord
    // Developer ToS obligation, so it must survive the gate.
    it('always allows the account-deletion page, gated or not, without a status call', () => {
        const refresh = jasmine
            .createSpy('refreshGuildStatus')
            .and.returnValue(of(null as GuildStatus | null));
        const auth = stub({ isGuildGated: () => true, refreshGuildStatus: refresh });
        expect(runGuard(auth, '/app/account-deletion').value).toBe(true);
        expect(refresh).not.toHaveBeenCalled();
    });

    it("always allows the user's own profile, including with a query string", () => {
        expect(runGuard(stub({ isGuildGated: () => true }), '/app/profile').value).toBe(true);
        expect(runGuard(stub({ isGuildGated: () => true }), '/app/profile?edit=1').value).toBe(
            true,
        );
    });

    it("still gates another member's profile", () => {
        const result = runGuard(stub({ isGuildGated: () => true }), '/app/profile/other-id').value;
        expect(serialize(result)).toBe('/guild-required');
    });

    // Fail open: an unreachable bot must not lock the regiment out of its own app.
    it('leaves the user where they are when the status check errors', () => {
        const auth = stub({
            isGuildGated: () => false,
            refreshGuildStatus: () => throwError(() => new Error('gateway down')),
        });
        expect(runGuard(auth).value).toBe(true);
    });

    it('does not hold a navigation open on a slow status check', fakeAsync(() => {
        // NEVER stands in for a request that has not come back yet.
        const box = runGuard(stub({ refreshGuildStatus: () => NEVER }));
        expect(box.value).toBeUndefined();
        tick(2500);
        // Decided on the verdict already in hand rather than waiting on the wire.
        expect(box.value).toBe(true);
    }));
});
