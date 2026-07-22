import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AppTitleStrategy } from './app-title.strategy';
import { PageTitleService } from './page-title.service';

@Component({ template: '<p>stub</p>', standalone: false })
class StubPageComponent {}

describe('AppTitleStrategy', () => {
    // Karma runs in a real browser, so these specs mutate the actual tab title.
    // Restore it so a failure here does not read as a failure of the next suite.
    const originalTitle = document.title;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [StubPageComponent],
            providers: [
                provideRouter([
                    { path: 'login', component: StubPageComponent, title: 'Sign In' },
                    { path: 'events', component: StubPageComponent, title: 'Events' },
                    // Deliberately untitled — the landing page is the site itself.
                    { path: 'home', component: StubPageComponent },
                ]),
                { provide: TitleStrategy, useExisting: AppTitleStrategy },
            ],
        });
    });

    afterEach(() => {
        document.title = originalTitle;
    });

    it('is the strategy the router actually uses', () => {
        // Providing it under the abstract token is the whole integration; a spec on
        // updateTitle alone would still pass with the default strategy installed.
        expect(TestBed.inject(TitleStrategy)).toBe(TestBed.inject(AppTitleStrategy));
    });

    it('suffixes a route title with the site name', async () => {
        await RouterTestingHarness.create('/login');
        expect(document.title).toBe('Sign In | Lords Regiment');
    });

    it('updates the title on in-app navigation, not just on first load', async () => {
        // The classic TitleStrategy failure is a title that is only correct after a
        // hard reload. Prove the second navigation rewrites it.
        const harness = await RouterTestingHarness.create('/login');
        expect(document.title).toBe('Sign In | Lords Regiment');

        await harness.navigateByUrl('/events');
        expect(document.title).toBe('Events | Lords Regiment');
    });

    it('falls back to the base title on a route with no title, never a stale one', async () => {
        const harness = await RouterTestingHarness.create('/events');
        expect(document.title).toBe('Events | Lords Regiment');

        await harness.navigateByUrl('/home');
        expect(document.title).toBe('Lords Regiment');
    });

    it('reverts a component-supplied title when navigating away', async () => {
        // /gallery/:id sets its own title once the item loads; the next navigation
        // must reclaim the tab without the component having to clean up.
        const harness = await RouterTestingHarness.create('/events');
        TestBed.inject(PageTitleService).setPageTitle('Siege of Ostend');
        expect(document.title).toBe('Siege of Ostend | Lords Regiment');

        await harness.navigateByUrl('/home');
        expect(document.title).toBe('Lords Regiment');
    });

    it('completes the navigation even if building the title throws', async () => {
        // The router calls updateTitle before resolving the transition, so a throw
        // would break navigation app-wide (T-0244 regression risk).
        const strategy = TestBed.inject(AppTitleStrategy);
        spyOn(strategy, 'buildTitle').and.throwError('boom');
        const router = TestBed.inject(Router);

        await expectAsync(router.navigateByUrl('/login')).toBeResolvedTo(true);
        expect(document.title).toBe('Lords Regiment');
    });
});
