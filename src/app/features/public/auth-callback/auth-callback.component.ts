import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';

/**
 * Landing target for the Discord OAuth handoff. On success the backend redirects
 * the browser here with the JWT + isMember in the URL FRAGMENT
 * (`#token=<jwt>&isMember=<bool>`), and `?error=<code>` in the query on failure.
 *
 * The token is delivered in the fragment, never the query string (LDA-H4): a
 * fragment is not transmitted to any server, so the JWT never lands in the
 * nginx/Caddy/Cloudflare access logs or in the `Referer` header. We read it from
 * `location.hash`, scrub it from the address bar/history immediately, persist it,
 * hydrate the current user, and route on (members → dashboard, identity-only →
 * apply).
 */
@Component({
    selector: 'hf-auth-callback',
    standalone: false,
    templateUrl: './auth-callback.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './auth-callback.component.scss',
})
export class AuthCallbackComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly auth = inject(AuthService);
    private readonly seo = inject(SeoService);

    error: string | null = null;

    ngOnInit(): void {
        // A transient handoff target that only ever exists mid-redirect — it
        // must never be the thing a search result offers somebody.
        this.seo.apply({
            title: 'Signing In',
            description: 'Completing your Discord sign-in.',
            noIndex: true,
        });

        const failure = this.route.snapshot.queryParamMap.get('error');

        // Parse the handoff from the URL fragment (never the query string, H4).
        const rawHash = window.location.hash.startsWith('#')
            ? window.location.hash.slice(1)
            : window.location.hash;
        const fragment = new URLSearchParams(rawHash);
        const token = fragment.get('token');

        // Strip the token from the URL before doing anything else with it, so it
        // does not linger in the address bar, browser history, or a later Referer.
        if (token) {
            history.replaceState(
                history.state,
                '',
                window.location.pathname + window.location.search,
            );
        }

        if (failure || !token) {
            this.error = failure ?? 'missing_token';
            setTimeout(() => this.router.navigateByUrl('/login'), 2000);
            return;
        }

        this.auth.completeLogin(token, fragment.get('isMember') === 'true');
    }
}
