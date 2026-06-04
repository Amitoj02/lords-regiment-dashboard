import { Component, OnInit } from '@angular/core';
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

  constructor(private eventsService: EventsService) {}

  ngOnInit(): void {
    this.eventsService.getAll().subscribe(events => {
      this.ongoingEvent = events.find(e => e.status === 'ongoing') ?? null;
      this.upcomingEvents = events.filter(e => e.status === 'upcoming');
      this.previousEvents = events.filter(e => e.status === 'previous');
    });
  }

  totalRsvps(event: RegimentEvent): number {
    const c = event.rsvpCounts;
    return c.interested + c.tentative + c.declined + c.neutral;
  }
}
