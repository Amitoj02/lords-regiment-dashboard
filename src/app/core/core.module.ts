import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Holds app-wide singletons. All services declare `providedIn: 'root'` and all
 * guards are functional `CanActivateFn`s, so nothing needs to be listed in
 * `providers` here — this module only enforces single-import via the guard below.
 */
@NgModule({
    imports: [CommonModule],
})
export class CoreModule {
    constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
        if (parentModule) {
            throw new Error('CoreModule is already loaded. Import it in AppModule only.');
        }
    }
}
