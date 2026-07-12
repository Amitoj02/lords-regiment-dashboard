import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { LandingComponent } from './landing.component';

/**
 * The hero primary button routes correctly via AuthService.applyToJoin(); its
 * LABEL follows the session (T-004x). These specs flip the mocked currentUser
 * signal and assert the label tracks member / applicant / anonymous.
 */
class MockAuthService {
    readonly currentUser = signal<CurrentUser | null>(null);
    readonly applyToJoin = jasmine.createSpy('applyToJoin');
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

describe('LandingComponent (auth-aware hero CTA)', () => {
    let fixture: ComponentFixture<LandingComponent>;
    let auth: MockAuthService;

    beforeEach(async () => {
        auth = new MockAuthService();
        await TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [LandingComponent],
            providers: [
                { provide: AuthService, useValue: auth },
                { provide: EventsService, useValue: { getAll: () => of([]) } },
                { provide: GalleryService, useValue: { getAll: () => of([]) } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(LandingComponent);
    });

    function heroLabel(): string {
        const btn = fixture.nativeElement.querySelector('.hero-actions button') as HTMLElement;
        return (btn.textContent ?? '').replace(/\s+/g, ' ').trim();
    }

    it('labels the CTA "Apply to Join" for an anonymous visitor', () => {
        fixture.detectChanges();
        expect(heroLabel()).toBe('Apply to Join');
    });

    it('labels the CTA "Go to Dashboard" for a signed-in member', () => {
        auth.currentUser.set(makeUser(true));
        fixture.detectChanges();
        expect(heroLabel()).toBe('Go to Dashboard');
    });

    it('labels the CTA "View Application" for a signed-in applicant', () => {
        auth.currentUser.set(makeUser(false));
        fixture.detectChanges();
        expect(heroLabel()).toBe('View Application');
    });

    it('delegates the click to AuthService.applyToJoin', () => {
        fixture.detectChanges();
        (fixture.nativeElement.querySelector('.hero-actions button') as HTMLElement).click();
        expect(auth.applyToJoin).toHaveBeenCalled();
    });
});
