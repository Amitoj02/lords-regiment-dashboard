import { Component, Input } from '@angular/core';

@Component({
  selector: 'hf-public-nav',
  templateUrl: './public-nav.component.html',
  styleUrls: ['./public-nav.component.scss'],
  standalone: false,
})
export class PublicNavComponent {
  @Input() activeLink = '';

  navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Events', path: '/events' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'Officers', path: '/officers' },
    { label: 'Charter', path: '/charter' },
  ];

  isActive(path: string): boolean {
    return this.activeLink === path;
  }
}
