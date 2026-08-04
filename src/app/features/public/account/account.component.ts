import { HttpClient, HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    Observable,
    Subject,
    catchError,
    debounceTime,
    distinctUntilChanged,
    map,
    of,
    switchMap,
} from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiMember, mapMember } from '../../../core/models/api.model';
import { Member } from '../../../core/models/member.model';
import { AuthService } from '../../../core/services/auth.service';
import { MembersService } from '../../../core/services/members.service';
import { SeoService } from '../../../core/services/seo.service';
import { DEFAULT_STORAGE_POLICY, StorageService } from '../../../core/services/storage.service';
import { ToastService } from '../../../core/services/toast.service';

/** Why the API refused a handle (mirrors the backend `UsernameRejection`). */
export type UsernameRejection =
    'invalid' | 'reserved' | 'taken' | 'cooldown_target' | 'cooldown_actor';

/** GET /members/me/username-available (mirrors the backend `UsernameAvailability`). */
export interface UsernameAvailability {
    available: boolean;
    reason?: UsernameRejection;
    /** For `cooldown_actor` only: ISO-8601 of when the caller may next rename. */
    retryAfter?: string;
}

/** The shape a handle must have, byte-for-byte the backend's `USERNAME_REGEX`. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

/** Keystroke settle time before the availability probe is worth a request. */
export const USERNAME_PROBE_DEBOUNCE_MS = 400;

/** How long a released handle is held before anyone else may claim it. */
const USERNAME_COOLDOWN_DAYS = 30;

/** The public host, for the profile-URL preview. Display only — never fetched. */
const PROFILE_HOST = 'lordsofholdfast.com';

/**
 * Refusal copy, keyed by the reason the API sent. `cooldown_actor` is absent on
 * purpose: it is the only one whose sentence needs `retryAfter` folded in.
 */
const REJECTION_COPY: Record<Exclude<UsernameRejection, 'cooldown_actor'>, string> = {
    invalid: '3-20 characters, lowercase letters, numbers and underscore',
    reserved: 'That username is not available',
    taken: 'That username is already taken',
    cooldown_target: 'That username was released recently and is not available yet',
};

/** What the line under the username field is currently saying. */
type HandleVerdict = 'idle' | 'checking' | 'available' | 'unavailable' | 'current';

/** One probe result, carrying the value it answers about so a race can be dropped. */
interface ProbeResult {
    value: string;
    /** null when the probe itself failed — not a refusal, just no answer. */
    verdict: UsernameAvailability | null;
}

/**
 * Member self-service (T-0287). This was a modal on the profile; the profile is
 * now a public page, so everything a member edits about themselves lives here.
 *
 * ── WHY THIS PAGE TALKS TO `HttpClient` DIRECTLY ────────────────────────────
 * `MembersService.update()` whitelists three fields (inGameName, avatarKey,
 * bannerKey) and does not model the vanity handle, and there is no shared
 * client for `GET /members/me/username-available` at all. Both calls are made
 * here rather than split across two PATCHes — a handle change and an avatar
 * change are one save to the member, and half-applying them because the second
 * request failed is worse than either failing alone.
 */
