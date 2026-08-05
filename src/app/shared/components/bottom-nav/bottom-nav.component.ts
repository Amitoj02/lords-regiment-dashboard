import {
    Component,
    Input,
    Output,
    EventEmitter,
    inject,
    ChangeDetectionStrategy,
} from '@angular/core';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';

interface BottomNavItem {
    label: string;
    /** Active-state key — matches the `activeRoute` value each page supplies. */
    key: string;
    /** Router URL to navigate to. Must resolve to a real configured route. */
    route: string;
    icon: string;
    /** Capability required to see the tab; absent = every staff viewer gets it. */
    capability?: string;
}

/**
 * Declared at module scope so the object identities never change: `items` hands
 * back a filtered slice of this list and the template tracks by identity.
 */
const BOTTOM_NAV_ITEMS: readonly BottomNavItem[] = [
    { label: 'Overview', key: 'overview', route: '/app/overview', icon: 'home' },
    {
        label: 'Applications',
        key: 'apps',
        route: '/app/applications',
        icon: 'scroll',
        capability: 'manage_applications',
    },
    {
        label: 'Queue',
        key: 'gallery',
        route: '/app/gallery/moderation',
        icon: 'image',
        capability: 'moderate_gallery',
    },
];

/**
 * Mobile bottom navigation bar for the STAFF console. Mirrors the `.bnav`
 * pattern from design-reference/screens-mobile.jsx. Hidden above the mobile
 * breakpoint via CSS; visible only on phones/small tablets where the sidebar
 * collapses.
 *
 * The old Board/Roster/Me trio is gone (T-0287): two thirds of it were public
 * pages, and `/app` is staff-only now.
 */
@Component({
    standalone: false,
    selector: 'hf-bottom-nav',
    templateUrl: './bottom-nav.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./bottom-nav.component.scss'],
})
export class BottomNavComponent {
    private readonly auth = inject(AuthService);

    @Input() active = '';

    @Output() navigate = new EventEmitter<string>();

    // Memoized so the array identity stays stable across change-detection
    // cycles. Keyed on the whole session object rather than the uid, because the
    // tabs now depend on capabilities — which a permission change can alter
    // without the uid moving.
    private cachedUser: CurrentUser | null | undefined;
    private cachedItems: BottomNavItem[] = [];

    /**
     * The tabs this viewer can actually open. `staffGuard` admits anyone holding
     * ANY one staff capability, so a Moderator with only `moderate_gallery`
     * would otherwise get an Applications tab that bounces them straight back.
     */
    get items(): BottomNavItem[] {
        const user = this.auth.currentUser();
        if (user !== this.cachedUser) {
            this.cachedUser = user;
            const capabilities = user?.capabilities ?? [];
            this.cachedItems = BOTTOM_NAV_ITEMS.filter(
                (item) => !item.capability || capabilities.includes(item.capability),
            );
        }
        return this.cachedItems;
    }

    isActive(key: string): boolean {
        return this.active === key;
    }

    onNavigate(route: string): void {
        this.navigate.emit(route);
    }
}
