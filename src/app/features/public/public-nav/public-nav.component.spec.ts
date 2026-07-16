import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { PublicNavComponent } from './public-nav.component';

/**
 * The public topbar CTA is auth-aware (T-004x): a member is offered the
 * dashboard, an applicant their status page, and an anonymous visitor the
 * original Join Discord + Sign in pair. These specs flip the mocked
 * AuthService.currentUser signal and assert the CTA labels + targets follow.
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
        name: 'Test User',
        rank: null,
        role: isMember ? 'Member' : 'Applicant',
        discordTag: null,
        discordLinked: true,
        avatarUrl: null,
        isMember,
        capabilities: [],
    };
}

describe('PublicNavComponent (auth-aware CTA)', () => {
    let fixture: ComponentFixture<PublicNavComponent>;
    let auth: MockAuthService;

    beforeEach(async () => {
        auth = new MockAuthService();
        await TestBed.configureTestingModule({
            imports: [CommonModule, RouterModule.forRoot([])],
            declarations: [PublicNavComponent],
            providers: [{ provide: AuthService, useValue: auth }],
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
});
