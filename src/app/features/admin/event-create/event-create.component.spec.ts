import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
// FormsModule as well as ReactiveFormsModule: the tag box is a standalone
// [(ngModel)] living inside the reactive form.
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { mapEvent, ApiEvent } from '../../../core/models/api.model';
import { wallClockToInstant } from '../../../core/models/event-time';
import { RegimentEvent } from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { DEFAULT_STORAGE_POLICY, StorageService } from '../../../core/services/storage.service';
import { EventCreateComponent } from './event-create.component';

/**
 * The T-0237/T-0251 pair, end to end through the component that makes them one
 * change: the form PREFILLS through the read conversion and SUBMITS through the
 * write one. If display converts to the viewer's zone but authoring does not
 * convert back out of it, every save walks the event by the offset between the
 * admin's zone and the event's — silently, with no failing request to notice.
 */
function apiEvent(overrides: Partial<ApiEvent> = {}): ApiEvent {
    return {
        id: 'ev1',
        title: 'Line Battle',
        description: 'Fall in.',
        bannerUrl: null,
        // 21:57 on 2026-07-20 in New York (EDT, -4) — deliberately across UTC
        // midnight so a zone slip shows up as a different DATE, not just a time.
        startsAt: '2026-07-21T01:57:00.000Z',
        endsAt: '2026-07-21T04:00:00.000Z',
        timezone: 'America/New_York',
        status: 'upcoming',
        isRecurring: false,
        expectedAttendance: null,
        attendanceGoal: null,
        outcome: null,
        twitchUrl: null,
        platforms: ['steam'],
        tags: ['line-battle'],
        rsvpCounts: { interested: 0, tentative: 0, declined: 0, neutral: 0 },
        attendeesCount: 0,
        hasServerName: true,
        hasServerPassword: false,
        serverName: 'LR #1',
        serverRegion: 'EU',
        recurrenceCadence: null,
        recurrenceActive: false,
        notifyOffsets: [60],
        isArchived: false,
        myRsvp: null,
        ...overrides,
    };
}

describe('EventCreateComponent', () => {
    let fixture: ComponentFixture<EventCreateComponent>;
    let component: EventCreateComponent;
    let eventsService: jasmine.SpyObj<EventsService>;
    let router: { navigate: jasmine.Spy };

    /** The zone the specs pretend the ADMIN's browser is in (see events.service.spec). */
    let viewerZone = 'UTC';

    beforeEach(() => {
        viewerZone = 'Europe/Berlin';
        const resolved = Intl.DateTimeFormat.prototype.resolvedOptions;
        spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').and.callFake(function (
            this: Intl.DateTimeFormat,
        ) {
            return { ...resolved.call(this), timeZone: viewerZone };
        });
    });

    function setup(editId: string | null, event?: RegimentEvent): void {
        eventsService = jasmine.createSpyObj<EventsService>('EventsService', [
            'getMineById',
            'create',
            'update',
        ]);
        if (event) {
            eventsService.getMineById.and.returnValue(of(event));
        }
        eventsService.create.and.returnValue(of(event ?? mapEvent(apiEvent())));
        eventsService.update.and.returnValue(of(event ?? mapEvent(apiEvent())));

        const auth = jasmine.createSpyObj<AuthService>('AuthService', ['hasCapability']);
        auth.hasCapability.and.returnValue(true);
        const storage = jasmine.createSpyObj<StorageService>('StorageService', [
            'getPolicy',
            'upload',
        ]);
        storage.getPolicy.and.returnValue(of(DEFAULT_STORAGE_POLICY));
        router = { navigate: jasmine.createSpy('navigate') };

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule, ReactiveFormsModule],
            declarations: [EventCreateComponent],
            providers: [
                { provide: EventsService, useValue: eventsService },
                { provide: AuthService, useValue: auth },
                { provide: StorageService, useValue: storage },
                { provide: Router, useValue: router },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap(editId ? { id: editId } : {}),
                        },
                    },
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(EventCreateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    describe('editing an existing event (T-0251)', () => {
        it('prefills the wall clock in the EVENT zone, not the admin browser zone', () => {
            // The admin is in Berlin; the event is Eastern. Prefilling from the
            // display fields would show 03:57 on the 21st (Berlin) and re-save the
            // event three hours late.
            setup('ev1', mapEvent(apiEvent()));
            const v = component.form.value;
            expect(v.date).toBe('2026-07-20');
            expect(v.startTime).toBe('21:57');
            expect(v.endDate).toBe('2026-07-21');
            expect(v.endTime).toBe('00:00');
            expect(v.timezone).toBe('America/New_York');
        });

        it('a save with no edits resolves back to the very same instants', () => {
            // The invariant that makes display and authoring ONE change: an
            // untouched round-trip through the form must be a no-op on the wire.
            setup('ev1', mapEvent(apiEvent()));
            component.save();
            const body = eventsService.update.calls.mostRecent().args[1];
            expect(wallClockToInstant(body.date!, body.startTime!, body.timezone)).toBe(
                '2026-07-21T01:57:00.000Z',
            );
            expect(wallClockToInstant(body.endDate!, body.endTime!, body.timezone)).toBe(
                '2026-07-21T04:00:00.000Z',
            );
        });

        it('holds the wall clock when only the timezone dropdown changes', () => {
            setup('ev1', mapEvent(apiEvent()));
            component.form.patchValue({ timezone: 'Europe/Berlin' });
            component.save();
            const body = eventsService.update.calls.mostRecent().args[1];
            // Same wall clock, new zone — the admin means "this time, over there",
            // which resolves to a different instant.
            expect(body.date).toBe('2026-07-20');
            expect(body.startTime).toBe('21:57');
            expect(body.timezone).toBe('Europe/Berlin');
        });

        it('falls back to the display parts when the API omitted the instants', () => {
            const event = mapEvent(apiEvent());
            const legacy: RegimentEvent = { ...event, startsAt: undefined, endsAt: undefined };
            setup('ev1', legacy);
            expect(component.form.value.date).toBe(event.date);
            expect(component.form.value.startTime).toBe(event.startTime);
        });

        it('prefills a blank server name rather than the string "null"', () => {
            setup('ev1', mapEvent(apiEvent({ serverName: null, hasServerName: false })));
            expect(component.form.value.serverName).toBe('');
        });
    });

    it('creates (not updates) when there is no id in the route', () => {
        setup(null);
        component.form.patchValue({ title: 'Drill', date: '2026-08-01' });
        component.save();
        expect(eventsService.create).toHaveBeenCalled();
        expect(eventsService.update).not.toHaveBeenCalled();
        // The zone the admin picked rides along so the service can resolve it.
        expect(eventsService.create.calls.mostRecent().args[0].timezone).toBe('America/New_York');
    });

    // T-0287: authoring stayed under /app, the detail page did not — a save that
    // still redirected into the console would land on a route that is gone.
    it('reads a saved event back at its PUBLIC detail URL', () => {
        setup(null);
        component.form.patchValue({ title: 'Drill', date: '2026-08-01' });
        component.save();
        expect(router.navigate).toHaveBeenCalledWith(['/events', 'ev1']);
    });
});
