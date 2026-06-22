import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';

import { LandingComponent } from './landing/landing.component';
import { EventsPageComponent } from './events-page/events-page.component';
import { GalleryPageComponent } from './gallery-page/gallery-page.component';
import { LoginPageComponent } from './login/login.component';
import { PublicNavComponent } from './public-nav/public-nav.component';
import { PublicFooterComponent } from './public-footer/public-footer.component';

const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'home', component: LandingComponent },
    { path: 'events', component: EventsPageComponent },
    { path: 'gallery', component: GalleryPageComponent },
    { path: 'login', component: LoginPageComponent },
];

@NgModule({
    declarations: [
        LandingComponent,
        EventsPageComponent,
        GalleryPageComponent,
        LoginPageComponent,
        PublicNavComponent,
        PublicFooterComponent,
    ],
    imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
    exports: [PublicNavComponent, PublicFooterComponent],
})
export class PublicModule {}
