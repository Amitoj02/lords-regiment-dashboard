import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'hf-application-form',
    templateUrl: './application-form.component.html',
    styleUrls: ['./application-form.component.scss'],
    standalone: false,
})
export class ApplicationFormComponent {
    private readonly applications = inject(ApplicationsService);
    private readonly auth = inject(AuthService);

    form: FormGroup;
    submitted = false;
    submitting = false;
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

    onSubmit(): void {
        if (!this.form.valid) {
            this.form.markAllAsTouched();
            return;
        }
        this.submitting = true;
        this.error = null;
        const v = this.form.value;
        const user = this.auth.currentUser();
        this.applications
            .submit({
                applicantName: user?.name ?? v.inGameName,
                inGameName: v.inGameName,
                discordTag: user?.discordTag ?? undefined,
                currentRegiment: v.currentRegiment,
                howFound: v.howFound,
                preferredClasses: v.preferredClasses,
                skillsToImprove: v.skillsToImprove,
                interestConfirmed: !!v.interestConfirm,
                representativeNote: v.representativeNote || undefined,
            })
            .subscribe({
                next: () => {
                    this.submitting = false;
                    this.submitted = true;
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
        this.router.navigate(['/']);
    }
}
