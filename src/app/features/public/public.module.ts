import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { authGuard } from '../../core/guards/auth.guard';
import { submitGalleryGuard } from '../../core/guards/submit-gallery.guard';

import { PublicLayoutComponent } from './public-layout/public-layout.component';
import { LandingComponent } from './landing/landing.component';
import { EventsPageComponent } from './events-page/events-page.component';
import { EventDetailComponent } from './event-detail/event-detail.component';
import { GalleryPageComponent } from './gallery-page/gallery-page.component';
import { GalleryDetailComponent } from './gallery-detail/gallery-detail.component';
import { GallerySubmitComponent } from './gallery-submit/gallery-submit.component';
import { RosterComponent } from './roster/roster.component';
import { ProfileComponent } from './profile/profile.component';
import { AccountComponent } from './account/account.component';
import { AccountDeletionComponent } from './account-deletion/account-deletion.component';
import { LoginPageComponent } from './login/login.component';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';
import { PublicNavComponent } from './public-nav/public-nav.component';
import { PublicFooterComponent } from './public-footer/public-footer.component';
import { LegalComponent } from './legal/legal.component';
import { NotFoundComponent } from './not-found/not-found.component';

/**
 * The public site (T-0287) — everything a visitor or an ordinary member uses.
 *
 * `title` is the Angular route field AppTitleStrategy reads (T-0244) — not
 * `data.title`, which TitleStrategy.buildTitle does not look at. Pages whose
 * title depends on fetched data (a profile, an event, a gallery item) declare a
 * placeholder here and hand the real one to `SeoService` once the fetch lands.
 *
 * Every route is a CHILD of the layout route, so the nav and footer mount once
 * instead of being pasted into each template. The landing page stays untitled
 * so the tab reads just "Lords Regiment".
 */
const routes: Routes = [
    {
        path: '',
        component: PublicLayoutComponent,
        children: [
            { path: '', component: LandingComponent },
            { path: 'home', component: LandingComponent },

            // ── The roster and member profiles (T-0287) ──────────────────────
            { path: 'roster', component: RosterComponent, title: 'Regimental Roster' },
            // `:handle` is `@name` or a 12-char short id. The component resolves
            // either and rewrites the URL to the canonical one, so a short-id
            // link to a member who has since claimed a handle does not leave two
            // live URLs competing to be indexed as the same page.
            { path: 'u/:handle', component: ProfileComponent, title: 'Profile' },
            // "My profile" — resolved in the component from the session, so a
            // link to it never has to know the caller's own handle.
            {
                path: 'me',
                component: ProfileComponent,
                canActivate: [authGuard],
                title: 'My Profile',
            },

            // ── Events, out of the dashboard (T-0287) ────────────────────────
            { path: 'events', component: EventsPageComponent, title: 'Events' },
            { path: 'events/:id', component: EventDetailComponent, title: 'Event' },

            // ── Gallery. Only the moderation queue stayed behind. ────────────
            { path: 'gallery', component: GalleryPageComponent, title: 'Gallery' },
            // `submit` MUST precede `:id` or it is captured as an item id.
            {
                path: 'gallery/submit',
                component: GallerySubmitComponent,
                canActivate: [authGuard, submitGalleryGuard],
                title: 'Submit to Gallery',
            },
            { path: 'gallery/:id', component: GalleryDetailComponent, title: 'Gallery' },

            // ── A member's own account, also out of the dashboard ────────────
            {
                path: 'account',
                component: AccountComponent,
                canActivate: [authGuard],
                title: 'My Account',
            },
            {
                path: 'account/deletion',
                component: AccountDeletionComponent,
                canActivate: [authGuard],
                title: 'Discharge & Account Deletion',
            },

            { path: 'login', component: LoginPageComponent, title: 'Sign In' },
            // Legal pages (T-0124) — obligation-free public content.
            {
                path: 'terms',
                component: LegalComponent,
                data: { doc: 'terms' },
                title: 'Terms & Conditions',
            },
            {
                path: 'privacy',
                component: LegalComponent,
                data: { doc: 'privacy' },
                title: 'Privacy Policy',
            },
            {
                path: 'guidelines',
                component: LegalComponent,
                data: { doc: 'guidelines' },
                title: 'Community Guidelines',
            },
            // Discord OAuth handoff target (backend redirects here with #token=…).
            { path: 'auth/callback', component: AuthCallbackComponent, title: 'Signing In' },

            // ── Old URLs, kept alive permanently ─────────────────────────────
            // These are in Discord messages, in members' bookmarks and in
            // Google's index. Redirecting is cheap; breaking them is not. Do not
            // "tidy these away" later — there is no date at which an old Discord
            // link stops being clicked.
            //
            // They live HERE rather than at the root because `/app/*` is claimed
            // by the staff console, whose staffGuard would bounce an ordinary
            // member off their own bookmark before a root-level redirect could
            // fire. AdminModule carries the staff-facing half of this table.
            { path: 'app/roster', redirectTo: 'roster' },
            { path: 'app/profile', redirectTo: 'me', pathMatch: 'full' },
            { path: 'app/profile/:handle', redirectTo: 'u/:handle' },
            { path: 'app/account-deletion', redirectTo: 'account/deletion' },
            { path: 'app/gallery', redirectTo: 'gallery', pathMatch: 'full' },
            { path: 'app/gallery/submit', redirectTo: 'gallery/submit' },
            { path: 'app/dashboard/events', redirectTo: 'events', pathMatch: 'full' },
            { path: 'app/dashboard/events/:id', redirectTo: 'events/:id' },

            // A real 404 instead of the old silent redirect to /home. Last, and
            // inside the layout, so it renders with the site's own chrome.
            { path: '**', component: NotFoundComponent, title: 'Page not found' },
        ],
    },
];

@NgModule({
    declarations: [
        PublicLayoutComponent,
        LandingComponent,
        EventsPageComponent,
        EventDetailComponent,
        GalleryPageComponent,
        GalleryDetailComponent,
        GallerySubmitComponent,
        RosterComponent,
        ProfileComponent,
        AccountComponent,
        AccountDeletionComponent,
        LoginPageComponent,
        AuthCallbackComponent,
        PublicNavComponent,
        PublicFooterComponent,
        LegalComponent,
        NotFoundComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        RouterModule.forChild(routes),
    ],
    exports: [PublicNavComponent, PublicFooterComponent],
})
export class PublicModule {}
