import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';

import { LandingComponent } from './landing/landing.component';
import { EventsPageComponent } from './events-page/events-page.component';
import { GalleryPageComponent } from './gallery-page/gallery-page.component';
import { GalleryDetailComponent } from './gallery-detail/gallery-detail.component';
import { LoginPageComponent } from './login/login.component';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';
import { PublicNavComponent } from './public-nav/public-nav.component';
import { PublicFooterComponent } from './public-footer/public-footer.component';
import { LegalComponent } from './legal/legal.component';

// `title` is the Angular route field AppTitleStrategy reads (T-0244) — not
// `data.title`, which TitleStrategy.buildTitle does not look at. The landing
// pages stay deliberately untitled so the tab reads just "Lords Regiment".
const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'home', component: LandingComponent },
    // Public events + gallery are now wired to their API services (T-0025).
    { path: 'events', component: EventsPageComponent, title: 'Events' },
    { path: 'gallery', component: GalleryPageComponent, title: 'Gallery' },
    // Placeholder title: the component replaces it with the item's own name once
    // the fetch lands, and the next navigation reclaims it.
    { path: 'gallery/:id', component: GalleryDetailComponent, title: 'Gallery' },
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
    // Discord OAuth handoff target (backend redirects here with ?token=…).
    { path: 'auth/callback', component: AuthCallbackComponent, title: 'Signing In' },
];

@NgModule({
    declarations: [
        LandingComponent,
        EventsPageComponent,
        GalleryPageComponent,
        GalleryDetailComponent,
        LoginPageComponent,
        AuthCallbackComponent,
        PublicNavComponent,
        PublicFooterComponent,
        LegalComponent,
    ],
    imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
    exports: [PublicNavComponent, PublicFooterComponent],
})
export class PublicModule {}
