import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { RegimentEvent } from '../models/event.model';

const STUB_EVENTS: RegimentEvent[] = [
    {
        id: 'ev1',
        title: 'Thursday Line Battle',
        description:
            'Weekly organised line battle against allied regiments. Full uniform required. Officers to coordinate flanks.',
        serverName: 'HF | Organised Events',
        serverPassword: 'holdfast2026',
        date: '2026-06-06',
        startTime: '20:00',
        endTime: '23:00',
        timezone: 'America/New_York',
        platforms: ['steam'],
        status: 'upcoming',
        recurring: 'weekly',
        tags: ['line-battle', 'required'],
        rsvpCounts: { interested: 8, tentative: 2, declined: 1, neutral: 3 },
        attendees: ['m1', 'm2', 'm3', 'm4', 'm5'],
        notifyBefore: ['1h', '30m'],
    },
    {
        id: 'ev2',
        title: 'Saturday Siege Night',
        description: 'Casual siege event. Mercenaries welcome. No formal uniform required.',
        serverName: 'HF | Siege Server',
        date: '2026-06-08',
        startTime: '19:30',
        endTime: '22:00',
        timezone: 'America/New_York',
        platforms: ['steam', 'xbox'],
        status: 'upcoming',
        tags: ['siege', 'casual', 'open'],
        rsvpCounts: { interested: 5, tentative: 3, declined: 0, neutral: 6 },
        notifyBefore: ['2h'],
    },
    {
        id: 'ev3',
        title: 'Officer Training Drill',
        description:
            'Command and communication drill for officers and NCOs. Mandatory for promotions.',
        serverName: 'HF | Training Server',
        serverPassword: 'officers',
        date: '2026-06-04',
        startTime: '18:00',
        endTime: '19:30',
        timezone: 'America/New_York',
        platforms: ['steam'],
        status: 'ongoing',
        tags: ['training', 'officers'],
        rsvpCounts: { interested: 4, tentative: 0, declined: 0, neutral: 0 },
        attendees: ['m1', 'm2', 'm3', 'm4'],
    },
    {
        id: 'ev4',
        title: 'May Grand Campaign — Final Assault',
        description: 'Epic 3-hour campaign finale. Regiment performed exceptionally.',
        serverName: 'EU Campaign Server',
        date: '2026-05-25',
        startTime: '20:00',
        endTime: '23:00',
        timezone: 'America/New_York',
        platforms: ['steam'],
        status: 'previous',
        tags: ['campaign', 'major-event'],
        rsvpCounts: { interested: 10, tentative: 1, declined: 2, neutral: 1 },
        attendees: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'],
    },
    {
        id: 'ev5',
        title: 'Recruitment Open House',
        description:
            'Open server event for prospective members. Show off our drill and discipline.',
        serverName: 'HF | Public Server',
        date: '2026-06-15',
        startTime: '17:00',
        endTime: '19:00',
        timezone: 'America/New_York',
        platforms: ['steam', 'xbox', 'ps'],
        status: 'upcoming',
        tags: ['recruitment', 'open', 'casual'],
        rsvpCounts: { interested: 6, tentative: 2, declined: 0, neutral: 4 },
        notifyBefore: ['24h', '1h'],
    },
];

@Injectable({ providedIn: 'root' })
export class EventsService {
    // TODO: replace with HttpClient calls to /api/events

    getAll(): Observable<RegimentEvent[]> {
        return of(STUB_EVENTS);
    }

    getById(id: string): Observable<RegimentEvent | undefined> {
        return of(STUB_EVENTS.find((e) => e.id === id));
    }

    create(event: Omit<RegimentEvent, 'id'>): Observable<RegimentEvent> {
        // TODO: POST /api/events
        const newEvent: RegimentEvent = {
            ...event,
            id: `ev${Date.now()}`,
        };
        STUB_EVENTS.push(newEvent);
        return of(newEvent);
    }

    update(id: string, changes: Partial<RegimentEvent>): Observable<RegimentEvent | undefined> {
        // TODO: PATCH /api/events/:id
        const idx = STUB_EVENTS.findIndex((e) => e.id === id);
        if (idx !== -1) {
            STUB_EVENTS[idx] = { ...STUB_EVENTS[idx], ...changes };
            return of(STUB_EVENTS[idx]);
        }
        return of(undefined);
    }
}
