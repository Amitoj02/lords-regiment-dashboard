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

    readonly platformOptions = [
        { value: 'steam', label: 'Steam (PC)' },
        { value: 'xbox', label: 'Xbox / Microsoft' },
        { value: 'ps', label: 'PlayStation' },
    ];

    readonly howFoundOptions = [
        { value: 'discord', label: 'Discord server listing' },
        { value: 'friend', label: 'Friend referral' },
        { value: 'youtube', label: 'YouTube' },
        { value: 'reddit', label: 'Reddit' },
        { value: 'ingame', label: 'Met in-game' },
        { value: 'other', label: 'Other' },
    ];

    readonly timezoneOptions = [
        { value: 'America/New_York', label: 'Eastern (UTC-5)' },
        { value: 'America/Chicago', label: 'Central (UTC-6)' },
        { value: 'America/Denver', label: 'Mountain (UTC-7)' },
        { value: 'America/Los_Angeles', label: 'Pacific (UTC-8)' },
        { value: 'America/Toronto', label: 'Toronto (UTC-5)' },
        { value: 'America/Vancouver', label: 'Vancouver (UTC-8)' },
        { value: 'Europe/London', label: 'London (UTC+0)' },
        { value: 'Europe/Berlin', label: 'Central Europe (UTC+1)' },
        { value: 'Europe/Istanbul', label: 'Istanbul (UTC+3)' },
        { value: 'Asia/Kolkata', label: 'India (UTC+5:30)' },
        { value: 'Australia/Sydney', label: 'Sydney (UTC+11)' },
    ];

    constructor(
        private fb: FormBuilder,
        private router: Router,
    ) {
        this.form = this.fb.group({
            inGameName: ['', [Validators.required, Validators.minLength(2)]],
            platform: ['steam', [Validators.required]],
            applicantType: ['Applicant', [Validators.required]],
            whyJoin: [
                '',
                [Validators.required, Validators.minLength(30), Validators.maxLength(800)],
            ],
            howFound: ['', [Validators.required]],
            priorExperience: ['', [Validators.maxLength(600)]],
            timezone: ['', [Validators.required]],
            ageConfirm: [false, [Validators.requiredTrue]],
        });
    }

    setApplicantType(type: 'Applicant' | 'Mercenary'): void {
        this.form.patchValue({ applicantType: type });
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
                platform: v.platform,
                applicantType: v.applicantType,
                discordTag: user?.discordTag ?? undefined,
                timezone: v.timezone,
                whyJoin: v.whyJoin,
                howFound: v.howFound,
                priorExperience: v.priorExperience || undefined,
                ageConfirmed: !!v.ageConfirm,
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
