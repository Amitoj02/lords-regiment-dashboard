import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'hf-login-page',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    standalone: false,
})
export class LoginPageComponent {
    private readonly auth = inject(AuthService);
    isLoading = false;

    steps = [
        {
            num: 1,
            title: 'Authenticate with Discord',
            desc: 'We use Discord OAuth2 so you never create a separate password.',
        },
        {
            num: 2,
            title: 'Match your account',
            desc: 'Your Discord identity is matched against the regimental roll.',
        },
        {
            num: 3,
            title: 'Access the dashboard',
            desc: 'View orders, manage your profile, and track regiment activity.',
        },
    ];

    signInWithDiscord(): void {
        this.isLoading = true;
        // Real OAuth2: full-page redirect to the backend, which (mock or live)
        // sends the browser back to /auth/callback with a session token.
        this.auth.initiateDiscordLogin();
    }
}
