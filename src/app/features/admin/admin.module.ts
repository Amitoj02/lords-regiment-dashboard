import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { ApplicationsComponent } from './applications/applications.component';
import { RanksMedalsComponent } from './ranks-medals/ranks-medals.component';
import { EventDetailComponent } from './event-detail/event-detail.component';
import { EventCreateComponent } from './event-create/event-create.component';
import { GallerySubmitComponent } from './gallery-submit/gallery-submit.component';
import { GalleryModComponent } from './gallery-mod/gallery-mod.component';
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
    { path: 'events/create', component: EventCreateComponent },
    { path: 'events/:id', component: EventDetailComponent },
    { path: 'gallery/submit', component: GallerySubmitComponent },
    { path: 'gallery/mod', component: GalleryModComponent },
    { path: 'audit', component: AuditComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'bot', component: BotStatusComponent },
];

@NgModule({
    declarations: [
        ApplicationsComponent,
        RanksMedalsComponent,
        EventDetailComponent,
        EventCreateComponent,
        GallerySubmitComponent,
        GalleryModComponent,
        AuditComponent,
        SettingsComponent,
        BotStatusComponent,
    ],
    imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AdminModule {}
