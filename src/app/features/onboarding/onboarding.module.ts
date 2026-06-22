import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';

import { OwnerSetupComponent } from './owner-setup/owner-setup.component';
import { OwnerDiscordComponent } from './owner-discord/owner-discord.component';
import { ApplicationFormComponent } from './application-form/application-form.component';

const routes: Routes = [
    { path: 'setup', component: OwnerSetupComponent },
    { path: 'setup/discord', component: OwnerDiscordComponent },
    { path: 'apply', component: ApplicationFormComponent },
];

@NgModule({
    declarations: [OwnerSetupComponent, OwnerDiscordComponent, ApplicationFormComponent],
    imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class OnboardingModule {}
