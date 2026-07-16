import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface NavUser {
    /** Signed-in member uid — used to link the footer/profile at their own record (T-0139). */
    id: string;
    name: string;
    rank: string;
    avatarUrl?: string | null;
}

/** Labeled sidebar section a nav item belongs to (T-0131). */
type NavGroup = 'general' | 'me' | 'administrative';

interface NavItem {
    label: string;
    /** Active-state key — matches the `activeRoute` value each page supplies. */
    key: string;
    /** Router URL to navigate to. Must resolve to a real configured route. */
    route: string;
    icon: string;
    /** Which labeled group the item is rendered under (T-0131). */
    group: NavGroup;
    adminOnly: boolean;
    /** MVP feature flag — deferred surfaces are hidden until wired (T-0026). */
    enabled?: boolean;
}

/** A rendered, pre-filtered group of nav items with its heading. */
interface NavSection {
    id: NavGroup;
    label: string;
    items: NavItem[];
}

@Component({
    standalone: false,
    selector: 'hf-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
    @Input() active = '';
    @Input() user: NavUser = { id: '', name: '', rank: '' };
    @Input() isAdmin = false;

    @Output() navigate = new EventEmitter<string>();
    /** Emitted when the footer Logout button is pressed (handled by the shell). */
    @Output() logout = new EventEmitter<void>();

    readonly navItems: NavItem[] = [
        // ── General ──────────────────────────────────────────────────────────
        {
            label: 'Dashboard',
            key: 'dashboard',
            route: '/app/dashboard',
            icon: 'home',
            group: 'general',
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
            group: 'general',
            adminOnly: false,
            enabled: true,
        },
        {
            label: 'Gallery',
            key: 'gallery',
            route: '/app/gallery',
            icon: 'image',
            group: 'general',
            adminOnly: false,
            enabled: true,
        },
        {
            label: 'Members',
            key: 'roster',
            route: '/app/roster',
            icon: 'users',
            group: 'general',
            adminOnly: false,
            enabled: true,
        },
        // ── Me ───────────────────────────────────────────────────────────────
        // Routes to the signed-in member's own profile — the concrete `/app/profile/:id`
        // link is resolved at render time (routeFor) from the current user's uid (T-0139).
        {
            label: 'My profile',
            key: 'profile',
            route: '/app/profile',
            icon: 'profile',
            group: 'me',
            adminOnly: false,
            enabled: true,
        },
        // ── Administrative (admins only) ─────────────────────────────────────
        {
            label: 'Applications',
            key: 'apps',
            route: '/app/admin/applications',
            icon: 'scroll',
            group: 'administrative',
            adminOnly: true,
            enabled: true,
        },
        {
            label: 'Ranks & Medals',
            key: 'ranks',
            route: '/app/admin/ranks',
            icon: 'award',
            group: 'administrative',
            adminOnly: true,
            enabled: true,
        },
        // Audit + Settings are wired (T-0025 / T-0017 / T-0024).
        {
            label: 'Audit Ledger',
            key: 'audit',
            route: '/app/admin/audit',
            icon: 'activity',
            group: 'administrative',
            adminOnly: true,
            enabled: true,
        },
        {
            label: 'Settings',
            key: 'settings',
            route: '/app/admin/settings',
            icon: 'settings',
            group: 'administrative',
            adminOnly: true,
            enabled: true,
        },
    ];

    /** Ordered group headings; empty groups are dropped in `visibleSections`. */
    private readonly groupOrder: { id: NavGroup; label: string }[] = [
        { id: 'general', label: 'General' },
        { id: 'me', label: 'Me' },
        { id: 'administrative', label: 'Administrative' },
    ];

    /**
     * Nav items bucketed into their labeled groups, with admin/MVP-flag filtering
     * applied. The Administrative group falls away entirely for non-admins because
     * all of its items are `adminOnly` (T-0131).
     */
    get visibleSections(): NavSection[] {
        return this.groupOrder
            .map(({ id, label }) => ({
                id,
                label,
                items: this.navItems.filter(
                    (i) => i.group === id && i.enabled !== false && (!i.adminOnly || this.isAdmin),
                ),
            }))
            .filter((section) => section.items.length > 0);
    }

    /** Flat list of every visible item across groups — retained for existing consumers. */
    get visibleItems(): NavItem[] {
        return this.visibleSections.flatMap((section) => section.items);
    }

    /** The signed-in user's own profile route (falls back to the id-less alias). */
    get profileRoute(): string {
        return this.user.id ? `/app/profile/${this.user.id}` : '/app/profile';
    }

    /** Resolve an item's link — the "My profile" item points at the current user (T-0139). */
    routeFor(item: NavItem): string {
        return item.key === 'profile' ? this.profileRoute : item.route;
    }

    isActive(key: string): boolean {
        return this.active === key;
    }

    onNavigate(route: string): void {
        this.navigate.emit(route);
    }

    onLogout(): void {
        this.logout.emit();
    }
}
