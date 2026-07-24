import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentEvent } from '../../../core/models/event.model';
import { EventsService } from '../../../core/services/events.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-events-admin',
    templateUrl: './events-admin.component.html',
    styleUrls: ['./events-admin.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class EventsAdminComponent implements OnInit {
    ongoingEvents: RegimentEvent[] = [];
    upcomingEvents: RegimentEvent[] = [];
    previousEvents: RegimentEvent[] = [];

    loading = true;
    loadError = '';

    /** Whether the list includes archived events (manage_events only — T-0137). */
    includeArchived = false;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private eventsService: EventsService,
        private auth: AuthService,
    ) {}

    /** Capability gate — only moderator+ may author events. */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    ngOnInit(): void {
        this.load();
    }

    private load(): void {
        this.loading = true;
        this.loadError = '';
        // Member projection (T-0085): every member reads the in-shell calendar;
        // enrolled members also get their own myRsvp per event. Moderators may
        // additionally request archived events via the toggle (T-0137).
        this.eventsService
            .getAllMine(undefined, this.includeArchived)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (events) => {
                    this.loading = false;
                    this.ongoingEvents = events.filter((e) => e.status === 'ongoing');
                    this.upcomingEvents = events.filter((e) => e.status === 'upcoming');
                    this.previousEvents = events.filter((e) => e.status === 'previous');
                },
                error: (err) => {
                    this.loading = false;
                    this.loadError = 'Could not load events — please try again.';
                    console.error('Failed to load events', err);
                },
            });
    }

    /** Toggle inclusion of archived events (manage_events only) and reload (T-0137). */
    toggleArchived(): void {
        this.includeArchived = !this.includeArchived;
        this.load();
    }

    /** The non-empty status groups, in muster order (ongoing → upcoming → previous). */
    get groups(): { label: string; events: RegimentEvent[] }[] {
        return [
            { label: 'Ongoing', events: this.ongoingEvents },
            { label: 'Upcoming', events: this.upcomingEvents },
            { label: 'Previous', events: this.previousEvents },
        ].filter((g) => g.events.length > 0);
    }

    get totalCount(): number {
        return this.ongoingEvents.length + this.upcomingEvents.length + this.previousEvents.length;
    }

    totalRsvps(event: RegimentEvent): number {
        const c = event.rsvpCounts;
        return c.interested + c.tentative + c.declined + c.neutral;
    }
}
