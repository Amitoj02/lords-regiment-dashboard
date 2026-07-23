import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';

import { GuildRequiredComponent } from './guild-required/guild-required.component';

/**
 * Auth-flow screens that are neither public nor part of the authenticated app.
 * Today that is just the Discord guild gate (T-0261), which has to live OUTSIDE
 * `/app`: guildGuard sits on the `/app` parents, so a gate declared under them
 * would divert to itself.
 *
 * `title` is the Angular route field AppTitleStrategy reads (T-0244), and it
 * belongs on the leaf — a title on a shell route silently becomes the fallback
 * for every child that forgot its own.
 */
const routes: Routes = [{ path: '', component: GuildRequiredComponent, title: 'Discord Required' }];

@NgModule({
    declarations: [GuildRequiredComponent],
    imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class AuthModule {}
