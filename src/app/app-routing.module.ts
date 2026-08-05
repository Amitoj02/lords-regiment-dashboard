import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { staffGuard } from './core/guards/staff.guard';
import { guildGuard } from './core/guards/guild.guard';

// Per-route document titles live on the leaf routes inside each lazy module's
// own table (T-0244). Nothing here declares one on purpose: TitleStrategy takes
// the deepest title it finds, so a title on a shell route would silently become
// the fallback for every child that forgot its own, instead of the base title.
//
// ── THE PUBLIC/DASHBOARD SPLIT (T-0287) ─────────────────────────────────────
// The site is now two products sharing one build.
//
// Everything a member or a visitor uses — the roster, member profiles, events
// and RSVP, the gallery and submissions, and a member's own account settings —
// lives at the ROOT, unguarded and indexable. `/app` is what is left: the
// regiment-maintenance console, and it is STAFF-ONLY.
//
// That is why `adminGuard` is gone from this file. It tested
// `role === Owner|Admin|Moderator`, but the permission matrix is per-regiment
// and editable through the settings screen, so it could disagree with the API
// about who belongs here. `staffGuard` reads the same capability keys the API
// reads.
const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    {
        path: 'onboarding',
        loadChildren: () =>
            import('./features/onboarding/onboarding.module').then((m) => m.OnboardingModule),
    },
    // The Discord guild gate (T-0261). Signed in, so authGuard applies — but NOT
    // guildGuard, which is the whole point: this is where guildGuard sends people.
    // Declared before the `path: ''` public module, which would otherwise claim
    // the URL as a prefix match and fail to find a child for it.
    {
        path: 'guild-required',
        canActivate: [authGuard],
        loadChildren: () => import('./features/auth/auth.module').then((m) => m.AuthModule),
    },
    // The staff console. ONE module now (T-0287): AdminModule absorbed the
    // overview, the event authoring screens and the gallery moderation queue, so
    // the old `app/admin` prefix and the whole MemberModule are gone. Their URLs
    // stay alive through the redirect table inside AdminModule and PublicModule.
    {
        path: 'app',
        canActivate: [authGuard, staffGuard, guildGuard],
        loadChildren: () => import('./features/admin/admin.module').then((m) => m.AdminModule),
    },
    // The public site. Declared LAST because its `path: ''` matches everything,
    // including a wildcard child that renders a real 404 — which is why there is
    // no `**` entry here any more. The old one redirected to /home and turned
    // every typo, every renamed handle and every deleted profile into a 200 with
    // the landing page: a soft-404, and the single worst thing to serve a search
    // engine on a URL pattern you want indexed.
    {
        path: '',
        loadChildren: () => import('./features/public/public.module').then((m) => m.PublicModule),
    },
];

@NgModule({
    imports: [
        RouterModule.forRoot(routes, {
            // The public site is a browsing experience now — a paginated roster,
            // a gallery, an events list. Without this, coming back from a profile
            // lands at the top of the list instead of where the reader was.
            scrollPositionRestoration: 'enabled',
            anchorScrolling: 'enabled',
        }),
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {}
