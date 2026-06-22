import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentEvent } from '../../../core/models/event.model';
import { EventsService } from '../../../core/services/events.service';

@Component({
    selector: 'hf-events-page',
    templateUrl: './events-page.component.html',
    styleUrls: ['./events-page.component.scss'],
    standalone: false,
})
export class EventsPageComponent implements OnInit {
    ongoingEvent: RegimentEvent | null = null;
    upcomingEvents: RegimentEvent[] = [];
    previousEvents: RegimentEvent[] = [];

    private readonly destroyRef = inject(DestroyRef);

    constructor(private eventsService: EventsService) {}

    ngOnInit(): void {
        this.eventsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((events) => {
                this.ongoingEvent = events.find((e) => e.status === 'ongoing') ?? null;
                this.upcomingEvents = events.filter((e) => e.status === 'upcoming');
                this.previousEvents = events.filter((e) => e.status === 'previous');
            });
    }

    totalRsvps(event: RegimentEvent): number {
        const c = event.rsvpCounts;
        return c.interested + c.tentative + c.declined + c.neutral;
    }
}
