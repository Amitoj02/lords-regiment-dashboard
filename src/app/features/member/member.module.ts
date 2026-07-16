import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { manageEventsGuard } from '../../core/guards/manage-events.guard';
import { submitGalleryGuard } from '../../core/guards/submit-gallery.guard';
import { moderateGalleryGuard } from '../../core/guards/moderate-gallery.guard';

import { DashboardComponent } from './dashboard/dashboard.component';
import { RosterComponent } from './roster/roster.component';
import { ProfileComponent } from './profile/profile.component';
import { AccountDeletionComponent } from './account-deletion/account-deletion.component';
import { AdminActionModalComponent } from './admin-action-modal/admin-action-modal.component';
// Events + gallery moved out of the admin (STAFF-only) tree so members can READ
// them (T-0085/T-0108); authoring/moderation stays gated behind capability
// guards. The component files still live under features/admin/ to avoid churn.
import { EventsAdminComponent } from '../admin/events-admin/events-admin.component';
import { EventDetailComponent } from '../admin/event-detail/event-detail.component';
import { EventCreateComponent } from '../admin/event-create/event-create.component';
import { GalleryAdminComponent } from '../admin/gallery-admin/gallery-admin.component';
import { GallerySubmitComponent } from '../admin/gallery-submit/gallery-submit.component';
import { GalleryModComponent } from '../admin/gallery-mod/gallery-mod.component';

const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'roster', component: RosterComponent },
    // Bare /app/profile resolves to the signed-in user's own record in the
    // component (T-0139); any member/mercenary is viewable at /app/profile/:id.
    { path: 'profile', component: ProfileComponent },
    { path: 'profile/:id', component: ProfileComponent },
    // Account deletion now lives inside the profile edit modal's "Danger zone"
    // (T-0144); the standalone /app/account-deletion route was removed. The
    // component is still declared below because the modal embeds it.
    // Events: members read the index + detail; only moderator+ may author.
    // create MUST precede :id so it is not captured as an id.
    { path: 'dashboard/events', component: EventsAdminComponent },
    {
        path: 'dashboard/events/create',
        component: EventCreateComponent,
        canActivate: [manageEventsGuard],
    },
    {
        path: 'dashboard/events/:id/edit',
        component: EventCreateComponent,
        canActivate: [manageEventsGuard],
    },
    { path: 'dashboard/events/:id', component: EventDetailComponent },
    // Gallery (T-0108): the archive list is open to any roster member; submit is
    // members-only, moderation is moderators+admins. Index MUST precede children.
    { path: 'gallery', component: GalleryAdminComponent },
    {
        path: 'gallery/submit',
        component: GallerySubmitComponent,
        canActivate: [submitGalleryGuard],
    },
    { path: 'gallery/mod', component: GalleryModComponent, canActivate: [moderateGalleryGuard] },
];

@NgModule({
    declarations: [
        DashboardComponent,
        RosterComponent,
        ProfileComponent,
        AccountDeletionComponent,
        AdminActionModalComponent,
        EventsAdminComponent,
        EventDetailComponent,
        EventCreateComponent,
        GalleryAdminComponent,
        GallerySubmitComponent,
        GalleryModComponent,
    ],
    imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class MemberModule {}
