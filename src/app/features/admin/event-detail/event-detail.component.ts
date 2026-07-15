import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentEvent, RsvpStatus } from '../../../core/models/event.model';
import { EventsService } from '../../../core/services/events.service';
import { AuthService } from '../../../core/services/auth.service';

interface AttendeeVM {
    name: string;
    initials: string;
}

@Component({
    selector: 'app-event-detail',
    templateUrl: './event-detail.component.html',
    styleUrls: ['./event-detail.component.scss'],
    standalone: false,
})
export class EventDetailComponent implements OnInit {
    showPassword = false;
    selectedRsvp: RsvpStatus | null = null;
    eventId: string | null = null;

    event: RegimentEvent | null = null;
    attendees: AttendeeVM[] = [];

    /** Populated by the dedicated reveal endpoint (RevealEventPasswords) — never in the event body. */
    revealedPassword: string | null = null;
    revealing = false;
    working = false;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private route: ActivatedRoute,
        private eventsService: EventsService,
        private auth: AuthService,
        private router: Router,
    ) {}

    /** Capability gate for a template action (see the spec's capability keys). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    ngOnInit(): void {
        this.eventId = this.route.snapshot.paramMap.get('id');
        if (!this.eventId) {
            return;
        }
        // Member projection: carries the caller's own RSVP so the buttons reflect
        // the existing choice (T-0094) and the server binding for enrolled members.
        this.eventsService
            .getMineById(this.eventId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (event) => {
                    this.event = event;
                    this.selectedRsvp = event.myRsvp ?? null;
                },
                error: (err) => console.error('Failed to load event', err),
            });

        if (this.can('view_members_directory')) {
            this.eventsService
                .getAttendees(this.eventId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (rows) => {
                        this.attendees = rows.map((a) => {
                            const name = a.name ?? a.memberId;
                            return { name, initials: this.initials(name) };
                        });
                    },
                    error: (err) => console.error('Failed to load attendees', err),
                });
        }
    }

    private initials(name: string): string {
        return name
            .split(' ')
            .map((s) => s[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    /** Reveal the decrypted server password (once) then toggle its visibility. */
    togglePassword(): void {
        if (this.revealedPassword !== null) {
            this.showPassword = !this.showPassword;
            return;
        }
        if (!this.eventId || this.revealing || !this.can('reveal_event_passwords')) {
            return;
        }
        this.revealing = true;
        this.eventsService
            .revealPassword(this.eventId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.revealedPassword = res.serverPassword ?? '';
                    this.showPassword = true;
                    this.revealing = false;
                },
                error: (err) => {
                    console.error('Failed to reveal server password', err);
                    this.revealing = false;
                },
            });
    }

    setRsvp(status: RsvpStatus): void {
        if (!this.eventId) {
            return;
        }
        this.eventsService
            .rsvp(this.eventId, status)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (event) => {
                    this.event = event;
                    this.selectedRsvp = status;
                },
                error: (err) => console.error('Failed to record RSVP', err),
            });
    }

    archive(): void {
        if (!this.eventId || this.working) {
            return;
        }
        if (!confirm('Archive this event? It will be hidden from the public calendar.')) {
            return;
        }
        this.working = true;
        this.eventsService
            .archive(this.eventId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (event) => {
                    this.event = event;
                    this.working = false;
                },
                error: (err) => {
                    console.error('Failed to archive event', err);
                    this.working = false;
                },
            });
    }

    complete(): void {
        if (!this.eventId || this.working) {
            return;
        }
        if (!confirm('Mark this event complete? It will move to Previous operations.')) {
            return;
        }
        this.working = true;
        this.eventsService
            .complete(this.eventId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (event) => {
                    this.event = event;
                    this.working = false;
                },
                error: (err) => {
                    console.error('Failed to complete event', err);
                    this.working = false;
                },
            });
    }

    remove(): void {
        if (!this.eventId || this.working) {
            return;
        }
        if (!confirm('Delete this event permanently? This cannot be undone.')) {
            return;
        }
        this.working = true;
        this.eventsService
            .delete(this.eventId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.router.navigateByUrl('/app/dashboard/events'),
                error: (err) => {
                    console.error('Failed to delete event', err);
                    this.working = false;
                },
            });
    }

    get rsvpTotal(): number {
        if (!this.event) {
            return 0;
        }
        const c = this.event.rsvpCounts;
        return c.interested + c.tentative + c.declined + c.neutral;
    }
}
