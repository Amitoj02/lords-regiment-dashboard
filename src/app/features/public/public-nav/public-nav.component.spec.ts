import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { RegimentProfile } from '../../../core/models/api.model';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { PublicNavComponent } from './public-nav.component';

/**
 * The public topbar CTA is auth-aware (T-004x): a member is offered the
 * dashboard, an applicant their status page, and an anonymous visitor the
 * original Join Discord + Sign in pair. These specs flip the mocked
 * AuthService.currentUser signal and assert the CTA labels + targets follow.
 *
 * The Join Discord CTA is also profile-driven (T-0234): it points at the
 * regiment's configured invite, and disappears when there isn't one.
 */
class MockAuthService {
    readonly currentUser = signal<CurrentUser | null>(null);
    readonly logout = jasmine.createSpy('logout');
    isAuthenticated(): boolean {
        return this.currentUser() !== null;
    }
    isMember(): boolean {
        return this.currentUser()?.isMember ?? false;
    }
}

function makeUser(isMember: boolean): CurrentUser {
    return {
        id: 'u1',
        inGameName: 'Test User',
        rank: null,
        role: isMember ? 'Member' : 'Applicant',
        discordTag: null,
        discordLinked: true,
        avatarUrl: null,
        isMember,
        capabilities: [],
        // The gate is off in these specs, so the session behaves exactly as it
        // did before T-0261 (CONTRACT §1 — the API never omits these four).
        guildMember: true,
        discordInviteUrl: null,
        guildGateEnabled: false,
        guildGateExempt: false,
    };
}

function makeProfile(discordInviteUrl: string | null): RegimentProfile {
    return {
        id: 'r1',
        name: 'Lord Regiment',
        missionStatement: null,
        accentTone: 'brass',
        crestUrl: null,
        bannerUrl: null,
        establishedYear: 2019,
        establishedAt: null,
        discordInviteUrl,
        discordServerName: null,
        setupComplete: true,
        memberCount: 42,
    };
}

describe('PublicNavComponent (auth-aware CTA)', () => {
    let fixture: ComponentFixture<PublicNavComponent>;
    let auth: MockAuthService;
    /** Read lazily by the mock, so a spec can swap it before the first CD. */
    let profile$: Observable<RegimentProfile | null>;

    beforeEach(async () => {
        auth = new MockAuthService();
        // Default: an invite IS configured, which is the shipped production state.
        profile$ = of(makeProfile('https://discord.gg/lords'));
        await TestBed.configureTestingModule({
            imports: [CommonModule, RouterModule.forRoot([])],
            declarations: [PublicNavComponent],
            providers: [
                { provide: AuthService, useValue: auth },
                { provide: RegimentService, useValue: { getProfile: () => profile$ } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PublicNavComponent);
    });

    /** The CTA cluster on the right of the bar. */
    function cta(): HTMLElement {
        return fixture.nativeElement.querySelector('.public-nav-cta') as HTMLElement;
    }
    function ctaText(): string {
        return (cta().textContent ?? '').replace(/\s+/g, ' ').trim();
    }
    function hrefs(): string[] {
        return Array.from(cta().querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    }
    /** The Discord invite anchor, or null when it is absent from the DOM. */
    function discordLink(): HTMLAnchorElement | null {
        return cta().querySelector('.public-nav-discord');
    }

    it('shows Join Discord + Sign in for an anonymous visitor', () => {
        fixture.detectChanges();
        expect(ctaText()).toContain('Join Discord');
        expect(ctaText()).toContain('Sign in');
        expect(ctaText()).not.toContain('Sign out');
        expect(hrefs()).toContain('/login');
    });

    it('offers the Dashboard + Sign out for a signed-in member', () => {
        auth.currentUser.set(makeUser(true));
        fixture.detectChanges();
        expect(ctaText()).toContain('Dashboard');
        expect(ctaText()).toContain('Sign out');
        expect(ctaText()).not.toContain('Sign in');
        expect(hrefs()).toContain('/app/dashboard');
    });

    it('routes a signed-in applicant to their status page (not /login)', () => {
        auth.currentUser.set(makeUser(false));
        fixture.detectChanges();
        expect(ctaText()).toContain('My Application');
        expect(ctaText()).toContain('Sign out');
        expect(hrefs()).toContain('/onboarding/status');
        expect(hrefs()).not.toContain('/login');
    });

    it('signOut() delegates to AuthService.logout and closes the menu', () => {
        fixture.detectChanges();
        fixture.componentInstance.menuOpen = true;
        fixture.componentInstance.signOut();
        expect(auth.logout).toHaveBeenCalled();
        expect(fixture.componentInstance.menuOpen).toBe(false);
    });

    describe('Join Discord CTA (T-0234)', () => {
        it('points at the configured invite and opens it safely in a new tab', () => {
            fixture.detectChanges();
            const link = discordLink();
            expect(link).not.toBeNull();
            expect(link!.getAttribute('href')).toBe('https://discord.gg/lords');
            expect(link!.getAttribute('target')).toBe('_blank');
            // Prevents the opened tab from reaching back through window.opener.
            expect(link!.getAttribute('rel')).toBe('noopener noreferrer');
        });

        it('hides the CTA entirely when no invite is configured', () => {
            profile$ = of(makeProfile(null));
            fixture.detectChanges();
            expect(discordLink()).toBeNull();
            expect(ctaText()).not.toContain('Join Discord');
            // …and never leaves a dead link behind in its place.
            expect(hrefs()).toEqual(['/login']);
        });

        it('treats a blank invite as unconfigured', () => {
            profile$ = of(makeProfile('   '));
            fixture.detectChanges();
            expect(discordLink()).toBeNull();
        });

        it('hides the CTA when the profile fetch fails rather than breaking the bar', () => {
            profile$ = throwError(() => new Error('network'));
            fixture.detectChanges();
            expect(discordLink()).toBeNull();
            expect(ctaText()).toContain('Sign in');
        });

        it('closes the mobile menu when the invite is followed', () => {
            fixture.detectChanges();
            fixture.componentInstance.menuOpen = true;
            const link = discordLink()!;
            // Suppress the real navigation the karma runner would otherwise
            // attempt; the binding under test has already run by then.
            link.addEventListener('click', (e) => e.preventDefault());
            // The anchor opens another tab; the collapsed menu must not be left
            // hanging open behind it.
            link.click();
            expect(fixture.componentInstance.menuOpen).toBe(false);
        });
    });
});
