import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'hf-login-page',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginPageComponent {
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

  constructor(private router: Router) {}

  signInWithDiscord(): void {
    this.isLoading = true;
    // Simulate OAuth redirect — in production this would call auth.initiateDiscordOAuth()
    setTimeout(() => {
      this.isLoading = false;
      this.router.navigate(['/member/dashboard']);
    }, 1200);
  }
}
