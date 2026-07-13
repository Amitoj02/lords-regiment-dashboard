import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { EventsAdminComponent } from './events-admin.component';
import { EventsService } from '../../../core/services/events.service';
import { AuthService } from '../../../core/services/auth.service';
import { RegimentEvent } from '../../../core/models/event.model';

function event(overrides: Partial<RegimentEvent> = {}): RegimentEvent {
    return {
        id: 'ev1',
        title: 'Line Battle',
        description: 'Fall in.',
        serverName: 'LR #1',
        date: '2026-06-07',
        startTime: '19:30',
        endTime: '22:00',
        timezone: 'UTC',
        platforms: ['steam'],
        status: 'upcoming',
        tags: ['line-battle'],
        rsvpCounts: { interested: 2, tentative: 1, declined: 0, neutral: 0 },
        ...overrides,
    };
}

describe('EventsAdminComponent', () => {
    let fixture: ComponentFixture<EventsAdminComponent>;
    let component: EventsAdminComponent;
    let eventsService: jasmine.SpyObj<EventsService>;

    function setup(events: RegimentEvent[]): void {
        eventsService = jasmine.createSpyObj<EventsService>('EventsService', ['getAllMine']);
        eventsService.getAllMine.and.returnValue(of(events));
        const auth = jasmine.createSpyObj<AuthService>('AuthService', ['hasCapability']);
        auth.hasCapability.and.returnValue(true);

        TestBed.configureTestingModule({
            imports: [CommonModule, RouterModule.forRoot([])],
            declarations: [EventsAdminComponent],
            providers: [
                { provide: EventsService, useValue: eventsService },
                { provide: AuthService, useValue: auth },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(EventsAdminComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('groups events by status and lists a row per event', () => {
        setup([
            event({ id: 'a', status: 'ongoing' }),
            event({ id: 'b', status: 'upcoming' }),
            event({ id: 'c', status: 'previous' }),
        ]);
        expect(component.ongoingEvents.length).toBe(1);
        expect(component.upcomingEvents.length).toBe(1);
        expect(component.previousEvents.length).toBe(1);
        const rows = fixture.nativeElement.querySelectorAll('tbody tr');
        expect(rows.length).toBe(3);
    });

    it('renders a Manage link per event and the New event link', () => {
        setup([event({ id: 'ev1', status: 'upcoming' })]);
        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelector('a[href="/dashboard/events/ev1"]')).toBeTruthy();
        expect(el.querySelector('a[href="/dashboard/events/create"]')).toBeTruthy();
    });

    it('shows an empty state when there are no events', () => {
        setup([]);
        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelector('.empty')).toBeTruthy();
        expect(el.querySelectorAll('tbody tr').length).toBe(0);
    });
});
