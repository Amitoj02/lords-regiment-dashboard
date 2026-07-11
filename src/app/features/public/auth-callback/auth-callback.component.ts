import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Landing target for the Discord OAuth handoff. The backend redirects the
 * browser here with `?token=<jwt>&isMember=<bool>` on success (or
 * `?error=<code>` on failure). We persist the token, hydrate the current user
 * and route on (members → dashboard, identity-only → apply).
 */
@Component({
    selector: 'hf-auth-callback',
    standalone: false,
    templateUrl: './auth-callback.component.html',
    styleUrl: './auth-callback.component.scss',
})
export class AuthCallbackComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly auth = inject(AuthService);

    error: string | null = null;

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        const token = params.get('token');
        const failure = params.get('error');

        if (failure || !token) {
            this.error = failure ?? 'missing_token';
            setTimeout(() => this.router.navigateByUrl('/login'), 2000);
            return;
        }

        this.auth.completeLogin(token, params.get('isMember') === 'true');
    }
}
