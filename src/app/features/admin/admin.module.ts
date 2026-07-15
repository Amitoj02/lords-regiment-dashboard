import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { ApplicationsComponent } from './applications/applications.component';
import { RanksMedalsComponent } from './ranks-medals/ranks-medals.component';
import { AuditComponent } from './audit/audit.component';
import { SettingsComponent } from './settings/settings.component';
import { BotStatusComponent } from './bot-status/bot-status.component';

// Post-MVP: every admin surface is now wired to its API service (T-0017/T-0024/
// T-0025), so the coming-soon placeholders have been swapped back for the real
// components. Each destructive/mutating action is capability-gated in-template.
const routes: Routes = [
    { path: '', redirectTo: 'applications', pathMatch: 'full' },
    { path: 'applications', component: ApplicationsComponent },
    { path: 'ranks', component: RanksMedalsComponent },
    // Events relocated to /app/dashboard/events* and Gallery to /app/gallery*
    // (member-readable, role-gated authoring) in MemberModule (T-0085/T-0108).
    { path: 'audit', component: AuditComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'bot', component: BotStatusComponent },
];

@NgModule({
    declarations: [
        ApplicationsComponent,
        RanksMedalsComponent,
        AuditComponent,
        SettingsComponent,
        BotStatusComponent,
    ],
    imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AdminModule {}
