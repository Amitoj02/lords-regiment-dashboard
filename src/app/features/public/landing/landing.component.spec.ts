import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import {
    RegimentPresentation,
    RegimentProfile,
    RegimentStats,
} from '../../../core/models/api.model';
import { RegimentEvent } from '../../../core/models/event.model';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { LandingComponent } from './landing.component';
import { LANDING_DEFAULTS } from './landing.defaults';

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
    /** Staff, not merely enrolled — the hero CTA branches on this (T-0287). */
    isStaff(): boolean {
        return (this.currentUser()?.capabilities?.length ?? 0) > 0;
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

/** A public profile carrying (or withholding) the Discord invite (T-0234). */
function makeProfile(
    discordInviteUrl: string | null,
    presentation?: Partial<RegimentPresentation>,
): RegimentProfile {
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
        presentation: presentation
            ? {
                  heroBannerUrl: null,
                  loginBannerUrl: null,
                  charterQuote: null,
                  charterQuoteAttribution: null,
                  loginQuote: null,
                  loginQuoteAttribution: null,
                  heroOverlayDensity: null,
                  loginOverlayDensity: null,
                  ...presentation,
              }
            : undefined,
    };
}

/** The two figures the hero prints, plus the rest of the projection. */
function makeStats(establishedAt: string | null, enrolled: number): RegimentStats {
    return {
        totalMembers: enrolled,
        enrolledExcludingMercenaries: enrolled,
        activeMembers: enrolled,
        membersByRole: {
            Owner: 1,
            Admin: 0,
            Moderator: 0,
            Member: 0,
            Mercenary: 0,
            Applicant: 0,
        },
        totalEvents: 0,
        upcomingEvents: 0,
        previousEvents: 0,
        establishedYear: establishedAt ? Number(establishedAt.slice(0, 4)) : null,
        establishedAt,
    };
}

/** A minimal upcoming event carrying the instants and the server presence flag. */
function makeEvent(overrides: Partial<RegimentEvent> = {}): RegimentEvent {
    return {
        id: 'e1',
        title: 'Line Battle',
        description: '',
        serverName: 'NA_Official_1',
        date: '2026-08-14',
        startTime: '18:00',
        endTime: '20:00',
        timezone: 'Europe/Berlin',
        platforms: ['pc'],
        status: 'upcoming',
        tags: [],
        rsvpCounts: { interested: 0, tentative: 0, declined: 0, neutral: 0 },
        ...overrides,
    };
}

