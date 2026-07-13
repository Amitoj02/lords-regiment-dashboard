import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { manageEventsGuard } from '../../core/guards/manage-events.guard';

import { DashboardComponent } from './dashboard/dashboard.component';
import { RosterComponent } from './roster/roster.component';
import { ProfileComponent } from './profile/profile.component';
import { AccountDeletionComponent } from './account-deletion/account-deletion.component';
import { AdminActionModalComponent } from './admin-action-modal/admin-action-modal.component';
// Events moved out of the admin (STAFF-only) tree so members can READ them
// (T-0085); authoring (create/edit) stays gated behind manageEventsGuard. The
// component files still live under features/admin/ to avoid import churn.
import { EventsAdminComponent } from '../admin/events-admin/events-admin.component';
import { EventDetailComponent } from '../admin/event-detail/event-detail.component';
import { EventCreateComponent } from '../admin/event-create/event-create.component';

const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'roster', component: RosterComponent },
    { path: 'profile', component: ProfileComponent },
    { path: 'profile/:id', component: ProfileComponent },
    { path: 'account-deletion', component: AccountDeletionComponent },
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
    ],
    imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class MemberModule {}
