import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, of } from 'rxjs';
import { RegimentEvent, RsvpStatus } from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { DEFAULT_REGIMENT_NAME, eventDate, eventDescription } from '../../../core/seo/seo-copy';

interface AttendeeVM {
    name: string;
    avatarUrl: string | null;
    status: RsvpStatus;
}

/**
 * A single event, now a PUBLIC page at `/events/:id` (T-0287).
 *
 * Everything here that used to be safe because `authGuard` stood in front of it
 * no longer is: an anonymous visitor arriving from a Discord link, a search
 * result or an unfurled share card renders this component with no session at
 * all. So the fetch forks on the session, every member-only surface is gated,
 * and the one action left for a signed-out reader is to sign in.
 */
@Component({
    selector: 'app-event-detail',
    templateUrl: './event-detail.component.html',
    styleUrls: ['./event-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class EventDetailComponent implements OnInit {
    showPassword = false;
    selectedRsvp: RsvpStatus | null = null;
    eventId: string | null = null;

    event: RegimentEvent | null = null;
    attendees: AttendeeVM[] = [];

    loading = true;
    loadFailed = false;

    /** Populated by the dedicated reveal endpoint (RevealEventPasswords) — never in the event body. */
    revealedPassword: string | null = null;
    revealing = false;
    working = false;

    private readonly destroyRef = inject(DestroyRef);
    private readonly seo = inject(SeoService);
    private readonly document = inject(DOCUMENT);
    private readonly regiment = inject(RegimentService);

    /**
     * The live regiment name, used in the generated description and the JSON-LD
     * `organizer` (T-0293) — both of which the crawler shell builds from the
     * same editable field.
     */
    private regimentName = DEFAULT_REGIMENT_NAME;

    constructor(
        private route: ActivatedRoute,
        private eventsService: EventsService,
        private auth: AuthService,
        private router: Router,
        private toast: ToastService,
    ) {}

    /** Capability gate for a template action (see the spec's capability keys). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    /** Whether the reader has a session at all — the gate on every member surface here. */
    /**
     * Stash this event before handing the reader to /login, so signing in brings
     * them back to it (T-0287). Without this they land on a generic destination
     * having lost the event they were reading — and the event page is the single
     * most linked-to URL in Discord.
     */
    rememberReturn(): void {
        this.auth.stashReturnUrl(this.router.url);
    }

    get signedIn(): boolean {
        return this.auth.isAuthenticated();
    }

    ngOnInit(): void {
        this.eventId = this.route.snapshot.paramMap.get('id');
        if (!this.eventId) {
            this.loading = false;
            this.loadFailed = true;
            return;
        }
        this.load(this.eventId);

        // Navigation-independent; folded into the metadata whenever it lands.
        this.regiment
            .getProfile()
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((profile) => {
                this.regimentName = profile?.name?.trim() || DEFAULT_REGIMENT_NAME;
                if (this.event) this.applySeo(this.event);
            });

        if (this.can('view_members_directory')) {
            this.eventsService
                .getRsvps(this.eventId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (rows) => {
                        this.attendees = rows.map((r) => ({
                            name: r.name ?? r.memberId,
                            avatarUrl: r.avatarUrl,
                            status: r.status,
                        }));
                    },
                    error: (err) => console.error('Failed to load attendees', err),
                });
        }
    }

    /** Re-fetch after a failure, from the error state's own button. */
    retry(): void {
        if (this.eventId) {
            this.load(this.eventId);
        }
    }

    /**
     * WHICH endpoint is the whole point of this page being public.
     * `/events/mine/:id` is authenticated: for an anonymous reader it is a
     * guaranteed 401 and a blank page. The public projection is the one that
     * answers them — and the member one is still what a signed-in reader needs,
     * because `myRsvp`, the server binding and the RSVP tallies exist nowhere
     * else.
     */
    private load(id: string): void {
        this.loading = true;
        this.loadFailed = false;
        const event$: Observable<RegimentEvent> = this.signedIn
            ? this.eventsService.getMineById(id)
            : this.eventsService.getById(id);

        event$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (event) => {
                this.event = event;
                this.selectedRsvp = event.myRsvp ?? null;
                this.loading = false;
                this.applySeo(event);
            },
            error: (err) => {
                console.error('Failed to load event', err);
                this.loading = false;
                this.loadFailed = true;
                // A page that rendered an error is not a page worth ranking, and
                // without this it would keep whatever tags the previous route set.
                this.seo.apply({
                    title: 'Event unavailable',
                    description: 'This event could not be loaded.',
                    noIndex: true,
                });
            },
        });
    }

    /** Reveal the decrypted server password (once) then toggle its visibility. */
    togglePassword(): void {
        if (this.revealedPassword !== null) {
            this.showPassword = !this.showPassword;
            return;
        }
        // Mirror the backend gate: an RSVP must exist and not be 'declined'
        // (interested/tentative/neutral pass; null/declined are blocked).
        if (!this.selectedRsvp || this.selectedRsvp === 'declined') {
            this.toast.error('RSVP as Interested or Tentative to reveal the server password.');
            return;
        }
        if (!this.eventId || this.revealing || !this.can('reveal_event_passwords')) {
            return;
        }
        this.revealing = true;
        this.eventsService
            .revealPassword(this.eventId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.revealedPassword = res.serverPassword ?? '';
                    this.showPassword = true;
                    this.revealing = false;
                },
                error: (err) => {
                    console.error('Failed to reveal server password', err);
                    this.toast.error('Could not reveal the server password.');
                    this.revealing = false;
                },
            });
    }

    setRsvp(status: RsvpStatus): void {
        if (!this.eventId) {
            return;
        }
        this.eventsService
            .rsvp(this.eventId, status)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (event) => {
                    this.event = event;
                    this.selectedRsvp = status;
                },
                error: (err) => {
                    // Silence here meant the button simply did not light up, so
                    // the member clicked it again, and again. Every other write
                    // on this surface reports itself.
                    console.error('Failed to record RSVP', err);
                    this.toast.error('Could not record your RSVP. Please try again.');
                },
            });
    }

    /**
     * Archive or unarchive the event in place (T-0136). The button reflects the
     * current state and this reverses it, keeping archiving fully reversible.
     */
    toggleArchive(): void {
        if (!this.eventId || !this.event || this.working) {
            return;
        }
        const isArchived = !!this.event.isArchived;
        const message = isArchived
            ? 'Unarchive this event? It will be restored to the calendar.'
            : 'Archive this event? It will be hidden from the public calendar.';
        if (!confirm(message)) {
            return;
        }
        this.working = true;
        const request$ = isArchived
            ? this.eventsService.unarchive(this.eventId)
            : this.eventsService.archive(this.eventId);
        request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (event) => {
                this.event = event;
                this.working = false;
                // Archiving is exactly the thing that must not stay indexed.
                this.applySeo(event);
            },
            error: (err) => {
                console.error(
                    isArchived ? 'Failed to unarchive event' : 'Failed to archive event',
                    err,
                );
                this.working = false;
            },
        });
    }

    complete(): void {
        if (!this.eventId || this.working) {
            return;
        }
        if (!confirm('Mark this event complete? It will move to Previous operations.')) {
            return;
        }
        this.working = true;
        this.eventsService
            .complete(this.eventId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (event) => {
                    this.event = event;
                    this.working = false;
                },
                error: (err) => {
                    console.error('Failed to complete event', err);
                    this.working = false;
                },
            });
    }

    remove(): void {
        if (!this.eventId || this.working) {
            return;
        }
        if (!confirm('Delete this event permanently? This cannot be undone.')) {
            return;
        }
        this.working = true;
        this.eventsService
            .delete(this.eventId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                // Back to the staff events console, not the public list: the only
                // caller who can reach this button is authoring events.
                next: () => this.router.navigateByUrl('/app/events'),
                error: (err) => {
                    console.error('Failed to delete event', err);
                    this.working = false;
                },
            });
    }

    /**
     * Whether the Server Details panel has anything to show (T-0236). Each row in
     * it is now conditional, so without this the panel could render as an empty
     * box — worse than the blank field it replaced.
     */
    get hasServerDetails(): boolean {
        if (!this.event) {
            return false;
        }
        return (
            !!this.event.hasServerName ||
            !!this.event.hasServerPassword ||
            !!this.event.notifyBefore?.length
        );
    }

    /** True when this event is part of a recurring series (template or occurrence). */
    get isSeries(): boolean {
        return !!this.event && (!!this.event.isRecurring || !!this.event.recurrenceTemplateId);
    }

    /** Delete the whole recurring series (template + every occurrence) — T-0099. */
    removeSeries(): void {
        if (!this.eventId || this.working || !this.isSeries) {
            return;
        }
        if (!confirm('Delete ALL events in this recurring series? This cannot be undone.')) {
            return;
        }
        this.working = true;
        this.eventsService
            .deleteSeries(this.eventId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.router.navigateByUrl('/app/events'),
                error: (err) => {
                    console.error('Failed to delete event series', err);
                    this.working = false;
                },
            });
    }

    /**
     * The RSVP tallies, or null when this projection does not carry them.
     *
     * Turnout is member-only on the wire now: the public event omits `rsvpCounts`
     * entirely, while `RegimentEvent` still declares it required and `mapEvent`
     * copies whatever arrived. Summing an absent block would print a confident
     * "0" on an event a dozen people have signed up for, so absence has to stay
     * distinguishable from zero all the way into the template.
     */
    get rsvpCounts(): RegimentEvent['rsvpCounts'] | null {
        const counts: RegimentEvent['rsvpCounts'] | undefined = this.event?.rsvpCounts;
        return counts ?? null;
    }

    /** Every bucket summed, or null on a projection that carries no tallies. */
    get rsvpTotal(): number | null {
        const c = this.rsvpCounts;
        return c ? c.interested + c.tentative + c.declined + c.neutral : null;
    }

    private applySeo(event: RegimentEvent): void {
        const path = `/events/${event.id}`;
        this.seo.apply({
            title: event.title,
            description: this.seoDescription(event),
            canonicalPath: path,
            imageUrl: event.bannerUrl ?? null,
            type: 'article',
            // An archived event is pulled from the public calendar; the URL stays
            // alive for whoever holds the link, but it must not be ranked. The
            // flag rides the member projection only — which is also the only way
            // an archived event can be reached at all.
            noIndex: !!event.isArchived,
            jsonLd: this.eventJsonLd(event, path),
        });
    }

    /**
     * The description, collapsed to one line and cut to a shareable length.
     *
     * ── WHY THE FALLBACK NO LONGER USES `event.date` (T-0293) ────────────────
     * `date` is already converted to THIS reader's timezone, so a description
     * built from it said a different day depending on who was looking — and it
     * could never match the one the crawler shell renders, which has no reader
     * to convert for. The rule now names the date in the EVENT's own zone on
     * both surfaces, from the absolute instant. `eventDescription` in
     * `core/seo/seo-copy.ts` is the shared implementation; its twin is
     * `SeoService.describeEvent` in the API.
     */
    private seoDescription(event: RegimentEvent): string {
        return eventDescription(
            event,
            this.regimentName,
            event.startsAt ? eventDate(event.startsAt, event.timezone ?? 'UTC') : event.date,
        );
    }

    private eventJsonLd(event: RegimentEvent, path: string): unknown {
        const origin = this.document.location?.origin ?? '';
        const url = `${origin}${path}`;
        return {
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: event.title,
            // The absolute instants, never `date`/`startTime`: those are already
            // converted to THIS reader's zone (T-0237), so publishing them would
            // stamp one visitor's timezone onto the event for everybody.
            startDate: event.startsAt ?? `${event.date}T${event.startTime}`,
            endDate: event.endsAt ?? undefined,
            // Nothing in the model expresses a cancellation — an event that is
            // called off is deleted or archived, and neither reaches this page as
            // a public URL. So every event we can render was, or is, scheduled.
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
            // It happens on a game server whose binding is members-only, so the
            // location a crawler can be given is the page itself.
            location: { '@type': 'VirtualLocation', url },
            organizer: {
                '@type': 'Organization',
                name: this.regimentName,
                url: origin || undefined,
            },
            image: event.bannerUrl ?? undefined,
            url,
        };
    }
}