describe('LandingComponent (auth-aware hero CTA)', () => {
    let fixture: ComponentFixture<LandingComponent>;
    let auth: MockAuthService;
    /** Read lazily by the mock, so a spec can swap it before the first CD. */
    let profile$: Observable<RegimentProfile | null>;
    /**
     * Likewise swappable. `of(null)` is the "statistics visibility off" case the
     * component reaches via a swallowed 403, and it is the default here so every
     * spec that is not about the figures renders the hero without them.
     */
    let stats$: Observable<RegimentStats | null>;
    /** Swappable by a spec before the first change detection. */
    let events: RegimentEvent[];

    beforeEach(async () => {
        auth = new MockAuthService();
        profile$ = of(null);
        stats$ = of(null);
        events = [];
        await TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [LandingComponent],
            providers: [
                { provide: AuthService, useValue: auth },
                { provide: EventsService, useValue: { getAll: () => of(events) } },
                { provide: GalleryService, useValue: { getAll: () => of([]) } },
                {
                    provide: RegimentService,
                    useValue: { getProfile: () => profile$, getStats: () => stats$ },
                },
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

    // T-0287: the dashboard is staff-only, so naming it to an ordinary member
    // promised a place staffGuard would refuse them.
    it('labels the CTA "View My Profile" for a signed-in ordinary member', () => {
        auth.currentUser.set(makeUser(true));
        fixture.detectChanges();
        expect(heroLabel()).toBe('View My Profile');
    });

    it('labels the CTA "Go to Dashboard" only for staff', () => {
        auth.currentUser.set({ ...makeUser(true), capabilities: ['manage_events'] });
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

    describe('Discord panel CTA (T-0234)', () => {
        /** The sidebar "Join the … Server" anchor, or null when absent. */
        function discordCta(): HTMLAnchorElement | null {
            return fixture.nativeElement.querySelector('.discord-cta');
        }

        it('opens the configured invite in a new tab', () => {
            profile$ = of(makeProfile('https://discord.gg/lords'));
            fixture.detectChanges();
            const cta = discordCta();
            expect(cta).not.toBeNull();
            expect(cta!.getAttribute('href')).toBe('https://discord.gg/lords');
            expect(cta!.getAttribute('target')).toBe('_blank');
            expect(cta!.getAttribute('rel')).toBe('noopener noreferrer');
        });

        it('hides the CTA when no invite is configured', () => {
            profile$ = of(makeProfile(null));
            fixture.detectChanges();
            expect(discordCta()).toBeNull();
        });

        it('treats a blank invite as unconfigured', () => {
            profile$ = of(makeProfile('   '));
            fixture.detectChanges();
            expect(discordCta()).toBeNull();
        });

        it('hides the CTA while the profile has not landed', () => {
            // profile$ defaults to of(null) — nothing to link to yet, so nothing
            // is offered rather than a link that goes nowhere.
            fixture.detectChanges();
            expect(discordCta()).toBeNull();
        });
    });

    /**
     * T-0238. The invariant is not "these strings render" but "an unset field
     * falls back and a set field wins" — including the two cases that a
     * truthiness check would get wrong: a `0` density and a blank attribution.
     */
    describe('hero presentation (T-0238)', () => {
        function hero(): HTMLElement {
            return fixture.nativeElement.querySelector('.hero');
        }
        function quoteText(): string {
            return (
                fixture.nativeElement.querySelector('.charter-quote')?.textContent ?? ''
            ).replace(/\s+/g, ' ');
        }
        function attribution(): HTMLElement | null {
            return fixture.nativeElement.querySelector('.charter-attribution');
        }

        it('renders the shipped hero when the API carries no presentation at all', () => {
            profile$ = of(makeProfile(null));
            fixture.detectChanges();
            expect(hero().style.backgroundImage).toContain(LANDING_DEFAULTS.heroBannerUrl);
            expect(quoteText()).toContain(LANDING_DEFAULTS.charterQuote);
            expect(attribution()?.textContent).toContain(LANDING_DEFAULTS.charterQuoteAttribution);
        });

        it('renders the shipped hero when every presentation field is null', () => {
            profile$ = of(makeProfile(null, {}));
            fixture.detectChanges();
            expect(hero().style.backgroundImage).toContain(LANDING_DEFAULTS.heroBannerUrl);
            expect(quoteText()).toContain(LANDING_DEFAULTS.charterQuote);
        });

        it('uses the configured banner and quote', () => {
            profile$ = of(
                makeProfile(null, {
                    heroBannerUrl: 'https://cdn.example/hero.webp',
                    charterQuote: "We don't yield the line.",
                    charterQuoteAttribution: "O'Brien, Colour Sergeant",
                }),
            );
            fixture.detectChanges();
            expect(hero().style.backgroundImage).toContain('https://cdn.example/hero.webp');
            // Apostrophes must survive the round-trip untouched, not as &#39;.
            expect(quoteText()).toContain("We don't yield the line.");
            expect(attribution()!.textContent).toContain("O'Brien, Colour Sergeant");
        });

        it('drops the attribution line entirely for a custom quote with no attribution', () => {
            profile$ = of(
                makeProfile(null, { charterQuote: 'Hold.', charterQuoteAttribution: null }),
            );
            fixture.detectChanges();
            // The failure this pins is a bare "—" with nothing after it.
            expect(attribution()).toBeNull();
        });

        it('treats overlay density 0 as "no scrim", not as unset', () => {
            profile$ = of(makeProfile(null, { heroOverlayDensity: 0 }));
            fixture.detectChanges();
            expect(hero().style.getPropertyValue('--hero-scrim')).toBe('0');
        });

        it('maps a configured density to the scrim custom property', () => {
            profile$ = of(makeProfile(null, { heroOverlayDensity: 40 }));
            fixture.detectChanges();
            expect(hero().style.getPropertyValue('--hero-scrim')).toBe('0.4');
        });

        it('falls back to the shipped density when it is unset', () => {
            profile$ = of(makeProfile(null, {}));
            fixture.detectChanges();
            expect(hero().style.getPropertyValue('--hero-scrim')).toBe(
                String(LANDING_DEFAULTS.heroOverlayDensity / 100),
            );
        });
    });

    /**
     * T-0296. The hero carries one COMMAND — Orders and Roster are already in
     * the nav, which is why the other two buttons went — plus the two figures,
     * which degrade one at a time rather than leaving an empty column.
     */
    describe('hero stats (T-0296)', () => {
        function stats(): HTMLElement | null {
            return fixture.nativeElement.querySelector('.hero-stats');
        }
        /**
         * `[value, label]` per figure, read element by element rather than off
         * textContent — value and label are separate block-level divs, so the
         * concatenated text has no separator between them (or between tiles).
         */
        function figures(): string[][] {
            return Array.from(stats()?.querySelectorAll('.hero-stat') ?? []).map((el) =>
                ['.hero-stat-value', '.hero-stat-label'].map((sel) =>
                    (el.querySelector(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim(),
                ),
            );
        }

        it('leaves the hero exactly one button, and it is the CTA', () => {
            stats$ = of(makeStats('2026-07-01', 36));
            fixture.detectChanges();
            // The roster link is a figure, not a rival command — the two
            // btn-lg anchors are what had to go.
            expect(fixture.nativeElement.querySelectorAll('.hero button').length).toBe(1);
            expect(fixture.nativeElement.querySelectorAll('.hero .btn').length).toBe(1);
        });

        it('hides the figures entirely when statistics visibility is off', () => {
            // getStats() → 403, swallowed to null by the component.
            stats$ = of(null);
            fixture.detectChanges();
            expect(stats()).toBeNull();
        });

        it('sets both figures', () => {
            stats$ = of(makeStats('2026-07-01', 36));
            fixture.detectChanges();
            expect(figures()).toEqual([
                ['07 / 2026', 'Since Established'],
                ['36', 'Members →'],
            ]);
        });

        it('points the roll at the roster it summarises', () => {
            stats$ = of(makeStats('2026-07-01', 36));
            fixture.detectChanges();
            const link = stats()!.querySelector('a.hero-stat-link');
            expect(link).not.toBeNull();
            expect(link!.getAttribute('routerLink')).toBe('/roster');
        });

        it('drops the established figure alone when the date is unset', () => {
            stats$ = of(makeStats(null, 36));
            fixture.detectChanges();
            // The failure this pins is an orphaned column with no value in it.
            expect(figures()).toEqual([['36', 'Members →']]);
        });

        it('still shows the count at zero rather than blanking the block', () => {
            stats$ = of(makeStats(null, 0));
            fixture.detectChanges();
            expect(figures()).toEqual([['0', 'Members →']]);
        });
    });

    /** T-0236 / T-0237 as they land on the landing page's own event rows. */
    describe('upcoming-orders rows', () => {
        function metaTime(): string {
            return (
                fixture.nativeElement.querySelector('.event-meta-time')?.textContent ?? ''
            ).trim();
        }
        function server(): HTMLElement | null {
            return fixture.nativeElement.querySelector('.event-meta-server');
        }

        it('prints the start/end window in the VIEWER zone, not the authored one', () => {
            const startsAt = '2026-08-14T18:00:00.000Z';
            events = [
                makeEvent({
                    startsAt,
                    endsAt: '2026-08-14T20:00:00.000Z',
                    timezone: 'Europe/Berlin',
                }),
            ];
            fixture.detectChanges();
            // Computed independently of event-time.ts so this is a real check.
            const local = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }).format(new Date(startsAt));
            expect(metaTime()).toContain(local);
            // The old bug printed the authored zone's city beside a UTC clock.
            expect(metaTime()).not.toContain('Berlin');
        });

        it('omits the Server field entirely when the event has no server bound', () => {
            events = [makeEvent({ hasServerName: false, serverName: '' })];
            fixture.detectChanges();
            expect(server()).toBeNull();
            expect(fixture.nativeElement.querySelector('.event-meta-divider')).toBeNull();
        });

        it('shows the Server field when the presence flag says one exists', () => {
            events = [makeEvent({ hasServerName: true, serverName: 'EU_Official_2' })];
            fixture.detectChanges();
            expect(server()!.textContent).toContain('EU_Official_2');
        });

        it('labels a bound-but-redacted server rather than printing an empty field', () => {
            // The public projection carries the flag but withholds the name.
            events = [makeEvent({ hasServerName: true, serverName: '' })];
            fixture.detectChanges();
            expect(server()!.textContent!.trim()).toBe('Server details on sign-in');
        });
    });
});
