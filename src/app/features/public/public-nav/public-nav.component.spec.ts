import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { RegimentProfile } from '../../../core/models/api.model';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { PublicNavComponent } from './public-nav.component';

/**
 * The public topbar CTA is auth-aware (T-004x): a member is offered their own
 * profile, an applicant their status page, and an anonymous visitor the
 * original Join Discord + Sign in pair. These specs flip the mocked
 * AuthService.currentUser signal and assert the CTA labels + targets follow.
 *
 * The Dashboard button is STAFF-only since T-0287: `/app` is behind staffGuard,
 * so offering it to an ordinary member would be a button that bounces them.
 *
 * The Join Discord CTA is also profile-driven (T-0234): it points at the
 * regiment's configured invite, and disappears when there isn't one.
 */
class MockAuthService {
    readonly currentUser = signal<CurrentUser | null>(null);
    readonly logout = jasmine.createSpy('logout');
    /** Flipped per-spec — staff is a capability verdict, not a role (T-0287). */
    staff = false;
    isAuthenticated(): boolean {
        return this.currentUser() !== null;
    }
    isMember(): boolean {
        return this.currentUser()?.isMember ?? false;
    }
    isStaff(): boolean {
        return this.staff;
    }
    myProfilePath(): string {
        const user = this.currentUser();
        if (!user) return '/roster';
        return user.username ? `/u/@${user.username}` : `/u/${user.id}`;
    }
}

