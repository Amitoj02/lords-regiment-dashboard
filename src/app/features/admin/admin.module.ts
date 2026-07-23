import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { ApplicationsComponent } from './applications/applications.component';
import { RanksMedalsComponent } from './ranks-medals/ranks-medals.component';
import { AuditComponent } from './audit/audit.component';
import { SettingsComponent } from './settings/settings.component';
import { LegalEditorComponent } from './settings/legal-editor/legal-editor.component';
import { RegimentPresentationComponent } from './settings/regiment-presentation/regiment-presentation.component';
import { unsavedChangesGuard } from './settings/unsaved-changes.guard';
import { BotStatusComponent } from './bot-status/bot-status.component';

// Post-MVP: every admin surface is now wired to its API service (T-0017/T-0024/
// T-0025), so the coming-soon placeholders have been swapped back for the real
// components. Each destructive/mutating action is capability-gated in-template.
// `title` feeds AppTitleStrategy (T-0244); the strings match the sidebar labels.
const routes: Routes = [
    { path: '', redirectTo: 'applications', pathMatch: 'full' },
    { path: 'applications', component: ApplicationsComponent, title: 'Applications' },
    { path: 'ranks', component: RanksMedalsComponent, title: 'Ranks & Medals' },
    // Events relocated to /app/dashboard/events* and Gallery to /app/gallery*
    // (member-readable, role-gated authoring) in MemberModule (T-0085/T-0108).
    { path: 'audit', component: AuditComponent, title: 'Audit Ledger' },
    // canDeactivate: the settings page hosts the legal-document editor, which can
    // be holding an unsaved privacy policy (T-0240).
    {
        path: 'settings',
        component: SettingsComponent,
        title: 'Settings',
        canDeactivate: [unsavedChangesGuard],
    },
    { path: 'bot', component: BotStatusComponent, title: 'Discord Bot' },
];

@NgModule({
    declarations: [
        ApplicationsComponent,
        RanksMedalsComponent,
        AuditComponent,
        SettingsComponent,
        RegimentPresentationComponent,
        LegalEditorComponent,
        BotStatusComponent,
    ],
    imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AdminModule {}
