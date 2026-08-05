import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { RegimentEvent } from '../../../core/models/event.model';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { SeoService, SeoTags } from '../../../core/services/seo.service';
import { EventsPageComponent } from './events-page.component';

/**
 * This page left the dashboard in T-0287 and is now an indexed, anonymous URL.
 * What is under test is everything that assumption changed:
 *
 * - the CTAs no longer fork on the session. Every event links to `/events/:id`,
 *   for a visitor and a member alike, because that page now serves both.
 * - turnout went member-only on the wire, so `rsvpCounts` is simply ABSENT from
 *   the public feed. The page must not turn that absence into "0 RSVPs".
 * - a failed fetch has to look like a failure. It used to render as a regiment
 *   with nothing scheduled.
 * - the ongoing hero shows the EVENT's banner; the stock cover is only a
 *   fallback (it used to be hardcoded in the stylesheet).
 *
 * The presence-flag behaviour from T-0236 is unchanged and still covered.
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

class MockSeoService {
    readonly applied: SeoTags[] = [];
    apply(tags: SeoTags): void {
        this.applied.push(tags);
    }
    reset(): void {
        /* nothing to undo in a test double */
    }
    get last(): SeoTags | undefined {
        return this.applied[this.applied.length - 1];
    }
}

function makeUser(isMember: boolean): CurrentUser {
    return {
        id: 'u1',
        inGameName: 'Test User',
        username: null,
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

/**
 * A PUBLIC-projection event: presence flags, no server binding, and NO
 * `rsvpCounts` — the type still declares that field required, but the wire no
 * longer carries it and `mapEvent` copies straight off the wire. The assertion
 * is what makes the omission expressible.
 */
function event(overrides: Partial<RegimentEvent> = {}): RegimentEvent {
    const base = {
        id: 'ev1',
        title: 'Line Battle',
        description: 'Fall in.',
        serverName: null,
        date: '2026-06-07',
        startTime: '19:30',
        endTime: '22:00',
        startsAt: '2026-06-07T17:30:00.000Z',
        endsAt: '2026-06-07T20:00:00.000Z',
        timezone: 'America/New_York',
        zoneLabel: 'GMT+2',
        platforms: ['steam'],
        status: 'upcoming',
        tags: ['line-battle'],
        hasServerName: false,
        hasServerPassword: false,
    } as RegimentEvent;
    return { ...base, ...overrides };
}

/** The MEMBER projection of the same event — turnout included. */
function memberEvent(overrides: Partial<RegimentEvent> = {}): RegimentEvent {
    return event({
        rsvpCounts: { interested: 2, tentative: 1, declined: 0, neutral: 0 },
        ...overrides,
    });
}

describe('EventsPageComponent', () => {
    let fixture: ComponentFixture<EventsPageComponent>;
    let auth: MockAuthService;
    let seo: MockSeoService;
    let eventsService: jasmine.SpyObj<EventsService>;

    function setup(events: RegimentEvent[]): void {
        auth = new MockAuthService();
        seo = new MockSeoService();
        eventsService = jasmine.createSpyObj<EventsService>('EventsService', ['getAll']);
        eventsService.getAll.and.returnValue(of(events));

        TestBed.configureTestingModule({
            imports: [CommonModule, RouterModule.forRoot([])],
            declarations: [EventsPageComponent],
            providers: [
                { provide: EventsService, useValue: eventsService },
                { provide: AuthService, useValue: auth },
                { provide: SeoService, useValue: seo },
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

    describe('public CTAs (T-0287)', () => {
        it('links an anonymous visitor straight at the public event page', () => {
            setup([event({ status: 'ongoing' }), event({ id: 'ev2', status: 'upcoming' })]);
            fixture.detectChanges();
            expect(hrefs()).toContain('/events/ev1');
            expect(hrefs()).toContain('/events/ev2');
            // The old auth fork is gone: no sign-in bounce, no dashboard URL.
            expect(hrefs()).not.toContain('/login');
            expect(text()).not.toContain('Login to RSVP');
            expect(text()).not.toContain('Open in dashboard');
        });

        it('gives a signed-in member exactly the same links', () => {
            setup([event({ status: 'ongoing' }), event({ id: 'ev2', status: 'upcoming' })]);
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            expect(hrefs()).toContain('/events/ev1');
            expect(hrefs()).toContain('/events/ev2');
            expect(hrefs()).not.toContain('/app/dashboard/events/ev1');
        });

        it('links a concluded event from the Previous grid', () => {
            setup([event({ id: 'ev9', status: 'previous' })]);
            fixture.detectChanges();
            expect(hrefs()).toContain('/events/ev9');
        });
    });

    describe('the ongoing hero cover', () => {
        function coverStyle(): string {
            const el = fixture.nativeElement.querySelector('.ongoing-cover') as HTMLElement;
            return el.style.backgroundImage;
        }

        it("uses the event's own banner", () => {
            setup([event({ status: 'ongoing', bannerUrl: 'https://cdn.example/ev1.jpg' })]);
            fixture.detectChanges();
            expect(coverStyle()).toContain('https://cdn.example/ev1.jpg');
        });

        it('leaves the stylesheet fallback in place when there is no banner', () => {
            // No inline background-image at all — that is what lets the static
            // cover in the stylesheet show through.
            setup([event({ status: 'ongoing', bannerUrl: undefined })]);
            fixture.detectChanges();
            expect(coverStyle()).toBe('');
            expect(fixture.nativeElement.querySelector('.ongoing-cover').classList).toContain(
                'ongoing-cover-bg',
            );
        });
    });

    describe('turnout is member-only on the wire', () => {
        it('prints no RSVP tally at all on the public projection', () => {
            setup([event({ id: 'ev2', status: 'upcoming' })]);
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            // Absent must not read as zero.
            expect(text()).not.toContain('RSVPs');
            expect(text()).not.toContain('0 RSVPs');
        });

        it('prints the tally when a member projection actually carries one', () => {
            setup([memberEvent({ id: 'ev2', status: 'upcoming' })]);
            auth.currentUser.set(makeUser(true));
            fixture.detectChanges();
            expect(textIn('.event-rsvps')).toBe('3 RSVPs');
        });

        it('never prints a tally to an anonymous visitor', () => {
            setup([memberEvent({ id: 'ev2', status: 'upcoming' })]);
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.event-rsvps')).toBeNull();
        });

        it('rsvpTotal() distinguishes absent from zero', () => {
            setup([]);
            fixture.detectChanges();
            expect(fixture.componentInstance.rsvpTotal(event())).toBeNull();
            expect(
                fixture.componentInstance.rsvpTotal(
                    memberEvent({
                        rsvpCounts: { interested: 2, tentative: 1, declined: 3, neutral: 4 },
                    }),
                ),
            ).toBe(10);
        });
    });

    describe('load states', () => {
        it('says so while the calendar is in flight', () => {
            setup([]);
            // NEVER emits, so the page is held in its loading state.
            eventsService.getAll.and.returnValue(NEVER);
            fixture.detectChanges();
            expect(text()).toContain('Mustering the calendar');
        });

        it('renders a failure as a failure, not as an empty calendar', () => {
            setup([]);
            eventsService.getAll.and.returnValue(throwError(() => new Error('boom')));
            fixture.detectChanges();

            // Asserted on the PROJECTED body, not on the notice's `title` input:
            // this suite stubs components with NO_ERRORS_SCHEMA, so `hf-notice`
            // renders as an unknown element and an @Input never reaches the DOM.
            // Its <ng-content> does, which is why the retry test below can find
            // the button.
            expect(text()).toContain("Something went wrong reaching the regiment's events");
            expect(fixture.nativeElement.querySelector('hf-notice')).not.toBeNull();
            // The distinction that matters: a failed fetch must never be
            // presented as "there are no events".
            expect(text()).not.toContain('No operations on the books');
        });

        it('retries the fetch from the error state', () => {
            setup([]);
            eventsService.getAll.and.returnValue(throwError(() => new Error('boom')));
            fixture.detectChanges();

            eventsService.getAll.and.returnValue(of([event({ id: 'ev2', status: 'upcoming' })]));
            (
                fixture.nativeElement.querySelector('.events-error-body button') as HTMLElement
            ).click();
            fixture.detectChanges();

            expect(text()).not.toContain('could not be loaded');
            expect(hrefs()).toContain('/events/ev2');
        });

        it('says the calendar is empty when the fetch succeeds with nothing', () => {
            setup([]);
            fixture.detectChanges();
            expect(text()).toContain('No operations on the books');
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

        it('names the server on an ongoing row, for anyone (T-0298)', () => {
            setup([event({ status: 'ongoing', hasServerName: true, serverName: 'LORDS-1' })]);
            fixture.detectChanges();
            expect(textIn('.ongoing-meta-row')).toContain('Server');
            expect(textIn('.ongoing-meta-row')).toContain('LORDS-1');
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

    it('heads the archive with the window the API actually serves', () => {
        // The heading said "Last 30 days" while the backend served everything;
        // the backend now windows it at 90 (T-0215) and the heading has to agree.
        setup([event({ id: 'ev9', status: 'previous' })]);
        fixture.detectChanges();
        expect(textIn('.previous-heading')).toBe('Previous · Last 90 days');
    });

    describe('SEO (T-0287)', () => {
        it('claims /events as its canonical URL before the fetch resolves', () => {
            setup([]);
            eventsService.getAll.and.returnValue(throwError(() => new Error('boom')));
            fixture.detectChanges();
            expect(seo.last?.canonicalPath).toBe('/events');
            expect(seo.last?.title).toContain('Events');
        });

        it('publishes upcoming events as an ItemList of schema.org Events', () => {
            setup([
                event({ id: 'ev2', status: 'upcoming', title: 'Drill Night' }),
                event({ id: 'ev9', status: 'previous', title: 'Old Battle' }),
            ]);
            fixture.detectChanges();

            const jsonLd = seo.last?.jsonLd as {
                '@type': string;
                itemListElement: { position: number; item: Record<string, string> }[];
            };
            expect(jsonLd['@type']).toBe('ItemList');
            expect(jsonLd.itemListElement.length).toBe(1);
            expect(jsonLd.itemListElement[0].item['name']).toBe('Drill Night');
            expect(jsonLd.itemListElement[0].item['url']).toContain('/events/ev2');
            // The absolute instant, not the viewer-local wall clock.
            expect(jsonLd.itemListElement[0].item['startDate']).toBe('2026-06-07T17:30:00.000Z');
        });

        it('publishes no list when nothing is upcoming', () => {
            setup([event({ id: 'ev9', status: 'previous' })]);
            fixture.detectChanges();
            expect(seo.last?.jsonLd).toBeNull();
        });
    });
});
