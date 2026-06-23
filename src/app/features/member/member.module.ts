import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';

import { DashboardComponent } from './dashboard/dashboard.component';
import { RosterComponent } from './roster/roster.component';
import { ProfileComponent } from './profile/profile.component';
import { AccountDeletionComponent } from './account-deletion/account-deletion.component';

const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'roster', component: RosterComponent },
    { path: 'profile', component: ProfileComponent },
    { path: 'profile/:id', component: ProfileComponent },
    { path: 'account-deletion', component: AccountDeletionComponent },
];

@NgModule({
    declarations: [DashboardComponent, RosterComponent, ProfileComponent, AccountDeletionComponent],
    imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class MemberModule {}
