import { Component, Input, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    standalone: false,
    selector: 'hf-app-shell',
    templateUrl: './app-shell.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
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
    /**
     * Effective capability keys, fed to the sidebar so capability-gated entries
     * (Settings) track the authorization matrix instead of the role flag (T-0265).
     */
    readonly capabilities = computed(() => this.currentUser()?.capabilities ?? []);

    /** Mobile off-canvas sidebar drawer state. Ignored on desktop (CSS). */
    drawerOpen = false;

    toggleDrawer(): void {
        this.drawerOpen = !this.drawerOpen;
    }

    closeDrawer(): void {
        this.drawerOpen = false;
    }

    get navUser(): { id: string; name: string; rank: string; avatarUrl: string | null } {
        const user = this.currentUser();
        return {
            id: user?.id ?? '',
            // The model's `name` field was removed — in-game name is the sole display
            // identity (T-0159); id drives the own-profile links (T-0139).
            name: user?.inGameName ?? '',
            rank: user?.rank ?? '',
            avatarUrl: user?.avatarUrl ?? null,
        };
    }

    onNavigate(route: string): void {
        this.closeDrawer();
        this.router.navigateByUrl(route);
    }

    onLogout(): void {
        this.closeDrawer();
        this.auth.logout();
    }
}
