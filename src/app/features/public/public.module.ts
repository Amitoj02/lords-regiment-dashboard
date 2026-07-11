import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';

import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';
import { LandingComponent } from './landing/landing.component';
import { EventsPageComponent } from './events-page/events-page.component';
import { GalleryPageComponent } from './gallery-page/gallery-page.component';
import { LoginPageComponent } from './login/login.component';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';
import { PublicNavComponent } from './public-nav/public-nav.component';
import { PublicFooterComponent } from './public-footer/public-footer.component';

const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'home', component: LandingComponent },
    // Public events + gallery are MVP-deferred — placeholder, no stub data (T-0026).
    { path: 'events', component: ComingSoonComponent, data: { feature: 'Events' } },
    { path: 'gallery', component: ComingSoonComponent, data: { feature: 'Gallery' } },
    { path: 'login', component: LoginPageComponent },
    // Discord OAuth handoff target (backend redirects here with ?token=…).
    { path: 'auth/callback', component: AuthCallbackComponent },
];

@NgModule({
    declarations: [
        LandingComponent,
        EventsPageComponent,
        GalleryPageComponent,
        LoginPageComponent,
        AuthCallbackComponent,
        PublicNavComponent,
        PublicFooterComponent,
    ],
    imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
    exports: [PublicNavComponent, PublicFooterComponent],
})
export class PublicModule {}
