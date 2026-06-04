import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RegimentEvent, RsvpStatus } from '../../../core/models/event.model';

@Component({
  selector: 'app-event-detail',
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  standalone: false,
})
export class EventDetailComponent implements OnInit {
  showPassword = false;
  selectedRsvp: RsvpStatus | null = null;

  event: RegimentEvent = {
    id: 'ev1',
    title: 'Grand Autumn Campaign — Line Battle',
    description: `Soldiers of the Lords Regiment — this Saturday we take the field for the Grand Autumn Campaign Line Battle. Full regimental turnout is expected. All ranks from Corporal upwards are required to attend in dress uniform.\n\nFall in at 19:30 UTC for roll call. Battle commences at 20:00 UTC sharp. Officers are to report to the command tent fifteen minutes prior for briefing.\n\nBring honour to the regiment.`,
    serverName: 'Lords Regiment Official #1',
    serverPassword: 'LR2026au',
    date: '2026-06-07',
    startTime: '19:30',
    endTime: '22:00',
    timezone: 'UTC',
    platforms: ['steam', 'xbox'],
    status: 'upcoming',
    recurring: 'Weekly — Saturdays',
    tags: ['line-battle', 'campaign', 'mandatory'],
    rsvpCounts: { interested: 24, tentative: 8, declined: 3, neutral: 5 },
    attendees: [
      'Jameson Nolt', 'Alistair Holcombe', 'Sade Wren', 'Diego Vasquez',
      'Rhett Asher', 'Mara Erskine', 'Conrad Ashe', 'Theo Kiran',
    ],
    bannerUrl: '',
    notifyBefore: ['1 hour', '30 minutes'],
  };

  attendees = [
    { name: 'Jameson Nolt', initials: 'JN' },
    { name: 'Alistair Holcombe', initials: 'AH' },
    { name: 'Sade Wren', initials: 'SW' },
    { name: 'Diego Vasquez', initials: 'DV' },
    { name: 'Rhett Asher', initials: 'RA' },
    { name: 'Mara Erskine', initials: 'ME' },
    { name: 'Conrad Ashe', initials: 'CA' },
    { name: 'Theo Kiran', initials: 'TK' },
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    // In production, load event by id via EventsService
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  setRsvp(status: RsvpStatus): void {
    this.selectedRsvp = status;
  }

  get rsvpTotal(): number {
    const c = this.event.rsvpCounts;
    return c.interested + c.tentative + c.declined + c.neutral;
  }
}