@Component({
    selector: 'hf-account',
    templateUrl: './account.component.html',
    styleUrls: ['./account.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class AccountComponent implements OnInit {
    /** The signed-in member, once loaded. Null while loading or on failure. */
    member: Member | null = null;
    loading = true;
    loadError: string | null = null;

    // ── Identity ─────────────────────────────────────────────────────────────
    inGameName = '';
    readonly inGameNameMaxLength = 120;

    /** The handle being edited. NEVER carries the `@` — that is decoration. */
    username = '';
    /** The handle the member holds right now, from the session projection. */
    currentUsername: string | null = null;

    handleVerdict: HandleVerdict = 'idle';
    /** The sentence rendered under the field for the current verdict. */
    handleMessage = '';

    /** The "Remove my username" confirm step (the handle is held for 30 days). */
    removeConfirming = false;
    removing = false;
    readonly cooldownDays = USERNAME_COOLDOWN_DAYS;

    // ── Appearance (carried over from the old profile modal) ─────────────────
    avatarPreview: string | null = null;
    avatarKey: string | null = null;
    avatarUploading = false;
    bannerPreview: string | null = null;
    bannerKey: string | null = null;
    bannerUploading = false;
    /** Accepted-types + max-size hints, seeded from the static policy then
     * refreshed from GET /storage/policy so they mirror the backend (T-0187). */
    avatarHint = StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'member-avatar');
    bannerHint = StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'member-banner');

    // ── Save ─────────────────────────────────────────────────────────────────
    saving = false;
    saveError: string | null = null;

    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
    private readonly members = inject(MembersService);
    private readonly storage = inject(StorageService);
    private readonly toast = inject(ToastService);
    private readonly seo = inject(SeoService);
    private readonly destroyRef = inject(DestroyRef);

    /** Every keystroke on the handle field; debounced into one probe. */
    private readonly handleInput$ = new Subject<string>();

    ngOnInit(): void {
        // A private page must never be indexed, whatever the crawler shell says.
        this.seo.apply({
            title: 'My Account',
            description: 'Manage your name, your profile handle and your profile images.',
            canonicalPath: '/account',
            noIndex: true,
        });

        this.startHandleProbe();

        const user = this.auth.currentUser();
        this.currentUsername = user?.username ?? null;
        this.username = this.currentUsername ?? '';
        this.inGameName = user?.inGameName ?? '';

        if (!user || !this.isMember) {
            // An identity-only session (an applicant) has no member row to edit —
            // every request below would 403. The template says so instead.
            this.loading = false;
            return;
        }

        this.members
            .getById(user.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (member) => {
                    this.member = member;
                    this.inGameName = member.inGameName ?? '';
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                    this.loadError =
                        'We could not load your account. Please refresh and try again.';
                },
            });

        this.storage
            .getPolicy()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((policy) => {
                this.avatarHint = StorageService.uploadHint(policy, 'member-avatar');
                this.bannerHint = StorageService.uploadHint(policy, 'member-banner');
            });
    }

    /** True when the caller is on the roster (an applicant may not edit a profile). */
    get isMember(): boolean {
        return this.auth.isMember();
    }

    // ── The vanity handle ────────────────────────────────────────────────────

    /**
     * One probe per settled value. `distinctUntilChanged` sits BEFORE the
     * debounce deliberately: after it, typing forward and deleting back to the
     * same handle would be swallowed as a duplicate and the field would sit on
     * "Checking…" forever.
     */
    private startHandleProbe(): void {
        this.handleInput$
            .pipe(
                distinctUntilChanged(),
                debounceTime(USERNAME_PROBE_DEBOUNCE_MS),
                switchMap((value) => this.probe(value)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => this.applyProbeResult(result));
    }

    /**
     * Ask the API about `value`, or answer locally when there is nothing worth
     * asking: an empty field, the handle already held, or one that fails the
     * shape check the server would only repeat back.
     */
    private probe(value: string): Observable<ProbeResult> {
        if (!value || value === this.currentUsername || !USERNAME_PATTERN.test(value)) {
            return of({ value, verdict: null });
        }
        const params = new HttpParams().set('username', value);
        return this.http
            .get<UsernameAvailability>(`${environment.apiBaseUrl}/members/me/username-available`, {
                params,
            })
            .pipe(
                map((verdict) => ({ value, verdict })),
                // The probe is advisory — the unique index is what decides — so a
                // failed check must not block the save or claim a refusal.
                catchError(() => of({ value, verdict: null })),
            );
    }

    private applyProbeResult(result: ProbeResult): void {
        // Drop an answer about a handle the member has already typed past.
        if (result.value !== this.username) {
            return;
        }
        if (!result.verdict) {
            // Either nothing was asked (handled synchronously in onUsernameInput)
            // or the check failed; in both cases leave the line as it stands
            // unless it is still promising an answer that is not coming.
            if (this.handleVerdict === 'checking') {
                this.handleVerdict = 'idle';
                this.handleMessage = '';
            }
            return;
        }
        if (result.verdict.available) {
            this.handleVerdict = 'available';
            this.handleMessage = `@${result.value} is available`;
            return;
        }
        this.handleVerdict = 'unavailable';
        this.handleMessage = this.refusalCopy(result.verdict);
    }

    /** The sentence for a refusal, including the formatted rename cooldown. */
    private refusalCopy(verdict: UsernameAvailability): string {
        if (verdict.reason === 'cooldown_actor') {
            const when = this.formatRetryAfter(verdict.retryAfter);
            return when
                ? `You can change your username again after ${when}`
                : 'You changed your username recently and cannot change it again yet';
        }
        return REJECTION_COPY[verdict.reason ?? 'invalid'] ?? REJECTION_COPY.reserved;
    }

    /** "August 12, 2026" — or null when the API sent nothing parseable. */
    private formatRetryAfter(iso: string | undefined): string | null {
        if (!iso) {
            return null;
        }
        const at = new Date(iso);
        if (Number.isNaN(at.getTime())) {
            return null;
        }
        return at.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    /**
     * Normalise on the way in — the stored value is always what the server would
     * store, so "Panda", " panda" and a pasted "@panda" are the same claim and
     * the preview never shows a handle that is about to be rewritten.
     */
    onUsernameInput(raw: string): void {
        const value = raw.trim().toLowerCase().replace(/^@+/, '');
        this.username = value;
        // A fresh edit retires whatever the last save was refused for.
        this.saveError = null;
        this.removeConfirming = false;

        if (!value) {
            this.handleVerdict = 'idle';
            this.handleMessage = '';
        } else if (value === this.currentUsername) {
            this.handleVerdict = 'current';
            this.handleMessage = 'This is your username.';
        } else if (!USERNAME_PATTERN.test(value)) {
            this.handleVerdict = 'unavailable';
            this.handleMessage = REJECTION_COPY.invalid;
        } else {
            this.handleVerdict = 'checking';
            this.handleMessage = 'Checking…';
        }
        this.handleInput$.next(value);
    }

    /** True when the typed handle cannot be claimed — the save is blocked on it. */
    get usernameBlocked(): boolean {
        const value = this.username;
        if (!value || value === this.currentUsername) {
            return false;
        }
        return !USERNAME_PATTERN.test(value) || this.handleVerdict === 'unavailable';
    }

    /** The URL this profile answers on once the current edits are saved. */
    get profileUrlPreview(): string {
        const handle = this.username || this.currentUsername;
        const path = handle ? `/u/@${handle}` : `/u/${this.member?.id ?? ''}`;
        return `${PROFILE_HOST}${path}`;
    }

    startRemove(): void {
        this.removeConfirming = true;
    }

    cancelRemove(): void {
        this.removeConfirming = false;
    }

    /**
     * Release the handle (PATCH `username: null`). Its own request rather than a
     * field on the save, because it is a decision with a consequence the save
     * button does not carry: the handle is held for 30 days afterwards.
     */
    removeUsername(): void {
        if (!this.member || this.removing || !this.currentUsername) {
            return;
        }
        this.removing = true;
        this.saveError = null;
        this.patchSelf({ username: null })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (updated) => {
                    this.member = updated;
                    this.removing = false;
                    this.removeConfirming = false;
                    this.currentUsername = null;
                    this.username = '';
                    this.handleVerdict = 'idle';
                    this.handleMessage = '';
                    this.toast.success('Your username has been removed.');
                    this.refreshSession();
                },
                error: (err: unknown) => {
                    this.removing = false;
                    this.saveError = this.serverMessage(
                        err,
                        'Could not remove your username. Please try again.',
                    );
                    this.toast.error(this.saveError);
                },
            });
    }

    // ── Appearance ───────────────────────────────────────────────────────────

    onAvatarSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        this.avatarPreview = URL.createObjectURL(file);
        this.avatarUploading = true;
        this.saveError = null;
        this.storage
            .upload('member-avatar', file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (key) => {
                    this.avatarKey = key;
                    this.avatarUploading = false;
                },
                error: (err: unknown) => {
                    this.avatarUploading = false;
                    this.avatarPreview = null;
                    this.saveError = StorageService.uploadErrorMessage(
                        err,
                        'Avatar upload failed. Please try again.',
                    );
                    this.toast.error(this.saveError);
                },
            });
        // Let the same file be chosen again after a failure.
        input.value = '';
    }

    onBannerSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        this.bannerPreview = URL.createObjectURL(file);
        this.bannerUploading = true;
        this.saveError = null;
        this.storage
            .upload('member-banner', file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (key) => {
                    this.bannerKey = key;
                    this.bannerUploading = false;
                },
                error: (err: unknown) => {
                    this.bannerUploading = false;
                    this.bannerPreview = null;
                    this.saveError = StorageService.uploadErrorMessage(
                        err,
                        'Banner upload failed. Please try again.',
                    );
                    this.toast.error(this.saveError);
                },
            });
        input.value = '';
    }

    // ── Save ─────────────────────────────────────────────────────────────────

    /** True once something on the form differs from what is stored. */
    get dirty(): boolean {
        return (
            this.inGameName.trim() !== (this.member?.inGameName ?? '') ||
            this.username !== (this.currentUsername ?? '') ||
            !!this.avatarKey ||
            !!this.bannerKey ||
            this.avatarUploading ||
            this.bannerUploading
        );
    }

    get canSave(): boolean {
        return (
            !!this.member &&
            !this.saving &&
            !this.removing &&
            !this.avatarUploading &&
            !this.bannerUploading &&
            !!this.inGameName.trim() &&
            !this.usernameBlocked &&
            this.dirty
        );
    }

    /** Put every field back to what the server last told us. */
    revert(): void {
        this.inGameName = this.member?.inGameName ?? '';
        this.username = this.currentUsername ?? '';
        this.avatarPreview = null;
        this.avatarKey = null;
        this.bannerPreview = null;
        this.bannerKey = null;
        this.handleVerdict = 'idle';
        this.handleMessage = '';
        this.removeConfirming = false;
        this.saveError = null;
    }

    save(): void {
        if (!this.member || !this.canSave) {
            return;
        }
        const body: Record<string, unknown> = { inGameName: this.inGameName.trim() };
        if (this.avatarKey) {
            body['avatarKey'] = this.avatarKey;
        }
        if (this.bannerKey) {
            body['bannerKey'] = this.bannerKey;
        }
        // Only a CHANGED handle is sent. Clearing the field is not a release —
        // that is the confirmed "Remove my username" step, because releasing puts
        // the handle beyond reach for 30 days.
        const claimed = this.username;
        const claiming = !!claimed && claimed !== this.currentUsername;
        if (claiming) {
            body['username'] = claimed;
        }

        this.saving = true;
        this.saveError = null;
        this.patchSelf(body)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (updated) => {
                    this.member = updated;
                    this.saving = false;
                    this.avatarPreview = null;
                    this.avatarKey = null;
                    this.bannerPreview = null;
                    this.bannerKey = null;
                    if (claiming) {
                        this.currentUsername = claimed;
                        this.handleVerdict = 'current';
                        this.handleMessage = 'This is your username.';
                    }
                    this.toast.success('Your account has been updated.');
                    this.refreshSession();
                },
                error: (err: unknown) => {
                    this.saving = false;
                    // A 409 is the expected failure here: the availability probe
                    // is advisory and the unique index is what actually decides,
                    // so two members can claim the same handle in the same
                    // instant. The server authored the sentence — show it.
                    this.saveError = this.serverMessage(
                        err,
                        'Could not save your account. Please try again.',
                    );
                    this.toast.error(this.saveError);
                    if (this.isConflict(err)) {
                        this.handleVerdict = 'unavailable';
                        this.handleMessage = this.saveError;
                    }
                },
            });
    }

    /** PATCH /members/:id — see the class comment for why this is not in a service. */
    private patchSelf(body: Record<string, unknown>): Observable<Member> {
        return this.http
            .patch<ApiMember>(`${environment.apiBaseUrl}/members/${this.member?.id}`, body)
            .pipe(map(mapMember));
    }

    /** Re-read /auth/me so the nav, the avatar and "my profile" pick up the change. */
    private refreshSession(): void {
        this.auth
            .loadCurrentUser()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((user) => {
                // The session is the only place the handle lives on the wire —
                // the member projection does not carry it.
                //
                // `user ? … : keep` rather than `user?.username ?? keep`: a
                // successful response saying `username: null` is MEANINGFUL — it
                // is exactly what removing a handle produces — and `??` would
                // treat it as "no news" and put the released handle straight back
                // on screen. Only a FAILED refresh (null user) keeps the old value.
                if (user) {
                    this.currentUsername = user.username ?? null;
                    if (!this.currentUsername) {
                        this.username = '';
                    }
                }
            });
    }

    private isConflict(err: unknown): boolean {
        return (err as { status?: number })?.status === 409;
    }

    /** The server's own message when it sent one, else `fallback`. */
    private serverMessage(err: unknown, fallback: string): string {
        const message = (err as { error?: { message?: unknown } })?.error?.message;
        if (typeof message === 'string' && message.trim()) {
            return message;
        }
        if (Array.isArray(message) && typeof message[0] === 'string') {
            return message[0];
        }
        return fallback;
    }
}
