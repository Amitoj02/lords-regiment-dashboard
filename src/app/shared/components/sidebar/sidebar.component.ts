import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface NavUser {
    name: string;
    rank: string;
}

interface NavItem {
    label: string;
    /** Active-state key — matches the `activeRoute` value each page supplies. */
    key: string;
    /** Router URL to navigate to. Must resolve to a real configured route. */
    route: string;
    icon: string;
    adminOnly: boolean;
    /** MVP feature flag — deferred surfaces are hidden until wired (T-0026). */
    enabled?: boolean;
}

@Component({
    standalone: false,
    selector: 'hf-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
    @Input() active = '';
    @Input() user: NavUser = { name: '', rank: '' };
    @Input() isAdmin = false;

    @Output() navigate = new EventEmitter<string>();

    readonly navItems: NavItem[] = [
        {
            label: 'Dashboard',
            key: 'dashboard',
            route: '/dashboard',
            icon: 'home',
            adminOnly: false,
            enabled: true,
        },
        // Events + Gallery point at the in-shell admin surfaces (index + manage).
        // Admin-only: plain members reach the public /events + /gallery via the
        // public site nav instead.
        {
            label: 'Events',
            key: 'events',
            route: '/admin/events',
            icon: 'calendar',
            adminOnly: true,
            enabled: true,
        },
        {
            label: 'Gallery',
            key: 'gallery',
            route: '/admin/gallery',
            icon: 'image',
            adminOnly: true,
            enabled: true,
        },
        {
            label: 'Members',
            key: 'roster',
            route: '/roster',
            icon: 'users',
            adminOnly: false,
            enabled: true,
        },
        {
            label: 'Applications',
            key: 'apps',
            route: '/admin/applications',
            icon: 'scroll',
            adminOnly: true,
            enabled: true,
        },
        {
            label: 'Ranks & Medals',
            key: 'ranks',
            route: '/admin/ranks',
            icon: 'award',
            adminOnly: true,
            enabled: true,
        },
        // Audit + Settings are wired (T-0025 / T-0017 / T-0024).
        {
            label: 'Audit Ledger',
            key: 'audit',
            route: '/admin/audit',
            icon: 'activity',
            adminOnly: true,
            enabled: true,
        },
        {
            label: 'Settings',
            key: 'settings',
            route: '/admin/settings',
            icon: 'settings',
            adminOnly: true,
            enabled: true,
        },
    ];

    get visibleItems(): NavItem[] {
        return this.navItems.filter((i) => i.enabled !== false && (!i.adminOnly || this.isAdmin));
    }

    isActive(key: string): boolean {
        return this.active === key;
    }

    onNavigate(route: string): void {
        this.navigate.emit(route);
    }

    get initials(): string {
        return this.user.name
            .split(' ')
            .map((s) => s[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    get avatarBg(): string {
        const h = Array.from(this.user.name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
        return `oklch(0.32 0.04 ${h})`;
    }
}
