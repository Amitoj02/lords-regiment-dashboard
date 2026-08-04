import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuthService } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';

/**
 * The enlistment form. Doubles as the EDIT surface for a pending application
 * (T-0031): navigated with `?edit=1`, it pre-fills from the caller's current
 * application and PATCHes it instead of creating a new one. A returning
 * applicant who already has an open application (and is not editing) is bounced
 * to their status page rather than shown a blank form (T-0030).
 *
 * The Mercenary track can be closed regiment-wide (T-0229). The API rejects a
 * Mercenary application with 403 when it is, so the form stops OFFERING the
 * card rather than letting applicants walk into a wall.
 */
@Component({
    selector: 'hf-application-form',
    templateUrl: './application-form.component.html',
    styleUrls: ['./application-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class ApplicationFormComponent implements OnInit {
    private readonly applications = inject(ApplicationsService);
    private readonly auth = inject(AuthService);
    private readonly regiment = inject(RegimentService);
    private readonly route = inject(ActivatedRoute);

    form: FormGroup;
    submitted = false;
    submitting = false;
    editing = false;
    loading = true;
    error: string | null = null;

    /**
     * Has GET /regiment settled (either way)? The applicant-type cards must not
     * paint before the Mercenary gate is known, or a closed track removes the
     * Mercenary card after first paint and shifts every control below it. Set in
     * BOTH handlers so a failed profile fetch still renders the form.
     */
    profileLoaded = false;

    /**
     * Is the Mercenary track open? Defaults to TRUE and stays true if the
     * profile fetch fails or omits the flag — a transient API error must never
     * silently narrow an applicant's options.
     */
    mercenariesAllowed = true;

    /**
     * Set when edit mode pre-fills an application that is ALREADY a Mercenary.
     * Their stored answer stays visible and selected even with the track closed:
     * hiding the card would silently rewrite their submission to Member.
     */
    mercenaryPreselected = false;

    /** Both requests have settled — safe to paint the form without a layout shift. */
    get ready(): boolean {
        return !this.loading && this.profileLoaded;
    }

    /** Offer the Mercenary card while the track is open, or to keep a pre-filled one honest. */
    get showMercenaryCard(): boolean {
        return this.mercenariesAllowed || this.mercenaryPreselected;
    }

    /**
     * True only in the awkward case: track closed, but the draft is CURRENTLY a
     * Mercenary one. Derived from the live control so that acting on the
     * banner's own instruction — clicking Member — dismisses it.
     */
    get mercenaryTrackClosedWarning(): boolean {
        return !this.mercenariesAllowed && this.form.get('applicantType')?.value === 'Mercenary';
    }

    // The signed-in Discord identity (falls back to a placeholder if not logged in).
    get discordUser() {
        const u = this.auth.currentUser();
        const name = u?.inGameName ?? 'Prospective Recruit';
        return {
            name,
            tag: u?.discordTag ?? 'recruit#0000',
            avatarInitials: name
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')
                .toUpperCase(),
        };
    }

    constructor(
        private fb: FormBuilder,
        private router: Router,
    ) {
        this.form = this.fb.group({
            inGameName: ['', [Validators.required, Validators.minLength(2)]],
            // Enlistment track — Member (full application) or Mercenary. Defaults to Member.
            applicantType: ['Member', [Validators.required]],
            currentRegiment: ['', [Validators.required]],
            howFound: ['', [Validators.required]],
            preferredClasses: ['', [Validators.required]],
            skillsToImprove: ['', [Validators.required]],
            representativeNote: ['', [Validators.required]],
            // Client-only gate: confirms age + the community guidelines. NOT sent to the API.
            ageConfirm: [false, [Validators.requiredTrue]],
            interestConfirm: [false, [Validators.requiredTrue]],
        });
    }

    ngOnInit(): void {
        const wantsEdit = this.route.snapshot.queryParamMap.get('edit') === '1';

        // Public profile carries the Mercenary-track flag. Failure is permissive.
        this.regiment.getProfile().subscribe({
            next: (profile) => {
                this.mercenariesAllowed = profile?.allowMercenaries !== false;
                this.profileLoaded = true;
                this.reconcileMercenaryGate();
            },
            error: () => {
                this.mercenariesAllowed = true;
                this.profileLoaded = true;
            },
        });

        this.applications.getMine().subscribe({
            next: (mine) => {
                const app = mine.application;
                const open = app?.status === 'pending' || app?.status === 'held';
                if (wantsEdit && app?.status === 'pending') {
                    // Edit mode: pre-fill from the pending application.
                    this.editing = true;
                    this.mercenaryPreselected = app.applicantType === 'Mercenary';
                    this.form.patchValue({
                        inGameName: app.inGameName,
                        applicantType: app.applicantType ?? 'Member',
                        currentRegiment: app.currentRegiment,
                        howFound: app.howFound,
                        preferredClasses: app.preferredClasses,
                        skillsToImprove: app.skillsToImprove,
                        representativeNote: app.representativeNote ?? '',
                        // Already attested at first submit.
                        ageConfirm: true,
                        interestConfirm: app.interestConfirmed,
                    });
                    this.reconcileMercenaryGate();
                } else if (open) {
                    // Has an open application and isn't editing → show status, not a blank form.
                    void this.router.navigateByUrl('/onboarding/status');
                    return;
                }
                this.loading = false;
            },
            // If we can't resolve the current application, fall back to a blank form.
            error: () => (this.loading = false),
        });
    }

    /**
     * Keep the applicantType control in step with the gate. GET /regiment and
     * GET /applications/mine settle in no guaranteed order, so both call this.
     * A closed track snaps a fresh draft back to Member — but never touches a
     * pre-filled Mercenary application (see `mercenaryPreselected`).
     */
    private reconcileMercenaryGate(): void {
        if (this.showMercenaryCard) return;
        const control = this.form.get('applicantType');
        if (control?.value === 'Mercenary') control.setValue('Member');
    }

    onSubmit(): void {
        if (!this.form.valid) {
            this.form.markAllAsTouched();
            return;
        }
        this.submitting = true;
        this.error = null;
        const v = this.form.value;
        const user = this.auth.currentUser();
        const payload = {
            applicantName: user?.inGameName ?? v.inGameName,
            inGameName: v.inGameName,
            applicantType: v.applicantType,
            discordTag: user?.discordTag ?? undefined,
            currentRegiment: v.currentRegiment,
            howFound: v.howFound,
            preferredClasses: v.preferredClasses,
            skillsToImprove: v.skillsToImprove,
            interestConfirmed: !!v.interestConfirm,
            representativeNote: v.representativeNote,
        };

        const request$ = this.editing
            ? this.applications.updateMine(payload)
            : this.applications.submit(payload);

        request$.subscribe({
            next: () => {
                this.submitting = false;
                if (this.editing) {
                    void this.router.navigateByUrl('/onboarding/status');
                } else {
                    this.submitted = true;
                }
            },
            error: (err) => {
                this.submitting = false;
                this.error =
                    err?.error?.message ??
                    'We could not submit your application. Please sign in and try again.';
            },
        });
    }

    cancel(): void {
        void this.router.navigate([this.editing ? '/onboarding/status' : '/']);
    }
}
