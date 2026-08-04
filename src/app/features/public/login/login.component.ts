import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { RegimentPresentation } from '../../../core/models/api.model';
import { AuthService } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { SeoService } from '../../../core/services/seo.service';
import { LOGIN_DEFAULTS } from './login.defaults';

@Component({
    selector: 'hf-login-page',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class LoginPageComponent implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly regiment = inject(RegimentService);
    private readonly seo = inject(SeoService);
    private readonly destroyRef = inject(DestroyRef);
    isLoading = false;

    /**
     * Admin-authored branding for the left panel (T-0239).
     *
     * This page is reached SIGNED OUT, so the copy has to come off the anonymous
     * `GET /regiment` profile — never `GET /settings/presentation`, which needs a
     * capability the visitor could not possibly hold. Defaults stand in until (or
     * unless) that request lands, so a failed profile fetch degrades to the
     * shipped panel rather than an empty black rectangle behind the sign-in form.
     */
    loginBannerUrl: string = LOGIN_DEFAULTS.loginBannerUrl;
    loginQuote: string = LOGIN_DEFAULTS.loginQuote;
    loginQuoteAttribution: string = LOGIN_DEFAULTS.loginQuoteAttribution;
    /** Scrim alpha (0–1) fed to `--login-scrim`; see the SCSS for the mapping. */
    loginScrim: number = LOGIN_DEFAULTS.loginOverlayDensity / 100;

    /** The regiment's own name, so the panel is not hard-coded to one install. */
    regimentName = 'Lord Regiment';

    steps = [
        {
            num: 1,
            title: 'Authenticate with Discord',
            desc: 'We use Discord OAuth2 so you never create a separate password.',
        },
        {
            num: 2,
            title: 'Match your account',
            desc: 'Your Discord identity is matched against the roll. Not on it yet? You go straight to the enlistment form.',
        },
        {
            num: 3,
            // NOT "the dashboard" (T-0287): /app is staff-only now, so most
            // people who read this page will never see one. Name what they
            // actually get.
            title: 'Get your regiment access',
            desc: 'Your profile, event sign-ups, server details and the gallery.',
        },
    ];

    ngOnInit(): void {
        // A sign-in form is not a search result. Everything a visitor should
        // find is on /home, /roster, /events and /gallery, all of which carry a
        // route into this page.
        this.seo.apply({
            title: 'Sign In',
            description: 'Sign in to the regiment dashboard with Discord.',
            noIndex: true,
        });

        this.regiment
            .getProfile()
            .pipe(
                // An unprovisioned or unreachable API must not break sign-in — the
                // Discord button is the one thing on this page that has to work.
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((profile) => {
                if (profile?.name) {
                    this.regimentName = profile.name;
                }
                this.applyPresentation(profile?.presentation);
            });
    }

    /**
     * Fold the admin's presentation over the shipped defaults. Branches on
     * `== null`, never truthiness — `0` is a legitimate overlay density and an
     * empty attribution is a legitimate choice.
     */
    private applyPresentation(presentation: RegimentPresentation | undefined): void {
        if (!presentation) {
            return;
        }
        this.loginBannerUrl = presentation.loginBannerUrl ?? LOGIN_DEFAULTS.loginBannerUrl;
        this.loginQuote = presentation.loginQuote ?? LOGIN_DEFAULTS.loginQuote;
        // The attribution belongs to ITS quote: once the quote is custom, a blank
        // attribution prints no attribution line at all rather than a bare dash.
        this.loginQuoteAttribution =
            presentation.loginQuoteAttribution ??
            (presentation.loginQuote == null ? LOGIN_DEFAULTS.loginQuoteAttribution : '');
        this.loginScrim =
            (presentation.loginOverlayDensity ?? LOGIN_DEFAULTS.loginOverlayDensity) / 100;
    }

    signInWithDiscord(): void {
        this.isLoading = true;
        // Real OAuth2: full-page redirect to the backend, which (mock or live)
        // sends the browser back to /auth/callback with a session token.
        this.auth.initiateDiscordLogin();
    }
}
