import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentEvent } from '../../../core/models/event.model';
import { EventsService } from '../../../core/services/events.service';

@Component({
    selector: 'app-events-admin',
    templateUrl: './events-admin.component.html',
    styleUrls: ['./events-admin.component.scss'],
    standalone: false,
})
export class EventsAdminComponent implements OnInit {
    ongoingEvents: RegimentEvent[] = [];
    upcomingEvents: RegimentEvent[] = [];
    previousEvents: RegimentEvent[] = [];

    loading = true;
    loadError = '';

    private readonly destroyRef = inject(DestroyRef);

    constructor(private eventsService: EventsService) {}

    ngOnInit(): void {
        this.loading = true;
        this.loadError = '';
        this.eventsService
            .getAll()
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
