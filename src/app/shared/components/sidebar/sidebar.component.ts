import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { SETTINGS_CAPABILITIES } from '../../../core/guards/settings-access.guard';

export interface NavUser {
    /** Signed-in member uid. */
    id: string;
    name: string;
    rank: string;
    avatarUrl?: string | null;
    /**
     * The member's own PUBLIC profile URL (`AuthService.myProfilePath()`).
     * Profiles left the dashboard in T-0287, so the footer card now links OUT
     * of `/app`; the shell resolves it because it is the piece holding the
     * session.
     */
    profilePath?: string;
}

/** Labeled sidebar section a nav item belongs to (T-0131). */
type NavGroup = 'general' | 'administrative';

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
    /**
     * Capability keys that make this entry reachable — holding ANY one is
     * enough. When present it REPLACES the coarse `adminOnly` + `isAdmin` role
     * check, because the route behind such an entry is itself capability-guarded
     * and the role flag would otherwise show a link into a 403 (T-0265). Entries
     * without it keep the role gate exactly as before.
     */
    anyCapability?: readonly string[];
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
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
    @Input() active = '';
    @Input() user: NavUser = { id: '', name: '', rank: '' };
    @Input() isAdmin = false;
    /**
     * Effective capability keys for the signed-in user (`CurrentUser.capabilities`).
     * Only entries carrying `anyCapability` consult it — everything else still
     * rides on `isAdmin` (T-0265).
     */
    @Input() capabilities: readonly string[] = [];

    @Output() navigate = new EventEmitter<string>();
    /** Emitted when the footer Logout button is pressed (handled by the shell). */
    @Output() logout = new EventEmitter<void>();

    /**
     * The staff console's nav (T-0287). Everything member-facing — the roster,
     * profiles, event BROWSING, the gallery archive — left `/app` for the public
     * site, so what remains is the maintenance work.
     *
     * Nearly every entry is capability-gated rather than role-gated, because
     * `staffGuard` admits anyone holding ANY one staff capability: a Moderator
     * with only `moderate_gallery` is legitimately inside this shell and must
     * not be shown six links the API 403s (T-0265).
     */
    readonly navItems: NavItem[] = [
        // ── General ──────────────────────────────────────────────────────────
        {
            label: 'Overview',
            key: 'overview',
            route: '/app/overview',
            icon: 'home',
            group: 'general',
            adminOnly: false,
            enabled: true,
        },
        // Event AUTHORING. Reading the calendar is public at `/events` now, so
        // this entry only earns its place for someone who can write.
        {
            label: 'Events',
            key: 'events',
            route: '/app/events',
            icon: 'calendar',
            group: 'general',
            adminOnly: false,
            anyCapability: ['manage_events'],
            enabled: true,
        },
        // Likewise: browsing and submitting are public; only the queue stayed.
        {
            label: 'Gallery queue',
            key: 'gallery',
            route: '/app/gallery/moderation',
            icon: 'image',
            group: 'general',
            adminOnly: false,
            anyCapability: ['moderate_gallery'],
            enabled: true,
        },
        // ── Administrative ───────────────────────────────────────────────────
        {
            label: 'Applications',
            key: 'apps',
            route: '/app/applications',
            icon: 'scroll',
            group: 'administrative',
            adminOnly: true,
            anyCapability: ['manage_applications'],
            enabled: true,
        },
        {
            label: 'Ranks & Medals',
            key: 'ranks',
            route: '/app/ranks',
            icon: 'award',
            group: 'administrative',
            adminOnly: true,
            anyCapability: ['edit_ranks_medals'],
            enabled: true,
        },
        {
            label: 'Audit Ledger',
            key: 'audit',
            route: '/app/audit',
            icon: 'activity',
            group: 'administrative',
            adminOnly: true,
            anyCapability: ['view_audit_log'],
            enabled: true,
        },
        // The list is imported from `settingsAccessGuard` rather than restated,
        // so the link and the route it opens cannot drift apart (T-0265).
        {
            label: 'Settings',
            key: 'settings',
            route: '/app/settings',
            icon: 'settings',
            group: 'administrative',
            adminOnly: true,
            anyCapability: SETTINGS_CAPABILITIES,
            enabled: true,
        },
        // No capability of its own — the bot page is read-only diagnostics, so
        // it keeps the coarse role gate.
        {
            label: 'Discord Bot',
            key: 'bot',
            route: '/app/bot',
            icon: 'bot',
            group: 'administrative',
            adminOnly: true,
            enabled: true,
        },
    ];

    /** Ordered group headings; empty groups are dropped in `visibleSections`. */
    private readonly groupOrder: { id: NavGroup; label: string }[] = [
        { id: 'general', label: 'General' },
        { id: 'administrative', label: 'Administrative' },
    ];

    /**
     * Whether the signed-in caller may see an entry: a capability check when the
     * entry declares one, the coarse role flag otherwise (T-0265).
     */
    private isPermitted(item: NavItem): boolean {
        if (item.anyCapability) {
            return item.anyCapability.some((c) => this.capabilities.includes(c));
        }
        return !item.adminOnly || this.isAdmin;
    }

    /**
     * Nav items bucketed into their labeled groups, with admin/capability/MVP-flag
     * filtering applied. A group whose every item is filtered away falls out
     * heading and all (T-0131).
     */
    get visibleSections(): NavSection[] {
        return this.groupOrder
            .map(({ id, label }) => ({
                id,
                label,
                items: this.navItems.filter(
                    (i) => i.group === id && i.enabled !== false && this.isPermitted(i),
                ),
            }))
            .filter((section) => section.items.length > 0);
    }

    /** Flat list of every visible item across groups — retained for existing consumers. */
    get visibleItems(): NavItem[] {
        return this.visibleSections.flatMap((section) => section.items);
    }

    /**
     * Where the footer user card points. A member's profile is a PUBLIC page now
     * (T-0287), so this leaves `/app` entirely; `/roster` is the same fallback
     * `AuthService.myProfilePath()` uses when there is no session to read.
     */
    get profileRoute(): string {
        return this.user.profilePath || '/roster';
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
