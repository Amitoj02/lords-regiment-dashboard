import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { ApplicationsComponent } from './applications/applications.component';
import { RanksMedalsComponent } from './ranks-medals/ranks-medals.component';
import { EventsAdminComponent } from './events-admin/events-admin.component';
import { EventDetailComponent } from './event-detail/event-detail.component';
import { EventCreateComponent } from './event-create/event-create.component';
import { GalleryAdminComponent } from './gallery-admin/gallery-admin.component';
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
    // The exact `events`/`gallery` index routes MUST precede their child routes
    // (create/:id, submit/mod) so the static index is not shadowed by the params.
    { path: 'events', component: EventsAdminComponent },
    { path: 'events/create', component: EventCreateComponent },
    { path: 'events/:id', component: EventDetailComponent },
    { path: 'gallery', component: GalleryAdminComponent },
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
        EventsAdminComponent,
        EventDetailComponent,
        EventCreateComponent,
        GalleryAdminComponent,
        GallerySubmitComponent,
        GalleryModComponent,
        AuditComponent,
        SettingsComponent,
        BotStatusComponent,
    ],
    imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AdminModule {}
