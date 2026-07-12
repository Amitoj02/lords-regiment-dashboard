import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { onboardingGuard } from '../../core/guards/onboarding.guard';

import { ApplicationFormComponent } from './application-form/application-form.component';
import { ApplicationStatusComponent } from './application-status/application-status.component';

/**
 * Applicant onboarding: the enlistment form and the application-status page,
 * both gated to authenticated non-members (onboardingGuard). The old owner-setup
 * wizard was retired (T-0038) — its steps duplicated the fully-wired admin
 * Settings panel as stubs — so /onboarding/setup* now redirects there.
 */
const routes: Routes = [
    { path: 'apply', component: ApplicationFormComponent, canActivate: [onboardingGuard] },
    { path: 'status', component: ApplicationStatusComponent, canActivate: [onboardingGuard] },
    // Retired owner-setup wizard → the real admin control panel.
    { path: 'setup/discord', redirectTo: '/admin/settings' },
    { path: 'setup', redirectTo: '/admin/settings' },
];

@NgModule({
    declarations: [ApplicationFormComponent, ApplicationStatusComponent],
    imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class OnboardingModule {}
