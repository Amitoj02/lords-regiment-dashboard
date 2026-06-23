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
        },
        { label: 'Events', key: 'events', route: '/events', icon: 'calendar', adminOnly: false },
        { label: 'Gallery', key: 'gallery', route: '/gallery', icon: 'image', adminOnly: false },
        { label: 'Members', key: 'roster', route: '/roster', icon: 'users', adminOnly: false },
        {
            label: 'Applications',
            key: 'apps',
            route: '/admin/applications',
            icon: 'scroll',
            adminOnly: true,
        },
        {
            label: 'Ranks & Medals',
            key: 'ranks',
            route: '/admin/ranks',
            icon: 'award',
            adminOnly: true,
        },
        {
            label: 'Audit Ledger',
            key: 'audit',
            route: '/admin/audit',
            icon: 'activity',
            adminOnly: true,
        },
        {
            label: 'Settings',
            key: 'settings',
            route: '/admin/settings',
            icon: 'settings',
            adminOnly: true,
        },
    ];

    get visibleItems(): NavItem[] {
        return this.navItems.filter((i) => !i.adminOnly || this.isAdmin);
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
