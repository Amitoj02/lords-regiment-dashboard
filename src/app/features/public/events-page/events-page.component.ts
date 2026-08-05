import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { RegimentEvent } from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { SeoService } from '../../../core/services/seo.service';
import { DEFAULT_REGIMENT_NAME, eventsDescription } from '../../../core/seo/seo-copy';

const PAGE_TITLE = 'Events & Orders';

/**
 * The public events calendar (T-0287). It is the same page it was inside the
 * dashboard, minus every assumption that the reader is signed in.
 */
@Component({
    selector: 'hf-events-page',
    templateUrl: './events-page.component.html',
    styleUrls: ['./events-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class EventsPageComponent implements OnInit {
    ongoingEvent: RegimentEvent | null = null;
    upcomingEvents: RegimentEvent[] = [];
    previousEvents: RegimentEvent[] = [];

    loading = true;
    loadFailed = false;

    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    private readonly seo = inject(SeoService);
    private readonly document = inject(DOCUMENT);
    private readonly regiment = inject(RegimentService);

    /**
     * The live regiment name (T-0293). The description used to hardcode "the
     * Lords Regiment" while the crawler shell built the same sentence from the
     * editable field, so the two would have disagreed after any rename.
     */
    private regimentName = DEFAULT_REGIMENT_NAME;

    constructor(private eventsService: EventsService) {}

    ngOnInit(): void {
        // Applied before the fetch, not after it: the tab title, the canonical
        // URL and the share card have to be right for a visitor whose request
        // fails as much as for one whose request lands.
        this.applySeo();
        this.regiment
            .getProfile()
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((profile) => {
                this.regimentName = profile?.name?.trim() || DEFAULT_REGIMENT_NAME;
                this.applySeo();
            });
        this.load();
    }

    /** Fetch (or re-fetch, from the error state's retry) the public calendar. */
    load(): void {
        this.loading = true;
        this.loadFailed = false;
        this.eventsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (events) => {
                    this.ongoingEvent = events.find((e) => e.status === 'ongoing') ?? null;
                    this.upcomingEvents = events.filter((e) => e.status === 'upcoming');
                    this.previousEvents = events.filter((e) => e.status === 'previous');
                    this.loading = false;
                    // Re-applied now there is a calendar to describe — the
                    // ItemList is the one tag that needs the response.
                    this.applySeo();
                },
                error: (err) => {
                    // Previously a bare `next` handler, so a 500 or an offline
                    // browser rendered a page that looked exactly like a regiment
                    // with nothing scheduled.
                    console.error('Failed to load events', err);
                    this.loading = false;
                    this.loadFailed = true;
                },
            });
    }

    /** True when the fetch succeeded and there is genuinely nothing to show. */
    get isEmpty(): boolean {
        return (
            !this.ongoingEvent &&
            this.upcomingEvents.length === 0 &&
            this.previousEvents.length === 0
        );
    }

    /**
     * Whether the visitor has a session at all. The page itself is fully public
     * now — this gates only the things that are true of a SIGNED-IN reader: the
     * RSVP tallies the member projection carries, and the "password protected"
     * note, which exists to tell an anonymous visitor why signing in is worth it.
     */
    get signedIn(): boolean {
        return this.auth.isAuthenticated();
    }

    /**
     * The event's RSVP tally, or null when the projection does not carry one.
     *
     * The PUBLIC feed no longer sends `rsvpCounts` at all — turnout is member-only
     * now — and summing an absent block would print a confident "0 RSVPs" on an
     * event a dozen people have signed up for. Absence therefore has to stay
     * distinguishable from zero all the way into the template.
     */
    rsvpTotal(event: RegimentEvent): number | null {
        // Widened rather than cast: `RegimentEvent` still declares this field
        // required, but `mapEvent` copies it straight off the wire and the public
        // payload has no such key.
        const counts: RegimentEvent['rsvpCounts'] | undefined = event.rsvpCounts;
        if (!counts) {
            return null;
        }
        return counts.interested + counts.tentative + counts.declined + counts.neutral;
    }

    private applySeo(): void {
        this.seo.apply({
            title: PAGE_TITLE,
            description: eventsDescription(this.regimentName),
            canonicalPath: '/events',
            // The NEXT event's banner, because that is what a shared calendar
            // link is actually advertising; a quiet week falls through to the
            // site banner in `SeoService`. Same order as the API's shell.
            imageUrl: this.cardImage(),
            jsonLd: this.upcomingJsonLd(),
        });
    }

    /** The banner of whatever is running or scheduled next, if it has one. */
    private cardImage(): string | null {
        const next = [this.ongoingEvent, ...this.upcomingEvents].find((event) => event?.bannerUrl);
        return next?.bannerUrl ?? null;
    }

    /**
     * An `ItemList` of what a visitor can still attend. Upcoming only: a
     * concluded event is not something a search result should offer to take
     * somebody to, and the public feed only reaches 90 days back anyway.
     */
    private upcomingJsonLd(): unknown {
        if (this.upcomingEvents.length === 0) {
            return null;
        }
        const origin = this.document.location?.origin ?? '';
        return {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Upcoming events',
            itemListElement: this.upcomingEvents.map((event, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                    '@type': 'Event',
                    name: event.title,
                    // The absolute instant, never `date`/`startTime` — those are
                    // already converted to THIS reader's zone, so publishing them
                    // would stamp one visitor's timezone onto the event itself.
                    startDate: event.startsAt ?? `${event.date}T${event.startTime}`,
                    url: `${origin}/events/${event.id}`,
                },
            })),
        };
    }
}
