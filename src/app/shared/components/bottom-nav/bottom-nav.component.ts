import {
    Component,
    Input,
    Output,
    EventEmitter,
    inject,
    ChangeDetectionStrategy,
} from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

interface BottomNavItem {
    label: string;
    /** Active-state key — matches the `activeRoute` value each page supplies. */
    key: string;
    /** Router URL to navigate to. Must resolve to a real configured route. */
    route: string;
    icon: string;
}

/**
 * Mobile bottom navigation bar. Mirrors the `.bnav` pattern from
 * design-reference/screens-mobile.jsx. Hidden above the mobile breakpoint
 * via CSS; visible only on phones/small tablets where the sidebar collapses.
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

    // Memoized so the array identity stays stable across change-detection cycles
    // (the template tracks items by object identity) — it only rebuilds when the
    // signed-in uid changes, which repoints the "Me" tab at the user's own profile.
    private cachedUid: string | null | undefined;
    private cachedItems: BottomNavItem[] = [];

    // Events/Gallery are MVP-deferred (T-0026); omitted until wired.
    get items(): BottomNavItem[] {
        const uid = this.auth.currentUser()?.id ?? null;
        if (uid !== this.cachedUid) {
            this.cachedUid = uid;
            // "Me" routes to the signed-in member's own profile (T-0139); falls
            // back to the id-less alias until the user has hydrated.
            const profileRoute = uid ? `/app/profile/${uid}` : '/app/profile';
            this.cachedItems = [
                { label: 'Board', key: 'dashboard', route: '/app/dashboard', icon: 'home' },
                { label: 'Roster', key: 'roster', route: '/app/roster', icon: 'users' },
                { label: 'Me', key: 'profile', route: profileRoute, icon: 'profile' },
            ];
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
