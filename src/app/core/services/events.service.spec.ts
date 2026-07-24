import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EventsService } from './events.service';
import { ApiEvent, PaginatedResponse } from '../models/api.model';
import { instantToWallClock } from '../models/event-time';
import { RegimentEvent } from '../models/event.model';

function apiEvent(overrides: Partial<ApiEvent> = {}): ApiEvent {
    return {
        id: 'ev1',
        title: 'Line Battle',
        description: 'Fall in.',
        bannerUrl: null,
        // Z-qualified on purpose. The real API always emits `.toISOString()`, and
        // an offset-LESS fixture is parsed as browser-local — which would make
        // every assertion below depend on the machine's own timezone once the
        // mapper converts to viewer-local time.
        startsAt: '2026-06-07T19:30:00.000Z',
        endsAt: '2026-06-07T22:00:00.000Z',
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
        // Presence flags are on EVERY projection, public included (T-0151).
        hasServerName: true,
        hasServerPassword: false,
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

    /**
     * The zone the specs pretend the VIEWER is in. `mapEvent` converts display
     * times to whatever zone the browser reports (T-0237), so unpinned
     * expectations would be machine-dependent — and worse, would still PASS on a
     * UTC CI box for the exact bug this fixes, because a literal ISO slice and a
     * UTC conversion agree. Reassign it inside a spec to move the "viewer".
     */
    let viewerZone = 'UTC';

    beforeEach(() => {
        viewerZone = 'UTC';
        const resolved = Intl.DateTimeFormat.prototype.resolvedOptions;
        spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').and.callFake(function (
            this: Intl.DateTimeFormat,
        ) {
            return { ...resolved.call(this), timeZone: viewerZone };
        });

        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
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
        // Resolved in the EVENT's zone (T-0251) — UTC here, so the instant reads
        // back as the wall clock that was typed.
        expect(req.request.body.startsAt).toBe('2026-07-01T20:00:00.000Z');
        // endsAt uses the separate end date (T-0089).
        expect(req.request.body.endsAt).toBe('2026-07-02T21:00:00.000Z');
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
        const req = httpMock.expectOne('/api/events/mine?limit=100&status=upcoming');
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

    it('getRsvps() fetches the RSVP roster (T-0203)', () => {
        let roster:
            | { memberId: string; name: string | null; avatarUrl: string | null; status: string }[]
            | undefined;
        service.getRsvps('ev1').subscribe((r) => (roster = r));
        const req = httpMock.expectOne('/api/events/ev1/rsvps');
        expect(req.request.method).toBe('GET');
        req.flush([
            { memberId: 'm1', name: 'Nolt', avatarUrl: null, status: 'interested' },
            { memberId: 'm2', name: null, avatarUrl: 'https://x/a.png', status: 'tentative' },
        ]);
        expect(roster?.length).toBe(2);
        expect(roster?.[0].status).toBe('interested');
    });

    it('delete() issues a DELETE', () => {
        service.delete('ev1').subscribe();
        const req = httpMock.expectOne('/api/events/ev1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    it('deleteSeries() DELETEs the /series endpoint (T-0099)', () => {
        service.deleteSeries('ev1').subscribe();
        const req = httpMock.expectOne('/api/events/ev1/series');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    /**
     * Display (T-0237) and authoring (T-0251) are one change, not two: the form
     * prefills through the read conversion and submits through the write one, so
     * shipping either alone shifts every edited event by an offset. These specs
     * pin the two directions AND the invariant that binds them.
     */
    describe('timezone conversion (T-0237 display / T-0251 authoring)', () => {
        /** Read one mapped event out of the public feed. */
        function fetchOne(overrides: Partial<ApiEvent>): RegimentEvent {
            let result: RegimentEvent[] | undefined;
            service.getAll().subscribe((events) => (result = events));
            httpMock.expectOne('/api/events?limit=100').flush(page([apiEvent(overrides)]));
            return result![0];
        }

        it('renders the stored instant in the VIEWER zone, not the literal ISO slice', () => {
            viewerZone = 'America/New_York';
            const event = fetchOne({ startsAt: '2026-07-21T01:57:00.000Z', endsAt: null });
            // The old mapper sliced the string and printed 01:57 — the stored UTC
            // instant — while labelling it with the event's own timezone.
            expect(event.startTime).toBe('21:57');
        });

        it('gives a cross-midnight event its LOCAL date, not the stored one', () => {
            viewerZone = 'America/New_York';
            const event = fetchOne({
                startsAt: '2026-07-21T01:57:00.000Z',
                endsAt: '2026-07-21T04:00:00.000Z',
            });
            // Both instants are stored on the 21st (UTC); locally the event starts
            // on the 20th and ends on the 21st, so the END DATE is a real, separate
            // fact the old literal slice could never produce.
            expect(event.date).toBe('2026-07-20');
            expect(event.endDate).toBe('2026-07-21');
            expect(event.endTime).toBe('00:00');
        });

        it('uses the offset in force ON THAT DATE, not a fixed one', () => {
            viewerZone = 'America/New_York';
            // Same stored wall clock either side of the DST boundary: -4 (EDT) in
            // July, -5 (EST) in January. A fixed offset gets one of them wrong.
            expect(fetchOne({ startsAt: '2026-07-21T18:00:00.000Z' }).startTime).toBe('14:00');
            expect(fetchOne({ startsAt: '2026-01-21T18:00:00.000Z' }).startTime).toBe('13:00');
        });

        it('labels the rendered time with the VIEWER zone, so it is not mistaken', () => {
            const event = fetchOne({ startsAt: '2026-07-21T18:00:00.000Z' });
            // The label is Intl's own short name for the viewer's zone; assert it
            // is present rather than pinning a locale-specific spelling.
            expect(event.zoneLabel).toBeTruthy();
        });

        it('keeps the raw instants so authoring can leave the viewer zone', () => {
            const event = fetchOne({
                startsAt: '2026-07-21T01:57:00.000Z',
                endsAt: '2026-07-21T04:00:00.000Z',
            });
            expect(event.startsAt).toBe('2026-07-21T01:57:00.000Z');
            expect(event.endsAt).toBe('2026-07-21T04:00:00.000Z');
        });

        it('falls back to the literal slice for an instant Intl cannot parse', () => {
            const event = fetchOne({ startsAt: 'not-a-date', endsAt: null });
            // Degrade to something readable rather than rendering NaN.
            expect(event.date).toBe('not-a-date');
        });

        it('submits the wall clock resolved in the EVENT zone, not the viewer one', () => {
            // The admin is in Berlin; the event is Eastern. 20:00 means 20:00 in
            // NEW YORK — resolving it against the viewer would be four hours out.
            viewerZone = 'Europe/Berlin';
            service
                .update('ev1', {
                    date: '2026-07-01',
                    startTime: '20:00',
                    endTime: '22:00',
                    timezone: 'America/New_York',
                })
                .subscribe();
            const req = httpMock.expectOne('/api/events/ev1');
            expect(req.request.body.startsAt).toBe('2026-07-02T00:00:00.000Z');
            expect(req.request.body.endsAt).toBe('2026-07-02T02:00:00.000Z');
            req.flush(apiEvent());
        });

        it('re-resolves the same wall clock to a NEW instant when only the zone changes', () => {
            const post = (timezone: string): string => {
                service
                    .update('ev1', { date: '2026-07-01', startTime: '20:00', timezone })
                    .subscribe();
                const req = httpMock.expectOne('/api/events/ev1');
                const startsAt = req.request.body.startsAt as string;
                req.flush(apiEvent());
                return startsAt;
            };
            // Changing the dropdown alone is a real edit: the wall clock is held
            // and the instant moves, which is what an admin means by that change.
            expect(post('America/New_York')).toBe('2026-07-02T00:00:00.000Z');
            expect(post('Europe/Berlin')).toBe('2026-07-01T18:00:00.000Z');
        });

        it('sends the naive wall clock when a PATCH omits the timezone', () => {
            // The backend anchors a naive value to the event's STORED zone, which
            // is right; guessing the VIEWER's zone here would move the event.
            viewerZone = 'Europe/Berlin';
            service.update('ev1', { date: '2026-07-01', startTime: '20:00' }).subscribe();
            const req = httpMock.expectOne('/api/events/ev1');
            expect(req.request.body.startsAt).toBe('2026-07-01T20:00:00');
            req.flush(apiEvent());
        });

        it('reads Ongoing between the LOCAL start and end, not Concluded', () => {
            // The detail banner reads this. Status is derived from the absolute
            // instants, so it must not follow whichever wall clock is on screen —
            // and it must not trust the backend's up-to-60s-stale value.
            const now = Date.now();
            viewerZone = 'Asia/Tokyo';
            const event = fetchOne({
                startsAt: new Date(now - 60 * 60 * 1000).toISOString(),
                endsAt: new Date(now + 60 * 60 * 1000).toISOString(),
                status: 'previous',
            });
            expect(event.status).toBe('ongoing');
        });

        it('round-trips: display then save-back preserves the instant exactly', () => {
            // THE invariant. Display converts to the viewer, authoring converts
            // from the event zone; if they ever stop being inverses, a no-op edit
            // silently walks the event by the offset between the two.
            viewerZone = 'Europe/Berlin';
            const event = fetchOne({
                startsAt: '2026-07-21T01:57:00.000Z',
                endsAt: '2026-07-21T04:00:00.000Z',
                timezone: 'America/New_York',
            });
            // Re-derive the authoring wall clock the edit form prefills with.
            const start = instantToWallClock(event.startsAt!, event.timezone)!;
            const end = instantToWallClock(event.endsAt!, event.timezone)!;
            service
                .update(event.id, {
                    date: start.date,
                    startTime: start.time,
                    endDate: end.date,
                    endTime: end.time,
                    timezone: event.timezone,
                })
                .subscribe();
            const req = httpMock.expectOne(`/api/events/${event.id}`);
            expect(req.request.body.startsAt).toBe('2026-07-21T01:57:00.000Z');
            expect(req.request.body.endsAt).toBe('2026-07-21T04:00:00.000Z');
            req.flush(apiEvent());
        });
    });

    /**
     * The presence flags reach the view model unchanged (T-0236): every surface
     * branches on THEM, not on the redacted `serverName`, because the public feed
     * carries the flags but never the binding itself.
     */
    describe('server presence flags (T-0236)', () => {
        it('keeps serverName null rather than coercing it to an empty string', () => {
            let result: RegimentEvent | undefined;
            service.getById('ev1').subscribe((e) => (result = e));
            httpMock
                .expectOne('/api/events/ev1')
                .flush(apiEvent({ serverName: undefined, hasServerName: false }));
            expect(result?.serverName).toBeNull();
            expect(result?.hasServerName).toBe(false);
        });

        it('maps both flags through from a public projection that omits the binding', () => {
            let result: RegimentEvent | undefined;
            service.getById('ev1').subscribe((e) => (result = e));
            httpMock.expectOne('/api/events/ev1').flush(
                apiEvent({
                    serverName: undefined,
                    hasServerName: true,
                    hasServerPassword: true,
                }),
            );
            expect(result?.hasServerName).toBe(true);
            expect(result?.hasServerPassword).toBe(true);
            expect(result?.serverName).toBeNull();
        });
    });
});
