import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';

import { ApplicationsComponent } from './applications/applications.component';
import { RanksMedalsComponent } from './ranks-medals/ranks-medals.component';
import { EventDetailComponent } from './event-detail/event-detail.component';
import { EventCreateComponent } from './event-create/event-create.component';
import { GallerySubmitComponent } from './gallery-submit/gallery-submit.component';
import { GalleryModComponent } from './gallery-mod/gallery-mod.component';
import { AuditComponent } from './audit/audit.component';
import { SettingsComponent } from './settings/settings.component';
import { BotStatusComponent } from './bot-status/bot-status.component';

// MVP: applications + ranks/medals are wired to the API. The remaining admin
// surfaces are deferred (post-MVP) and route to a coming-soon placeholder so no
// stub/fabricated data is shown at go-live (see T-0026). Their components stay
// declared for the follow-up milestone that wires them.
const routes: Routes = [
    { path: '', redirectTo: 'applications', pathMatch: 'full' },
    { path: 'applications', component: ApplicationsComponent },
    { path: 'ranks', component: RanksMedalsComponent },
    { path: 'events/create', component: ComingSoonComponent, data: { feature: 'Events' } },
    { path: 'events/:id', component: ComingSoonComponent, data: { feature: 'Events' } },
    { path: 'gallery/submit', component: ComingSoonComponent, data: { feature: 'Gallery' } },
    { path: 'gallery/mod', component: ComingSoonComponent, data: { feature: 'Gallery moderation' } },
    { path: 'audit', component: ComingSoonComponent, data: { feature: 'Audit ledger' } },
    { path: 'settings', component: ComingSoonComponent, data: { feature: 'Settings' } },
    { path: 'bot', component: ComingSoonComponent, data: { feature: 'Quartermaster bot' } },
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
