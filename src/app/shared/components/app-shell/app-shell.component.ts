import { Component, Input, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    standalone: false,
    selector: 'hf-app-shell',
    templateUrl: './app-shell.component.html',
    styleUrls: ['./app-shell.component.scss'],
})
export class AppShellComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    @Input() activeRoute = '';
    @Input() crumbs: string[] = [];
    @Input() title = '';

    /** Reactive auth state — the shell updates when the user logs in or out. */
    readonly currentUser = this.auth.currentUser;
    readonly isAdmin = computed(() => this.auth.isAdmin());

    /** Mobile off-canvas sidebar drawer state. Ignored on desktop (CSS). */
    drawerOpen = false;

    toggleDrawer(): void {
        this.drawerOpen = !this.drawerOpen;
    }

    closeDrawer(): void {
        this.drawerOpen = false;
    }

    get navUser(): { name: string; rank: string } {
        const user = this.currentUser();
        return {
            name: user?.name ?? '',
            rank: user?.rank ?? '',
        };
    }

    onNavigate(route: string): void {
        this.closeDrawer();
        this.router.navigateByUrl(route);
    }
}
