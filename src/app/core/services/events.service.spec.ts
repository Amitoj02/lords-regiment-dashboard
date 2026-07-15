import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EventsService } from './events.service';
import { ApiEvent, PaginatedResponse } from '../models/api.model';
import { RegimentEvent } from '../models/event.model';

function apiEvent(overrides: Partial<ApiEvent> = {}): ApiEvent {
    return {
        id: 'ev1',
        title: 'Line Battle',
        description: 'Fall in.',
        bannerUrl: null,
        startsAt: '2026-06-07T19:30:00',
        endsAt: '2026-06-07T22:00:00',
        timezone: 'UTC',
        status: 'upcoming',
        isRecurring: false,
        expectedAttendance: null,
        attendanceGoal: null,
        outcome: null,
        twitchUrl: null,
        platforms: ['steam'],
        tags: ['line-battle'],
        rsvpCounts: { interested: 2, tentative: 1, declined: 0, neutral: 0 },
        attendeesCount: 3,
        serverName: 'LR #1',
        serverRegion: 'EU',
        recurrenceRule: null,
        recurrenceCadence: null,
        recurrenceActive: false,
        notifyOffsets: [60, 15],
        isArchived: false,
        myRsvp: null,
        ...overrides,
    };
}

function page(data: ApiEvent[]): PaginatedResponse<ApiEvent> {
    return {
        data,
        meta: {
            page: 1,
            limit: 100,
            total: data.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
        },
    };
}

describe('EventsService', () => {
    let service: EventsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(EventsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getAll() requests the first page and maps the wall-clock parts', () => {
        let result: RegimentEvent[] | undefined;
        service.getAll().subscribe((events) => (result = events));

        const req = httpMock.expectOne('/api/events?limit=100');
        expect(req.request.method).toBe('GET');
        req.flush(page([apiEvent()]));

        expect(result?.length).toBe(1);
        expect(result?.[0].date).toBe('2026-06-07');
        expect(result?.[0].startTime).toBe('19:30');
        expect(result?.[0].endTime).toBe('22:00');
        // The server password is never in the list projection.
        expect(result?.[0].serverPassword).toBeUndefined();
        // notifyOffsets → compact labels.
        expect(result?.[0].notifyBefore).toEqual(['1h', '15m']);
    });

    it('getAll(status) forwards the status filter', () => {
        service.getAll('previous').subscribe();
        const req = httpMock.expectOne('/api/events?status=previous&limit=100');
        expect(req.request.method).toBe('GET');
        req.flush(page([]));
    });

    it('create() maps the view model onto the create DTO', () => {
        const event: Omit<RegimentEvent, 'id'> = {
            title: 'Drill',
            description: 'Orders',
            serverName: 'LR #2',
            serverPassword: 'secret',
            date: '2026-07-01',
            endDate: '2026-07-02',
            startTime: '20:00',
            endTime: '21:00',
            timezone: 'UTC',
            platforms: ['steam'],
            status: 'upcoming',
            recurrenceCadence: 'weekly',
            tags: ['drill'],
            rsvpCounts: { interested: 0, tentative: 0, declined: 0, neutral: 0 },
            bannerKey: 'events/reg/uuid.png',
            notifyBefore: ['1h'],
        };
        service.create(event).subscribe();

        const req = httpMock.expectOne('/api/events');
        expect(req.request.method).toBe('POST');
        expect(req.request.body.startsAt).toBe('2026-07-01T20:00:00');
        // endsAt uses the separate end date (T-0089).
        expect(req.request.body.endsAt).toBe('2026-07-02T21:00:00');
        expect(req.request.body.serverPassword).toBe('secret');
        // Structured cadence (T-0090) — no legacy isRecurring/recurrenceRule.
        expect(req.request.body.recurrenceCadence).toBe('weekly');
        expect(req.request.body.isRecurring).toBeUndefined();
        expect(req.request.body.bannerKey).toBe('events/reg/uuid.png');
        expect(req.request.body.notifyOffsets).toEqual([60]);
        // No draft flag is ever sent (T-0091).
        expect(req.request.body.isDraft).toBeUndefined();
        req.flush(apiEvent());
    });

    it('getAllMine() requests the member calendar and maps myRsvp', () => {
        let result: RegimentEvent[] | undefined;
        service.getAllMine('upcoming').subscribe((events) => (result = events));
        const req = httpMock.expectOne('/api/events/mine?status=upcoming&limit=100');
        expect(req.request.method).toBe('GET');
        req.flush(
            page([apiEvent({ myRsvp: { status: 'interested', reminderOffsetMinutes: null } })]),
        );
        expect(result?.[0].myRsvp).toBe('interested');
    });

    it('getMineById() hits the member detail endpoint', () => {
        service.getMineById('ev1').subscribe();
        const req = httpMock.expectOne('/api/events/mine/ev1');
        expect(req.request.method).toBe('GET');
        req.flush(apiEvent());
    });

    it('rsvp() posts the status + reminder offset', () => {
        service.rsvp('ev1', 'interested', 30).subscribe();
        const req = httpMock.expectOne('/api/events/ev1/rsvp');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ status: 'interested', reminderOffsetMinutes: 30 });
        req.flush(apiEvent());
    });

    it('revealPassword() hits the dedicated reveal endpoint', () => {
        let revealed: { serverPassword: string | null } | undefined;
        service.revealPassword('ev1').subscribe((r) => (revealed = r));
        const req = httpMock.expectOne('/api/events/ev1/reveal-password');
        expect(req.request.method).toBe('POST');
        req.flush({ serverName: 'LR #1', serverRegion: 'EU', serverPassword: 'topsecret' });
        expect(revealed?.serverPassword).toBe('topsecret');
    });

    it('delete() issues a DELETE', () => {
        service.delete('ev1').subscribe();
        const req = httpMock.expectOne('/api/events/ev1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
