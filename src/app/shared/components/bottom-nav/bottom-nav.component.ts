import { Component, Input, Output, EventEmitter } from '@angular/core';

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
    styleUrls: ['./bottom-nav.component.scss'],
})
export class BottomNavComponent {
    @Input() active = '';

    @Output() navigate = new EventEmitter<string>();

    // Events/Gallery are MVP-deferred (T-0026); omitted until wired.
    readonly items: BottomNavItem[] = [
        { label: 'Board', key: 'dashboard', route: '/app/dashboard', icon: 'home' },
        { label: 'Roster', key: 'roster', route: '/app/roster', icon: 'users' },
        { label: 'Me', key: 'profile', route: '/app/profile', icon: 'profile' },
    ];

    isActive(key: string): boolean {
        return this.active === key;
    }

    onNavigate(route: string): void {
        this.navigate.emit(route);
    }
}
