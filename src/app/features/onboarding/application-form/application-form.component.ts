import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'hf-application-form',
  templateUrl: './application-form.component.html',
  styleUrls: ['./application-form.component.scss'],
  standalone: false,
})
export class ApplicationFormComponent implements OnInit {
  form!: FormGroup;
  submitted = false;
  submitting = false;

  // Simulated Discord identity (would come from OAuth)
  discordUser = {
    name: 'Prospective Recruit',
    tag: 'recruit#0000',
    avatarInitials: 'PR',
  };

  platformOptions = [
    { value: 'steam', label: 'Steam (PC)' },
    { value: 'xbox', label: 'Xbox / Microsoft' },
    { value: 'ps', label: 'PlayStation' },
  ];

  howFoundOptions = [
    { value: 'discord', label: 'Discord server listing' },
    { value: 'friend', label: 'Friend referral' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'reddit', label: 'Reddit' },
    { value: 'ingame', label: 'Met in-game' },
    { value: 'other', label: 'Other' },
  ];

  timezoneOptions = [
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
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      inGameName: ['', [Validators.required, Validators.minLength(2)]],
      platform: ['steam', [Validators.required]],
      applicantType: ['Applicant', [Validators.required]],
      whyJoin: ['', [Validators.required, Validators.minLength(30), Validators.maxLength(800)]],
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
    if (this.form.valid) {
      this.submitting = true;
      setTimeout(() => {
        this.submitting = false;
        this.submitted = true;
      }, 1000);
    } else {
      this.form.markAllAsTouched();
    }
  }

  cancel(): void {
    this.router.navigate(['/']);
  }
}
