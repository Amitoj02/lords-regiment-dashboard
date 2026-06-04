import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'hf-owner-discord',
  templateUrl: './owner-discord.component.html',
  styleUrls: ['./owner-discord.component.scss'],
  standalone: false,
})
export class OwnerDiscordComponent implements OnInit {
  currentStep = 3;

  steps = [
    { num: 1, label: 'Verify Identity' },
    { num: 2, label: 'Regiment Colors' },
    { num: 3, label: 'Discord Binding' },
    { num: 4, label: 'Rank Structure' },
    { num: 5, label: 'Confirm & Launch' },
  ];

  botStatus: 'idle' | 'checking' | 'connected' | 'error' = 'idle';

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      inviteLink: ['', [Validators.required]],
      serverId: ['', [Validators.required, Validators.pattern(/^\d{17,19}$/)]],
    });
  }

  checkBotStatus(): void {
    if (this.form.get('serverId')?.valid) {
      this.botStatus = 'checking';
      setTimeout(() => {
        this.botStatus = 'connected';
      }, 1500);
    }
  }

  goBack(): void {
    this.router.navigate(['/onboarding/setup']);
  }

  continue(): void {
    if (this.form.valid && this.botStatus === 'connected') {
      this.router.navigate(['/onboarding/ranks']);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
