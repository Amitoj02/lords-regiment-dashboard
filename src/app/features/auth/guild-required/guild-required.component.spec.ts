import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService, GuildStatus } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { GuildRequiredComponent } from './guild-required.component';

describe('GuildRequiredComponent — the Discord guild gate (T-0261)', () => {
    let fixture: ComponentFixture<GuildRequiredComponent>;
    let component: GuildRequiredComponent;
    let auth: jasmine.SpyObj<AuthService>;
    let toast: jasmine.SpyObj<ToastService>;
    let recheck$: Subject<GuildStatus | null>;
    let gated: boolean;

    function setup(invite: string | null = 'https://discord.gg/lords', startsGated = true): void {
        gated = startsGated;
        recheck$ = new Subject<GuildStatus | null>();
        auth = jasmine.createSpyObj<AuthService>('AuthService', [
            'isGuildGated',
            'guildInviteUrl',
            'recheckGuildStatus',
            'resumeAfterGate',
            'logout',
        ]);
        // A live predicate, not a fixed value: the whole screen turns on the
        // verdict changing underneath it.
        auth.isGuildGated.and.callFake(() => gated);
        auth.guildInviteUrl.and.returnValue(invite);
        auth.recheckGuildStatus.and.returnValue(recheck$.asObservable());
        toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);

        TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [GuildRequiredComponent],
            providers: [
                { provide: AuthService, useValue: auth },
                { provide: ToastService, useValue: toast },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(GuildRequiredComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    const el = (selector: string): HTMLElement | null =>
        fixture.nativeElement.querySelector(selector);

    const settle = (status: GuildStatus | null): void => {
        recheck$.next(status);
        recheck$.complete();
        fixture.detectChanges();
    };

    const verdict = (over: Partial<GuildStatus> = {}): GuildStatus => ({
        guildMember: false,
        gateEnabled: true,
        exempt: false,
        checkedAt: null,
        degraded: false,
        ...over,
    });

    // ── The Discord CTA ───────────────────────────────────────────────────────

    it('offers the configured invite as an external link', () => {
        setup('https://discord.gg/lords');
        const join = el('.gate-join') as HTMLAnchorElement | null;
        expect(join).not.toBeNull();
        expect(join!.getAttribute('href')).toBe('https://discord.gg/lords');
        expect(join!.getAttribute('target')).toBe('_blank');
        expect(join!.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('hides the Join button and explains why when no invite is configured', () => {
        setup(null);
        expect(el('.gate-join')).toBeNull();
        // A dead end without an explanation is the failure mode being prevented.
        expect(el('.gate-invite-fallback')).not.toBeNull();
        expect(el('.gate-invite-fallback')!.textContent).toContain('officer');
    });

    // ── The re-check ──────────────────────────────────────────────────────────

    it('lets the user through the moment the verdict flips', () => {
        setup();
        component.recheck();
        gated = false;
        settle(verdict({ guildMember: true }));
        expect(auth.resumeAfterGate).toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('keeps the user here and says so when the verdict is still false', () => {
        setup();
        component.recheck();
        settle(verdict());
        expect(auth.resumeAfterGate).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalled();
        expect(toast.error.calls.mostRecent().args[0]).toContain('still cannot see you');
    });

    it('distinguishes an unreachable Discord from a negative verdict', () => {
        setup();
        component.recheck();
        settle(verdict({ degraded: true }));
        expect(auth.resumeAfterGate).not.toHaveBeenCalled();
        expect(toast.error.calls.mostRecent().args[0]).toContain('could not reach Discord');
    });

    it('disables the button and announces the check while it is in flight', () => {
        setup();
        (el('.gate-recheck') as HTMLButtonElement).click();
        fixture.detectChanges();

        const button = el('.gate-recheck') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
        expect(button.getAttribute('aria-busy')).toBe('true');
        // The spinner is decorative, so the live region carries the news.
        expect(el('.gate-spinner')).not.toBeNull();
        expect(el('.gate-status')!.textContent!.trim()).toContain('Checking');

        gated = false;
        settle(verdict({ guildMember: true }));
        expect(auth.resumeAfterGate).toHaveBeenCalled();
    });

    it('collapses a double-click into a single check', () => {
        setup();
        component.recheck();
        component.recheck();
        expect(auth.recheckGuildStatus).toHaveBeenCalledTimes(1);
    });

    // ── Who may see this screen at all ────────────────────────────────────────

    it('does not park a user who is not actually gated', () => {
        setup('https://discord.gg/lords', false);
        expect(auth.resumeAfterGate).toHaveBeenCalled();
    });

    it('keeps a genuinely gated user here', () => {
        setup();
        expect(auth.resumeAfterGate).not.toHaveBeenCalled();
    });

    // ── The escape hatches (CONTRACT decision #4) ─────────────────────────────

    it('offers a sign-out escape hatch', () => {
        setup();
        (el('.gate-signout') as HTMLButtonElement).click();
        expect(auth.logout).toHaveBeenCalled();
    });

    it('keeps the profile, account-deletion and legal pages reachable', () => {
        setup();
        const links = Array.from(
            fixture.nativeElement.querySelectorAll('.gate-links a'),
        ) as HTMLAnchorElement[];
        const targets = links.map((a) => a.getAttribute('routerLink'));
        expect(targets).toContain('/app/profile');
        // Discord's Developer ToS requires this one to stay reachable.
        expect(targets).toContain('/app/account-deletion');
        expect(targets).toContain('/terms');
        expect(targets).toContain('/privacy');
        expect(targets).toContain('/guidelines');
    });

    // A sidebar full of links back into the gated routes would defeat the gate.
    it('renders no app shell', () => {
        setup();
        expect(el('hf-app-shell')).toBeNull();
    });
});
