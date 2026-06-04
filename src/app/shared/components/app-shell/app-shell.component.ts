import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CurrentUser } from '../../../core/services/auth.service';

@Component({
  standalone: false,
  selector: 'hf-app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
})
export class AppShellComponent implements OnInit {
  @Input() activeRoute = '';
  @Input() crumbs: string[] = [];
  @Input() title = '';

  currentUser: CurrentUser | null = null;
  isAdmin = false;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.currentUser();
    this.isAdmin = this.auth.isAdmin();
  }

  get navUser(): { name: string; rank: string } {
    return {
      name: this.currentUser?.name ?? '',
      rank: this.currentUser?.rank ?? '',
    };
  }

  onNavigate(route: string): void {
    this.router.navigateByUrl(route);
  }
}
