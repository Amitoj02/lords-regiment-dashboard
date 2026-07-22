import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';

@Component({
    selector: 'hf-public-nav',
    templateUrl: './public-nav.component.html',
    styleUrls: ['./public-nav.component.scss'],
    standalone: false,
})
export class PublicNavComponent implements OnInit {
    @Input() activeLink = '';

    /** Drives the auth-aware CTA: member → Dashboard, applicant → status,
     *  anonymous → Join Discord + Sign in. */
    protected readonly auth = inject(AuthService);

    private readonly regiment = inject(RegimentService);
    private readonly destroyRef = inject(DestroyRef);

    /**
     * The regiment's configured Discord invite (T-0234). Null until GET /regiment
     * lands, and null forever if no invite is configured — the Join Discord CTA
     * is then hidden rather than rendered as a link that goes nowhere.
     */
    discordInviteUrl: string | null = null;

    /** Mobile collapsible menu state. */
    menuOpen = false;

    navLinks = [
        { label: 'Home', path: '/' },
        { label: 'Events', path: '/events' },
        { label: 'Gallery', path: '/gallery' },
    ];

    ngOnInit(): void {
        // A failed profile fetch must not break the topbar: swallow it and leave
        // the invite CTA hidden, exactly as for an unconfigured invite.
        this.regiment
            .getProfile()
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((profile) => {
                this.discordInviteUrl = profile?.discordInviteUrl?.trim() || null;
            });
    }

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
