import { provideZoneChangeDetection } from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Silence non-error console output in production (LDA-L11): the app ships ~55
// console.* calls (mostly catchError fallbacks) whose diagnostic detail has no
// audience in a production browser console. Errors and warnings are kept so real
// failures still surface.
if (environment.production) {
    const noop = (): void => undefined;
    console.log = noop;
    console.debug = noop;
    console.info = noop;
}

platformBrowser()
    .bootstrapModule(AppModule, {
        applicationProviders: [provideZoneChangeDetection({ eventCoalescing: true })],
    })
    .catch((err) => console.error(err));
