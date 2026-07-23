import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

// Per-route document titles live on the leaf routes inside each lazy module's
// own table (T-0244). Nothing here declares one on purpose: TitleStrategy takes
// the deepest title it finds, so a title on a shell route would silently become
// the fallback for every child that forgot its own, instead of the base title.
const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    {
        path: 'onboarding',
        loadChildren: () =>
            import('./features/onboarding/onboarding.module').then((m) => m.OnboardingModule),
    },
    // The authenticated app lives under /app (T-0102). `app/admin` is declared
    // BEFORE `app` so /app/admin/* resolves to the admin module rather than being
    // captured by the member module at /app.
    {
        path: 'app/admin',
        canActivate: [authGuard, adminGuard],
        loadChildren: () => import('./features/admin/admin.module').then((m) => m.AdminModule),
    },
    {
        path: 'app',
        canActivate: [authGuard],
        loadChildren: () => import('./features/member/member.module').then((m) => m.MemberModule),
    },
    // Public shell (landing, login, gallery, events, legal, auth callback) stays
    // outside /app.
    {
        path: '',
        loadChildren: () => import('./features/public/public.module').then((m) => m.PublicModule),
    },
    { path: '**', redirectTo: '/home' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
