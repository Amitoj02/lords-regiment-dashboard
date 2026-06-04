import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'hf-owner-setup',
  templateUrl: './owner-setup.component.html',
  styleUrls: ['./owner-setup.component.scss'],
  standalone: false,
})
export class OwnerSetupComponent implements OnInit {
  currentStep = 2;

  steps = [
    { num: 1, label: 'Verify Identity' },
    { num: 2, label: 'Regiment Colors' },
    { num: 3, label: 'Discord Binding' },
    { num: 4, label: 'Rank Structure' },
    { num: 5, label: 'Confirm & Launch' },
  ];

  colorOptions = [
    { key: 'brass', label: 'Brass', hex: '#bf9447' },
    { key: 'crimson', label: 'Crimson', hex: '#8b2c2c' },
    { key: 'royal', label: 'Royal Blue', hex: '#3b5bdb' },
    { key: 'forest', label: 'Forest', hex: '#2d6a4f' },
    { key: 'pewter', label: 'Pewter', hex: '#6c757d' },
    { key: 'oxblood', label: 'Oxblood', hex: '#6b1a1a' },
  ];

  selectedColor = 'brass';

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      regimentName: ['', [Validators.required, Validators.minLength(3)]],
      shortTag: ['', [Validators.required, Validators.maxLength(6)]],
      missionStatement: ['', [Validators.maxLength(400)]],
    });
  }

  selectColor(key: string): void {
    this.selectedColor = key;
  }

  goBack(): void {
    this.router.navigate(['/onboarding/setup']);
  }

  save(): void {
    // Save draft
  }

  continue(): void {
    if (this.form.valid) {
      this.router.navigate(['/onboarding/setup/discord']);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
