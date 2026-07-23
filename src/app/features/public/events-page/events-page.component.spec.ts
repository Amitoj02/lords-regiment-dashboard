import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { RegimentEvent } from '../../../core/models/event.model';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { EventsPageComponent } from './events-page.component';

/**
 * Two things are under test on this page, and they are both about what an
 * ANONYMOUS visitor can be told:
 *
 * - T-0235: the CTAs are auth-aware. A signed-in visitor gets the real dashboard
 *   action; a signed-out one is sent to sign in. The mocked AuthService signal is
 *   flipped between specs, matching the public-nav specs' pattern.
 * - T-0236: the server + password blocks branch on the PRESENCE FLAGS, which the
 *   API sends on every projection including the public one. The public feed never
 *   carries `serverName` itself, so branching on it (as the page used to) cannot
 *   tell a password-protected event from a plain one.
 */
class MockAuthService {
    readonly currentUser = signal<CurrentUser | null>(null);
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

/** A PUBLIC-projection event: presence flags, but no server binding. */
function event(overrides: Partial<RegimentEvent> = {}): RegimentEvent {
    return {
        id: 'ev1',
        title: 'Line Battle',
        description: 'Fall in.',
        serverName: null,
        date: '2026-06-07',
        startTime: '19:30',
        endTime: '22:00',
        timezone: 'America/New_York',
        zoneLabel: 'GMT+2',
        platforms: ['steam'],
        status: 'upcoming',
        tags: ['line-battle'],
        rsvpCounts: { interested: 2, tentative: 1, declined: 0, neutral: 0 },
        hasServerName: false,
        hasServerPassword: false,
        ...overrides,
    };
}

describe('EventsPageComponent', () => {
    let fixture: ComponentFixture<EventsPageComponent>;
    let auth: MockAuthService;

    function setup(events: RegimentEvent[]): void {
        auth = new MockAuthService();
        const eventsService = jasmine.createSpyObj<EventsService>('EventsService', ['getAll']);
        eventsService.getAll.and.returnValue(of(events));

        TestBed.configureTestingModule({
            imports: [CommonModule, RouterModule.forRoot([])],
            declarations: [EventsPageComponent],
            providers: [
                { provide: EventsService, useValue: eventsService },
                { provide: AuthService, useValue: auth },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(EventsPageComponent);
    }

    function text(): string {
        return (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ').trim();
    }
    /**
     * Text of one region. The page intro itself mentions "server passwords", so
     * a whole-page assertion about the word would be true no matter what the
     * event blocks render.
     */
    function textIn(selector: string): string {
        const el = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
        return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    }
    function hrefs(): string[] {
        const root = fixture.nativeElement as HTMLElement;
        return Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    }

    describe('auth-aware CTAs (T-0235)', () => {
        it('sends an anonymous visitor to sign in, worded as the RSVP they want', () => {
            setup([event({ status: 'ongoing' }), event({ id: 'ev2', status: 'upcoming' })]);
            fixture.detectChanges();
            expect(text()).toContain('Login to RSVP');
            expect(hrefs()).toContain('/login');
            expect(hrefs()).not.toContain('/app/dashboard/events/ev2');
        });

        it('sends a signed-in member to the in-shell event page', () => {
            setup([event({ status: 'ongoing' }), event({ id: 'ev2', status: 'upcoming' })]);
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            expect(text()).toContain('Open in dashboard');
            expect(text()).not.toContain('Login to RSVP');
            expect(hrefs()).toContain('/app/dashboard/events/ev1');
            expect(hrefs()).toContain('/app/dashboard/events/ev2');
            expect(hrefs()).not.toContain('/login');
        });

        it('sends a signed-in APPLICANT to the same place, not a special case', () => {
            // /app/dashboard/events/:id carries only authGuard — no capability gate
            // — and the API answers a non-enrolled caller with a redacted 200, not
            // a 403. There is deliberately no fork here for non-members.
            setup([event({ id: 'ev2', status: 'upcoming' })]);
            auth.currentUser.set(makeUser(false));
            fixture.detectChanges();
            expect(hrefs()).toContain('/app/dashboard/events/ev2');
            expect(hrefs()).not.toContain('/login');
        });
    });

    describe('server + password blocks (T-0236)', () => {
        it('shows no password call to action when the event has no password', () => {
            setup([event({ status: 'ongoing', hasServerPassword: false })]);
            fixture.detectChanges();
            expect(textIn('.ongoing-panel').toLowerCase()).not.toContain('password');
        });

        it('flags a password-protected event to an anonymous visitor', () => {
            // The whole point of the presence flags: without them the public feed
            // badges a password-protected event identically to a plain one.
            setup([event({ status: 'ongoing', hasServerPassword: true })]);
            fixture.detectChanges();
            expect(textIn('.ongoing-panel')).toContain('Password protected');
        });

        it('never shows the password note to a signed-in member', () => {
            // They follow the CTA through and reveal it on the event page.
            setup([event({ status: 'ongoing', hasServerPassword: true })]);
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            expect(textIn('.ongoing-panel')).not.toContain('Password protected');
        });

        it('omits the Server field entirely when no server is bound', () => {
            setup([event({ status: 'ongoing', hasServerName: false })]);
            fixture.detectChanges();
            // Not blank, not an em dash — absent.
            expect(textIn('.ongoing-meta-row')).not.toContain('Server');
            expect(textIn('.ongoing-meta-row')).not.toContain('—');
        });

        it('renders the Server field when the event HAS a server, even redacted', () => {
            setup([event({ status: 'ongoing', hasServerName: true, serverName: null })]);
            fixture.detectChanges();
            expect(textIn('.ongoing-meta-row')).toContain('Server');
        });

        it('drops the server line from an upcoming row with no server', () => {
            setup([event({ id: 'ev2', status: 'upcoming', hasServerName: false })]);
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.event-server')).toBeNull();
        });
    });

    it('labels the rendered time with the viewer zone (T-0237)', () => {
        // The times are converted out of the stored UTC instant into the viewer's
        // zone, so the page must not imply they are the authored zone.
        setup([event({ id: 'ev2', status: 'upcoming', zoneLabel: 'GMT+2' })]);
        fixture.detectChanges();
        expect(text()).toContain('GMT+2');
        expect(text()).not.toContain('America/New_York');
    });

    it('totalRsvps() sums every RSVP bucket', () => {
        setup([]);
        fixture.detectChanges();
        expect(
            fixture.componentInstance.totalRsvps(
                event({ rsvpCounts: { interested: 2, tentative: 1, declined: 3, neutral: 4 } }),
            ),
        ).toBe(10);
    });
});
