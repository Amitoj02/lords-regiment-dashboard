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
            route: '/app/dashboard',
            icon: 'home',
            adminOnly: false,
            enabled: true,
        },
        // Events + Gallery are member-visible in-shell (T-0085/T-0086/T-0110):
        // members read the calendar + gallery archive; authoring/moderation is
        // gated behind capability guards + in-template capability checks.
        {
            label: 'Events',
            key: 'events',
            route: '/app/dashboard/events',
            icon: 'calendar',
            adminOnly: false,
            enabled: true,
        },
        {
            label: 'Gallery',
            key: 'gallery',
            route: '/app/gallery',
            icon: 'image',
            adminOnly: false,
            enabled: true,
        },
        {
            label: 'Members',
            key: 'roster',
            route: '/app/roster',
            icon: 'users',
            adminOnly: false,
            enabled: true,
        },
        {
            label: 'Applications',
            key: 'apps',
            route: '/app/admin/applications',
            icon: 'scroll',
            adminOnly: true,
            enabled: true,
        },
        {
            label: 'Ranks & Medals',
            key: 'ranks',
            route: '/app/admin/ranks',
            icon: 'award',
            adminOnly: true,
            enabled: true,
        },
        // Audit + Settings are wired (T-0025 / T-0017 / T-0024).
        {
            label: 'Audit Ledger',
            key: 'audit',
            route: '/app/admin/audit',
            icon: 'activity',
            adminOnly: true,
            enabled: true,
        },
        {
            label: 'Settings',
            key: 'settings',
            route: '/app/admin/settings',
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
