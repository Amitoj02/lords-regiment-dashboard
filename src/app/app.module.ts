import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TitleStrategy } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { AuthService } from './core/services/auth.service';
import { AppTitleStrategy } from './core/title/app-title.strategy';
import { SharedModule } from './shared/shared.module';

@NgModule({
    declarations: [AppComponent],
    imports: [BrowserModule, AppRoutingModule, CoreModule, SharedModule],
    providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        // Hydrate the current user from /auth/me before the app renders, so route
        // guards see the correct auth state on the very first navigation.
        {
            provide: APP_INITIALIZER,
            multi: true,
            useFactory: (auth: AuthService) => () => auth.hydrate(),
            deps: [AuthService],
        },
        // Per-route document titles (T-0244). Registered under the abstract token
        // so the router picks it up in place of Angular's DefaultTitleStrategy.
        { provide: TitleStrategy, useExisting: AppTitleStrategy },
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
