import { Component, DestroyRef, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentEvent } from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';

@Component({
    selector: 'hf-events-page',
    templateUrl: './events-page.component.html',
    styleUrls: ['./events-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class EventsPageComponent implements OnInit {
    ongoingEvent: RegimentEvent | null = null;
    upcomingEvents: RegimentEvent[] = [];
    previousEvents: RegimentEvent[] = [];

    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);

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

    /**
     * Whether the visitor has a session at all (T-0235). Deliberately NOT
     * `isMember()`: `/app/dashboard/events/:id` carries only `authGuard`, and the
     * API serves a non-enrolled caller a redacted 200 rather than a 403 — so an
     * applicant following this link lands on a real page, and forking on
     * membership here would only invent a dead end that does not exist.
     */
    get signedIn(): boolean {
        return this.auth.isAuthenticated();
    }

    /**
     * Where a CTA points: the in-shell event page for a signed-in visitor,
     * otherwise sign-in. Anonymous visitors cannot RSVP or reveal a password, so
     * routing them at the detail page would just bounce them off `authGuard`.
     */
    detailLink(event: RegimentEvent): unknown[] {
        return this.signedIn ? ['/app/dashboard/events', event.id] : ['/login'];
    }

    /** One CTA label for the whole page, so every call to action reads the same. */
    get ctaLabel(): string {
        return this.signedIn ? 'Open in dashboard' : 'Login to RSVP';
    }
}
