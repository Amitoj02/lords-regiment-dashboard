import { Injectable, signal } from '@angular/core';
import { Member } from '../models/member.model';

export interface CurrentUser {
  id: string;
  name: string;
  rank: string;
  role: Member['role'];
  discordTag: string;
  discordLinked: boolean;
  avatarUrl?: string;
}

// Stub: logged-in as Jameson Nolt (Lieutenant, Moderator)
const STUB_USER: CurrentUser = {
  id: 'm4',
  name: 'Jameson Nolt',
  rank: 'Lieutenant',
  role: 'Moderator',
  discordTag: 'jnolt#0308',
  discordLinked: true,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  // TODO: replace with real authentication (JWT / Discord OAuth)

  readonly currentUser = signal<CurrentUser | null>(STUB_USER);

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  isAdmin(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return user.role === 'Owner' || user.role === 'Admin' || user.role === 'Moderator';
  }

  isOwnerOrAdmin(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return user.role === 'Owner' || user.role === 'Admin';
  }

  login(user: CurrentUser): void {
    // TODO: implement real login flow
    this.currentUser.set(user);
  }

  logout(): void {
    // TODO: call /api/auth/logout
    this.currentUser.set(null);
  }
}
