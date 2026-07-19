import { Component, Input, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'hf-public-nav',
    templateUrl: './public-nav.component.html',
    styleUrls: ['./public-nav.component.scss'],
    standalone: false,
})
export class PublicNavComponent {
    @Input() activeLink = '';

    /** Drives the auth-aware CTA: member → Dashboard, applicant → status,
     *  anonymous → Join Discord + Sign in. */
    protected readonly auth = inject(AuthService);

    /** Mobile collapsible menu state. */
    menuOpen = false;

    navLinks = [
        { label: 'Home', path: '/' },
        { label: 'Events', path: '/events' },
        { label: 'Gallery', path: '/gallery' },
    ];

    isActive(path: string): boolean {
        return this.activeLink === path;
    }

    toggleMenu(): void {
        this.menuOpen = !this.menuOpen;
    }

    closeMenu(): void {
        this.menuOpen = false;
    }

    /** Drop the session (AuthService clears state + redirects to /login). */
    signOut(): void {
        this.closeMenu();
        this.auth.logout();
    }
}
