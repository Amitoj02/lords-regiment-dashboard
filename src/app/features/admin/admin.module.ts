import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { OverviewComponent } from './overview/overview.component';
import { ApplicationsComponent } from './applications/applications.component';
import { RanksMedalsComponent } from './ranks-medals/ranks-medals.component';
import { AuditComponent } from './audit/audit.component';
import { SettingsComponent } from './settings/settings.component';
import { LegalEditorComponent } from './settings/legal-editor/legal-editor.component';
import { RegimentPresentationComponent } from './settings/regiment-presentation/regiment-presentation.component';
import { unsavedChangesGuard } from './settings/unsaved-changes.guard';
import { settingsAccessGuard } from '../../core/guards/settings-access.guard';
import { manageEventsGuard } from '../../core/guards/manage-events.guard';
import { moderateGalleryGuard } from '../../core/guards/moderate-gallery.guard';
import { BotStatusComponent } from './bot-status/bot-status.component';
import { EventsAdminComponent } from './events-admin/events-admin.component';
import { EventCreateComponent } from './event-create/event-create.component';
import { GalleryModComponent } from './gallery-mod/gallery-mod.component';

/**
 * The staff console (T-0287) — the only thing left under `/app`.
 *
 * It absorbed three surfaces that used to live in the (now deleted) MemberModule
 * and one prefix level:
 *  - the overview (was `/app/dashboard`),
 *  - event AUTHORING — create, edit, archive, attendance (was
 *    `/app/dashboard/events/*`); the browsing half of that page is public now,
 *  - the gallery MODERATION QUEUE (was `/app/gallery/mod`); the browsing and
 *    submitting halves are public now,
 * and everything moved up from `/app/admin/*` to `/app/*`, because with the
 * member tree gone there was nothing left for the extra segment to disambiguate.
 *
 * `title` feeds AppTitleStrategy (T-0244); the strings match the sidebar labels.
 */
const routes: Routes = [
    { path: '', redirectTo: 'overview', pathMatch: 'full' },
    { path: 'overview', component: OverviewComponent, title: 'Overview' },
    { path: 'applications', component: ApplicationsComponent, title: 'Applications' },
    { path: 'ranks', component: RanksMedalsComponent, title: 'Ranks & Medals' },
    { path: 'audit', component: AuditComponent, title: 'Audit Ledger' },

    // Event authoring. Read-only browsing is public at /events; these are the
    // screens that cannot be, because they write.
    { path: 'events', component: EventsAdminComponent, title: 'Events' },
    // `create` MUST precede `:id/edit` so it is not captured as an id.
    {
        path: 'events/create',
        component: EventCreateComponent,
        canActivate: [manageEventsGuard],
        title: 'Create an Event',
    },
    {
        path: 'events/:id/edit',
        component: EventCreateComponent,
        canActivate: [manageEventsGuard],
        title: 'Edit Event',
    },

    {
        path: 'gallery/moderation',
        component: GalleryModComponent,
        canActivate: [moderateGalleryGuard],
        title: 'Gallery Moderation',
    },

    // canActivate: staffGuard on the parent is capability-based but broad — a
    // Moderator holding only manage_events is staff and would otherwise reach a
    // settings panel the API 403s in full (T-0265).
    // canDeactivate: the settings page hosts the legal-document editor, which can
    // be holding an unsaved privacy policy (T-0240).
    {
        path: 'settings',
        component: SettingsComponent,
        title: 'Settings',
        canActivate: [settingsAccessGuard],
        canDeactivate: [unsavedChangesGuard],
    },
    { path: 'bot', component: BotStatusComponent, title: 'Discord Bot' },

    // ── Old staff URLs, kept alive permanently (T-0287) ─────────────────────
    // The member-facing half of this table lives in PublicModule; these are the
    // ones whose destination is still inside the console, so a bookmarked
    // /app/admin/settings or /app/dashboard keeps working.
    { path: 'dashboard', redirectTo: 'overview', pathMatch: 'full' },
    { path: 'dashboard/events/create', redirectTo: 'events/create' },
    { path: 'dashboard/events/:id/edit', redirectTo: 'events/:id/edit' },
    { path: 'gallery/mod', redirectTo: 'gallery/moderation' },
    { path: 'admin', redirectTo: 'overview', pathMatch: 'full' },
    { path: 'admin/applications', redirectTo: 'applications' },
    { path: 'admin/ranks', redirectTo: 'ranks' },
    { path: 'admin/audit', redirectTo: 'audit' },
    { path: 'admin/settings', redirectTo: 'settings' },
    { path: 'admin/bot', redirectTo: 'bot' },
];

@NgModule({
    declarations: [
        OverviewComponent,
        ApplicationsComponent,
        RanksMedalsComponent,
        AuditComponent,
        SettingsComponent,
        RegimentPresentationComponent,
        LegalEditorComponent,
        BotStatusComponent,
        EventsAdminComponent,
        EventCreateComponent,
        GalleryModComponent,
    ],
    imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class AdminModule {}