function makeUser(isMember: boolean, username: string | null = null): CurrentUser {
    return {
        id: 'u1',
        inGameName: 'Test User',
        username,
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
            // hf-avatar is a SharedModule component; the bar under test is the
            // markup around it, not the initials tile inside it.
            schemas: [NO_ERRORS_SCHEMA],
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
    /** The primary destination links, in render order. */
    function navAnchors(): HTMLAnchorElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('.public-nav-links > a.nav-link'));
    }

    it('shows Join Discord + Sign in for an anonymous visitor', () => {
        fixture.detectChanges();
        expect(ctaText()).toContain('Join Discord');
        expect(ctaText()).toContain('Sign in');
        expect(ctaText()).not.toContain('Sign out');
        expect(hrefs()).toContain('/login');
    });

    it('routes a signed-in applicant to their status page (not /login)', () => {
        auth.currentUser.set(makeUser(false));
        fixture.detectChanges();
        expect(ctaText()).toContain('My application');
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

    /**
     * The roster is the flagship public page — and Home points at `/home`, not
     * `/`, because the root route redirects there and a `/` link would light up
     * for nobody once the redirect has rewritten the URL.
     */
    describe('destinations (T-0287)', () => {
        it('offers Roster between Home and Events', () => {
            fixture.detectChanges();
            expect(navAnchors().map((a) => (a.textContent ?? '').trim())).toEqual([
                'Home',
                'Roster',
                'Events',
                'Gallery',
            ]);
            expect(navAnchors().map((a) => a.getAttribute('href'))).toEqual([
                '/home',
                '/roster',
                '/events',
                '/gallery',
            ]);
        });

        it('matches Home exactly and every other entry as a prefix', () => {
            // `/events/:id` and `/gallery/:id` must keep their parent lit; Home
            // would otherwise be lit on every page in the site.
            const byLabel = new Map(
                fixture.componentInstance.navLinks.map((l) => [l.label, l] as const),
            );
            expect(byLabel.get('Home')!.exact).toBeTrue();
            expect(byLabel.get('Roster')!.exact).toBeFalse();
            expect(byLabel.get('Events')!.exact).toBeFalse();
            expect(byLabel.get('Gallery')!.exact).toBeFalse();
        });

        it('keeps every destination and CTA inside the collapsible drawer', () => {
            // On mobile `.public-nav-links` IS the drawer, so anything actionable
            // rendered outside it would be unreachable behind the closed burger.
            auth.currentUser.set(makeUser(true));
            auth.staff = true;
            fixture.detectChanges();
            const panel = fixture.nativeElement.querySelector('.public-nav-links') as HTMLElement;
            expect(panel.contains(cta())).toBeTrue();
            const outside = Array.from<HTMLElement>(
                fixture.nativeElement.querySelectorAll('a, button'),
            ).filter((el) => !panel.contains(el));
            expect(outside.map((el) => el.className)).toEqual(['public-nav-burger']);
        });
    });

    /**
     * `/app` is staff-only (T-0287). The Dashboard button must therefore track
     * `isStaff()` — the same verdict staffGuard reads — and every enrolled
     * member gets a link to their own PUBLIC profile regardless.
     */
    describe('Dashboard vs My profile (T-0287)', () => {
        it('offers a plain member their profile and no Dashboard', () => {
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            expect(ctaText()).toContain('My profile');
            expect(ctaText()).not.toContain('Dashboard');
            expect(hrefs()).toContain('/u/u1');
            expect(hrefs()).not.toContain('/app');
        });

        it('offers a staff member BOTH the Dashboard and their profile', () => {
            auth.currentUser.set(makeUser(true));
            auth.staff = true;
            fixture.detectChanges();
            expect(ctaText()).toContain('Dashboard');
            expect(ctaText()).toContain('My profile');
            expect(hrefs()).toContain('/app');
            expect(hrefs()).toContain('/u/u1');
        });

        it('prefers the vanity handle for the profile link', () => {
            auth.currentUser.set(makeUser(true, 'lordy'));
            fixture.detectChanges();
            expect(hrefs()).toContain('/u/@lordy');
        });

        it('never offers a non-member the Dashboard or a profile link', () => {
            auth.currentUser.set(makeUser(false));
            fixture.detectChanges();
            expect(ctaText()).not.toContain('Dashboard');
            expect(ctaText()).not.toContain('My profile');
        });
    });

    /**
     * The topbar used to give a signed-in admin four peer buttons — Dashboard,
     * My profile, Account and Sign out — of which two were the same destination
     * under different names and one was destructive. Everything that acts on
     * YOUR account now lives behind your own face (T-0289).
     */
    describe('account menu (T-0289)', () => {
        function menuItems(): string[] {
            return Array.from<HTMLElement>(
                fixture.nativeElement.querySelectorAll('.account-menu-item'),
            ).map((el) => (el.textContent ?? '').trim());
        }

        it('leaves exactly one topbar button beside the account trigger for staff', () => {
            auth.currentUser.set(makeUser(true, 'lordy'));
            auth.staff = true;
            fixture.detectChanges();
            const buttons = Array.from<HTMLElement>(
                cta().querySelectorAll('a.btn, button.btn'),
            ).map((el) => (el.textContent ?? '').trim());
            expect(buttons).toEqual(['Dashboard']);
            expect(cta().querySelector('.account-trigger')).not.toBeNull();
        });

        it('puts My profile, Edit profile and Sign out in the menu — and nothing else', () => {
            auth.currentUser.set(makeUser(true, 'lordy'));
            fixture.detectChanges();
            expect(menuItems()).toEqual(['My profile', 'Edit profile', 'Sign out']);
            expect(hrefs()).toContain('/u/@lordy');
            expect(hrefs()).toContain('/account');
        });

        it('offers an applicant only Sign out — they have no profile to edit', () => {
            // An applicant has no member row, so /u/:id would 404 and /account
            // renders a notice instead of a form.
            auth.currentUser.set(makeUser(false));
            fixture.detectChanges();
            expect(menuItems()).toEqual(['Sign out']);
            expect(hrefs()).not.toContain('/account');
        });

        it('opens and closes on the trigger', () => {
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            const trigger = cta().querySelector('.account-trigger') as HTMLButtonElement;
            expect(trigger.getAttribute('aria-expanded')).toBe('false');

            trigger.click();
            fixture.detectChanges();
            expect(fixture.componentInstance.accountMenuOpen).toBeTrue();
            expect(trigger.getAttribute('aria-expanded')).toBe('true');
            expect(
                fixture.nativeElement
                    .querySelector('.account-menu')
                    .classList.contains('account-menu--open'),
            ).toBeTrue();

            trigger.click();
            fixture.detectChanges();
            expect(fixture.componentInstance.accountMenuOpen).toBeFalse();
        });

        it('closes on a click anywhere else on the page', () => {
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            fixture.componentInstance.accountMenuOpen = true;
            document.body.click();
            expect(fixture.componentInstance.accountMenuOpen).toBeFalse();
        });

        it('stays open for a click INSIDE it', () => {
            // The header is not a control; clicking it must not dismiss the menu
            // the way a click on the page behind would.
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            fixture.componentInstance.accountMenuOpen = true;
            fixture.detectChanges();
            (fixture.nativeElement.querySelector('.account-menu-head') as HTMLElement).click();
            expect(fixture.componentInstance.accountMenuOpen).toBeTrue();
        });

        it('closes on Escape', () => {
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            fixture.componentInstance.accountMenuOpen = true;
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(fixture.componentInstance.accountMenuOpen).toBeFalse();
        });

        it('closes the account menu when the burger drawer closes', () => {
            // Otherwise the panel is left expanded behind a closed drawer and
            // reopening the burger shows it mid-flow.
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            fixture.componentInstance.menuOpen = true;
            fixture.componentInstance.accountMenuOpen = true;
            fixture.componentInstance.toggleMenu();
            expect(fixture.componentInstance.accountMenuOpen).toBeFalse();
        });

        it('labels the trigger with one word, whatever the in-game name is', () => {
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            // makeUser's name is "Test User".
            expect(fixture.componentInstance.accountFirstName).toBe('Test');
        });
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
