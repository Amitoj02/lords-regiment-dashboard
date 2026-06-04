import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface NavUser {
  name: string;
  rank: string;
}

interface NavItem {
  label: string;
  route: string;
  icon: string;
  adminOnly: boolean;
}

@Component({
  standalone: false,
  selector: 'hf-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Input() active = '';
  @Input() user: NavUser = { name: '', rank: '' };
  @Input() isAdmin = false;

  @Output() navigate = new EventEmitter<string>();

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',     route: '/dashboard',      icon: 'home',         adminOnly: false },
    { label: 'Events',        route: '/events',         icon: 'calendar',     adminOnly: false },
    { label: 'Gallery',       route: '/gallery',        icon: 'image',        adminOnly: false },
    { label: 'Members',       route: '/members',        icon: 'users',        adminOnly: false },
    { label: 'Applications',  route: '/applications',   icon: 'scroll',       adminOnly: true  },
    { label: 'Ranks & Medals',route: '/ranks-medals',   icon: 'award',        adminOnly: true  },
    { label: 'Audit Ledger',  route: '/audit',          icon: 'activity',     adminOnly: true  },
    { label: 'Settings',      route: '/settings',       icon: 'settings',     adminOnly: true  },
  ];

  get visibleItems(): NavItem[] {
    return this.navItems.filter(i => !i.adminOnly || this.isAdmin);
  }

  isActive(route: string): boolean {
    return this.active === route || this.active.startsWith(route + '/');
  }

  onNavigate(route: string): void {
    this.navigate.emit(route);
  }

  get initials(): string {
    return this.user.name
      .split(' ')
      .map(s => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get avatarBg(): string {
    const h = Array.from(this.user.name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `oklch(0.32 0.04 ${h})`;
  }
}
