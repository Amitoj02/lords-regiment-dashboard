import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { RegimentEvent } from '../../../core/models/event.model';
import { EventsService } from '../../../core/services/events.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-event-create',
    templateUrl: './event-create.component.html',
    styleUrls: ['./event-create.component.scss'],
    standalone: false,
})
export class EventCreateComponent {
    form: FormGroup;
    showPassword = false;
    saving = false;

    readonly notifyOptions = ['15 minutes', '30 minutes', '1 hour', '2 hours', '1 day'];
    selectedNotify: string[] = ['1 hour'];

    /** Human notify labels → the compact form the service maps to minutes (see parseNotifyOffset). */
    private readonly notifyOffsets: Record<string, string> = {
        '15 minutes': '15m',
        '30 minutes': '30m',
        '1 hour': '1h',
        '2 hours': '2h',
        '1 day': '24h',
    };

    tagInput = '';
    tags: string[] = ['line-battle'];

    readonly platformOptions = [
        { id: 'steam', label: 'Steam' },
        { id: 'xbox', label: 'Xbox' },
        { id: 'ps', label: 'PlayStation' },
    ];
    selectedPlatforms: string[] = ['steam'];

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private fb: FormBuilder,
        private eventsService: EventsService,
        private auth: AuthService,
        private router: Router,
    ) {
        this.form = this.fb.group({
            title: ['', Validators.required],
            orders: [''],
            date: ['', Validators.required],
            startTime: ['19:30'],
            endTime: ['22:00'],
            timezone: ['UTC'],
            recurring: [false],
            serverName: [''],
            serverPassword: [''],
        });
    }

    /** Capability gate for a template action (see the spec's capability keys). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    toggleNotify(n: string): void {
        const idx = this.selectedNotify.indexOf(n);
        if (idx === -1) {
            this.selectedNotify.push(n);
        } else {
            this.selectedNotify.splice(idx, 1);
        }
    }

    isNotifySelected(n: string): boolean {
        return this.selectedNotify.includes(n);
    }

    togglePlatform(p: string): void {
        const idx = this.selectedPlatforms.indexOf(p);
        if (idx === -1) {
            this.selectedPlatforms.push(p);
        } else {
            this.selectedPlatforms.splice(idx, 1);
        }
    }

    isPlatformSelected(p: string): boolean {
        return this.selectedPlatforms.includes(p);
    }

    addTag(): void {
        const t = this.tagInput.trim();
        if (t && !this.tags.includes(t)) {
            this.tags.push(t);
        }
        this.tagInput = '';
    }

    removeTag(t: string): void {
        this.tags = this.tags.filter((tag) => tag !== t);
    }

    /** Assemble the frontend view model the events service maps onto the create DTO. */
    private buildEvent(): Omit<RegimentEvent, 'id'> {
        const v = this.form.value;
        return {
            title: v.title,
            description: v.orders ?? '',
            serverName: v.serverName ?? '',
            serverPassword: v.serverPassword || undefined,
            date: v.date,
            startTime: v.startTime,
            endTime: v.endTime,
            timezone: v.timezone,
            platforms: [...this.selectedPlatforms],
            status: 'upcoming',
            recurring: v.recurring ? 'Weekly' : undefined,
            tags: [...this.tags],
            rsvpCounts: { interested: 0, tentative: 0, declined: 0, neutral: 0 },
            notifyBefore: this.selectedNotify
                .map((label) => this.notifyOffsets[label])
                .filter((offset): offset is string => !!offset),
        };
    }

    saveDraft(): void {
        if (this.form.get('title')?.invalid || this.saving) {
            return;
        }
        this.saving = true;
        this.eventsService
            .create(this.buildEvent())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (event) => {
                    this.saving = false;
                    this.router.navigate(['/admin/events', event.id]);
                },
                error: (err) => {
                    console.error('Failed to save event draft', err);
                    this.saving = false;
                },
            });
    }

    publish(): void {
        if (this.form.invalid || this.saving) {
            return;
        }
        this.saving = true;
        this.eventsService
            .create(this.buildEvent())
            .pipe(
                switchMap((event) => this.eventsService.publish(event.id)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (event) => {
                    this.saving = false;
                    this.router.navigate(['/admin/events', event.id]);
                },
                error: (err) => {
                    console.error('Failed to publish event', err);
                    this.saving = false;
                },
            });
    }
}
