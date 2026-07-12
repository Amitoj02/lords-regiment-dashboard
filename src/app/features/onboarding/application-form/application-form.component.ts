import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * The enlistment form. Doubles as the EDIT surface for a pending application
 * (T-0031): navigated with `?edit=1`, it pre-fills from the caller's current
 * application and PATCHes it instead of creating a new one. A returning
 * applicant who already has an open application (and is not editing) is bounced
 * to their status page rather than shown a blank form (T-0030).
 */
@Component({
    selector: 'hf-application-form',
    templateUrl: './application-form.component.html',
    styleUrls: ['./application-form.component.scss'],
    standalone: false,
})
export class ApplicationFormComponent implements OnInit {
    private readonly applications = inject(ApplicationsService);
    private readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);

    form: FormGroup;
    submitted = false;
    submitting = false;
    editing = false;
    loading = true;
    error: string | null = null;

    // The signed-in Discord identity (falls back to a placeholder if not logged in).
    get discordUser() {
        const u = this.auth.currentUser();
        const name = u?.name ?? 'Prospective Recruit';
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
            currentRegiment: ['', [Validators.required]],
            howFound: ['', [Validators.required]],
            preferredClasses: ['', [Validators.required]],
            skillsToImprove: ['', [Validators.required]],
            representativeNote: [''],
            // Client-only gate: confirms age + Code of Conduct. NOT sent to the API.
            ageConfirm: [false, [Validators.requiredTrue]],
            interestConfirm: [false, [Validators.requiredTrue]],
        });
    }

    ngOnInit(): void {
        const wantsEdit = this.route.snapshot.queryParamMap.get('edit') === '1';
        this.applications.getMine().subscribe({
            next: (mine) => {
                const app = mine.application;
                const open = app?.status === 'pending' || app?.status === 'held';
                if (wantsEdit && app?.status === 'pending') {
                    // Edit mode: pre-fill from the pending application.
                    this.editing = true;
                    this.form.patchValue({
                        inGameName: app.inGameName,
                        currentRegiment: app.currentRegiment,
                        howFound: app.howFound,
                        preferredClasses: app.preferredClasses,
                        skillsToImprove: app.skillsToImprove,
                        representativeNote: app.representativeNote ?? '',
                        // Already attested at first submit.
                        ageConfirm: true,
                        interestConfirm: app.interestConfirmed,
                    });
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
            applicantName: user?.name ?? v.inGameName,
            inGameName: v.inGameName,
            discordTag: user?.discordTag ?? undefined,
            currentRegiment: v.currentRegiment,
            howFound: v.howFound,
            preferredClasses: v.preferredClasses,
            skillsToImprove: v.skillsToImprove,
            interestConfirmed: !!v.interestConfirm,
            representativeNote: v.representativeNote || undefined,
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
