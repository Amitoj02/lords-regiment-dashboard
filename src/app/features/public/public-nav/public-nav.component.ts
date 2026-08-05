import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';

/** A top-level destination on the public site. */
interface PublicNavLink {
    label: string;
    path: string;
    /**
     * Whether the highlight requires the WHOLE URL to match. Only Home does:
     * every other entry owns a subtree (`/events/:id`, `/gallery/:id`) whose
     * pages should keep their parent lit.
     */
    exact: boolean;
}

@Component({
    selector: 'hf-public-nav',
    templateUrl: './public-nav.component.html',
    styleUrls: ['./public-nav.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class PublicNavComponent implements OnInit {
    /** Drives the auth-aware CTA: staff → dashboard, member → their profile,
     *  applicant → status, anonymous → Join Discord + Sign in. */
    protected readonly auth = inject(AuthService);

    private readonly regiment = inject(RegimentService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    /**
     * The regiment's configured Discord invite (T-0234). Null until GET /regiment
     * lands, and null forever if no invite is configured — the Join Discord CTA
     * is then hidden rather than rendered as a link that goes nowhere.
     */
    discordInviteUrl: string | null = null;

    /** Mobile collapsible menu state. */
    menuOpen = false;

    /**
     * True on the pages that ARE the sign-in flow (T-0287).
     *
     * Offering "Sign in" in the topbar of the sign-in page is the kind of dead
     * control that makes a site feel unfinished — it either does nothing or
     * reloads the page you are already reading. "Join Discord" goes with it:
     * beside "Continue with Discord" it reads as the same button twice when the
     * two do entirely different things, and the footer still carries the invite
     * for anyone who wants it.
     *
     * Read from the router rather than passed in, so nothing has to remember to
     * set it.
     */
    get onAuthPage(): boolean {
        const url = this.router.url.split('?')[0].split('#')[0];
        return url === '/login' || url.startsWith('/auth/');
    }

    /**
     * `/home` rather than `/`, because the root route redirects there — a `/`
     * link would highlight nothing once the redirect has rewritten the URL.
     */
    readonly navLinks: readonly PublicNavLink[] = [
        { label: 'Home', path: '/home', exact: true },
        { label: 'Roster', path: '/roster', exact: false },
        { label: 'Events', path: '/events', exact: false },
        { label: 'Gallery', path: '/gallery', exact: false },
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
