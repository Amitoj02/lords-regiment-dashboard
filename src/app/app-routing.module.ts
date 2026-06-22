import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    {
        path: '',
        loadChildren: () => import('./features/public/public.module').then((m) => m.PublicModule),
    },
    {
        path: 'onboarding',
        loadChildren: () =>
            import('./features/onboarding/onboarding.module').then((m) => m.OnboardingModule),
    },
    {
        path: '',
        canActivate: [authGuard],
        loadChildren: () => import('./features/member/member.module').then((m) => m.MemberModule),
    },
    {
        path: 'admin',
        canActivate: [authGuard, adminGuard],
        loadChildren: () => import('./features/admin/admin.module').then((m) => m.AdminModule),
    },
    { path: '**', redirectTo: '/home' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
