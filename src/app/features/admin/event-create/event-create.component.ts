import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { instantToWallClock } from '../../../core/models/event-time';
import { RecurrenceCadence, RegimentEvent } from '../../../core/models/event.model';
import { DiscordRole, DiscordService } from '../../../core/services/discord.service';
import { EventsService } from '../../../core/services/events.service';
import { AuthService } from '../../../core/services/auth.service';
import { DEFAULT_STORAGE_POLICY, StorageService } from '../../../core/services/storage.service';

@Component({
    selector: 'app-event-create',
    templateUrl: './event-create.component.html',
    styleUrls: ['./event-create.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class EventCreateComponent implements OnInit {
    form: FormGroup;
    showPassword = false;
    saving = false;

    /** Non-null when editing an existing event (T-0097). */
    editId: string | null = null;

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

    /** Recurrence options for the cadence selector (T-0090). '' = one-off. */
    readonly cadenceOptions: { value: '' | RecurrenceCadence; label: string }[] = [
        { value: '', label: 'Does not repeat' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
    ];

    /**
     * Guild roles offered by the "Role to ping" picker (T-0206).
     *
     * Empty is a perfectly normal state — the bot may be off, disconnected, or
     * simply not configured — so the picker degrades to its "No ping" option
     * rather than blocking the form. `announceRolesError` explains WHY it is
     * empty when the reason is knowable, because "no roles" and "we could not
     * ask" look identical in a dropdown and only one of them is the admin's
     * problem to fix.
     */
    announceRoles: DiscordRole[] = [];
    announceRolesError: string | null = null;

    tagInput = '';
    tags: string[] = ['line-battle'];
    /** Common tags surfaced as autocomplete suggestions (T-0088). */
    readonly tagSuggestions = [
        'line-battle',
        'siege',
        'training',
        'skirmish',
        'campaign',
        'social',
    ];

    readonly platformOptions = [
        { id: 'steam', label: 'Steam' },
        { id: 'xbox', label: 'Xbox' },
        { id: 'ps', label: 'PlayStation' },
    ];
    selectedPlatforms: string[] = ['steam'];

    // Banner upload (T-0093): a locally-selected file is uploaded to object
    // storage; the resulting key is submitted with the event.
    bannerKey: string | null = null;
    bannerPreview: string | null = null;
    bannerUploading = false;
    bannerError: string | null = null;
    /** Accepted-types + max-size hint, seeded from the static policy then refreshed
     * from GET /storage/policy so it mirrors the backend limit (T-0187). */
    bannerHint = StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'event-banner');

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private fb: FormBuilder,
        private eventsService: EventsService,
        private discord: DiscordService,
        private auth: AuthService,
        private storage: StorageService,
        private router: Router,
        private route: ActivatedRoute,
    ) {
        this.form = this.fb.group({
            title: ['', Validators.required],
            description: [''],
            date: ['', Validators.required],
            endDate: [''],
            startTime: ['19:30'],
            endTime: ['22:00'],
            // Default to Eastern (EST/EDT) per T-0089; members can change it.
            timezone: ['America/New_York'],
            recurrenceCadence: [''],
            // '' is a real value here, not a placeholder: it is how an author
            // says "announce this, but ping nobody".
            announceRoleId: [''],
            serverName: [''],
            serverRegion: [''],
            serverPassword: [''],
        });
    }

    ngOnInit(): void {
        // Refresh the banner hint from the live storage policy (T-0187); falls back
        // to the default already shown if the fetch fails.
        this.storage
            .getPolicy()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((policy) => {
                this.bannerHint = StorageService.uploadHint(policy, 'event-banner');
            });

        // The ping-role picker's options. Best-effort: a failure leaves the list
        // empty and the form fully usable, because an event that announces
        // silently is a normal event — not a broken one.
        this.discord
            .getRoles()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (roles) => {
                    // @everyone is dropped, not offered. Discord will not ping it
                    // from an explicit role allow-list — that needs `parse:
                    // ["everyone"]`, which the API deliberately never sends — so
                    // choosing it would render the words "@everyone" and notify
                    // nobody. A control that silently does nothing is worse than
                    // one that is absent.
                    this.announceRoles = roles.filter((r) => r.name !== '@everyone');
                    this.announceRolesError = this.announceRoles.length
                        ? null
                        : 'No Discord roles available — the bot is off or not connected.';
                },
                error: () => {
                    this.announceRolesError =
                        'Could not load Discord roles; the event will announce without a ping.';
                },
            });

        this.editId = this.route.snapshot.paramMap.get('id');
        if (this.editId) {
            this.eventsService
                .getMineById(this.editId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (event) => this.prefill(event),
                    error: (err) => console.error('Failed to load event for editing', err),
                });
        }
    }

    get isEdit(): boolean {
        return this.editId !== null;
    }

    /**
     * Populate the form + chip state from an existing event when editing (T-0097).
     *
     * The date/time fields are re-derived from the RAW instants in the EVENT's own
     * zone (T-0251) — deliberately not from `event.date`/`event.startTime`, which
     * `mapEvent` has already converted to the VIEWER's zone for display. An admin
     * in Berlin editing an Eastern event must see (and re-save) the Eastern wall
     * clock; prefilling the viewer's would shift the event by the offset between
     * the two on every save. Falls back to the display parts only when the API
     * omitted the instants.
     */
    private prefill(event: RegimentEvent): void {
        const start = (event.startsAt && instantToWallClock(event.startsAt, event.timezone)) || {
            date: event.date,
            time: event.startTime,
        };
        const end = event.endsAt
            ? instantToWallClock(event.endsAt, event.timezone)
            : event.endTime
              ? { date: event.endDate ?? event.date, time: event.endTime }
              : null;
        this.form.patchValue({
            title: event.title,
            description: event.description,
            date: start.date,
            endDate: end?.date ?? start.date,
            startTime: start.time,
            endTime: end?.time ?? '',
            timezone: event.timezone,
            recurrenceCadence: event.recurrenceCadence ?? '',
            serverName: event.serverName ?? '',
            serverRegion: event.serverRegion ?? '',
            announceRoleId: event.announceRoleId ?? '',
        });
        this.tags = [...event.tags];
        this.selectedPlatforms = [...event.platforms];
        this.selectedNotify = (event.notifyBefore ?? [])
            .map((label) => this.notifyLabelFromCompact(label))
            .filter((n): n is string => !!n);
        if (event.bannerUrl) {
            this.bannerPreview = event.bannerUrl;
        }
    }

    /** Compact notify form ('1h') → the human option label ('1 hour'). */
    private notifyLabelFromCompact(compact: string): string | undefined {
        return Object.keys(this.notifyOffsets).find(
            (label) => this.notifyOffsets[label] === compact,
        );
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

    /** Hard cap on event tags — matches the backend @ArrayMaxSize(10) (T-0100). */
    readonly maxTags = 10;

    get tagsAtLimit(): boolean {
        return this.tags.length >= this.maxTags;
    }

    addTag(value?: string): void {
        const t = (value ?? this.tagInput).trim().toLowerCase();
        if (t && !this.tags.includes(t) && !this.tagsAtLimit) {
            this.tags.push(t);
        }
        this.tagInput = '';
    }

    removeTag(t: string): void {
        this.tags = this.tags.filter((tag) => tag !== t);
    }

    /** Suggestions not already chosen, filtered by the current input (T-0088). */
    get filteredSuggestions(): string[] {
        const q = this.tagInput.trim().toLowerCase();
        return this.tagSuggestions
            .filter((s) => !this.tags.includes(s))
            .filter((s) => !q || s.includes(q));
    }

    /** Upload a selected banner file to object storage and hold its key (T-0093). */
    onBannerSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.bannerError = null;
        this.bannerUploading = true;
        this.bannerPreview = URL.createObjectURL(file);
        this.storage
            .upload('event-banner', file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (key) => {
                    this.bannerKey = key;
                    this.bannerUploading = false;
                },
                error: (err) => {
                    console.error('Banner upload failed', err);
                    this.bannerError = 'Upload failed — check the file type and size.';
                    this.bannerUploading = false;
                    this.bannerPreview = null;
                },
            });
    }

    removeBanner(): void {
        this.bannerKey = null;
        this.bannerPreview = null;
        this.bannerError = null;
    }

    /** Assemble the frontend view model the events service maps onto the create DTO. */
    private buildEvent(): Omit<RegimentEvent, 'id'> {
        const v = this.form.value;
        return {
            title: v.title,
            description: v.description ?? '',
            serverName: v.serverName ?? '',
            serverRegion: v.serverRegion || undefined,
            serverPassword: v.serverPassword || undefined,
            // Always sent, '' included — clearing the picker has to actually
            // clear the stored role, not silently keep the old one.
            announceRoleId: v.announceRoleId ?? '',
            date: v.date,
            endDate: v.endDate || v.date,
            startTime: v.startTime,
            endTime: v.endTime,
            timezone: v.timezone,
            platforms: [...this.selectedPlatforms],
            status: 'upcoming',
            recurrenceCadence: (v.recurrenceCadence || undefined) as RecurrenceCadence | undefined,
            tags: [...this.tags],
            rsvpCounts: { interested: 0, tentative: 0, declined: 0, neutral: 0 },
            bannerKey: this.bannerKey ?? undefined,
            notifyBefore: this.selectedNotify
                .map((label) => this.notifyOffsets[label])
                .filter((offset): offset is string => !!offset),
        };
    }

    /**
     * Create + publish the event directly — there is no draft state (T-0091) — or
     * update it when editing (T-0097). A freshly-uploaded banner (bannerKey) is
     * only sent when one was chosen, so an edit keeps the existing banner.
     */
    save(): void {
        if (this.form.invalid || this.saving || this.bannerUploading) {
            this.form.markAllAsTouched();
            return;
        }
        this.saving = true;
        const payload = this.buildEvent();
        const request$ = this.editId
            ? this.eventsService.update(this.editId, payload)
            : this.eventsService.create(payload);
        request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (event) => {
                this.saving = false;
                this.router.navigate(['/app/dashboard/events', event.id]);
            },
            error: (err) => {
                console.error(
                    this.editId ? 'Failed to update event' : 'Failed to create event',
                    err,
                );
                this.saving = false;
            },
        });
    }
}
