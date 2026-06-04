import { Component, OnInit } from '@angular/core';
import { Member } from '../../../core/models/member.model';
import { MembersService } from '../../../core/services/members.service';

@Component({
  selector: 'hf-roster',
  templateUrl: './roster.component.html',
  styleUrls: ['./roster.component.scss'],
  standalone: false,
})
export class RosterComponent implements OnInit {
  allMembers: Member[] = [];
  filteredMembers: Member[] = [];

  searchQuery = '';
  filterRank = '';
  filterRole = '';
  filterStatus = '';

  ranks = ['Colonel', 'Major', 'Captain', 'Lieutenant', 'Sergeant', 'Corporal', 'Private', 'Mercenary', 'Applicant'];
  roles = ['Owner', 'Admin', 'Moderator', 'Member', 'Mercenary', 'Applicant'];
  statuses = ['Active', 'Inactive', 'Pending'];

  constructor(private membersService: MembersService) {}

  ngOnInit(): void {
    this.membersService.getAll().subscribe(members => {
      this.allMembers = members;
      this.filteredMembers = members;
    });
  }

  applyFilters(): void {
    let results = this.allMembers;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      results = results.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.discordTag.toLowerCase().includes(q) ||
        m.inGameName.toLowerCase().includes(q)
      );
    }

    if (this.filterRank) {
      results = results.filter(m => m.rank === this.filterRank);
    }

    if (this.filterRole) {
      results = results.filter(m => m.role === this.filterRole);
    }

    if (this.filterStatus) {
      results = results.filter(m => m.status === this.filterStatus);
    }

    this.filteredMembers = results;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterRank = '';
    this.filterRole = '';
    this.filterStatus = '';
    this.filteredMembers = this.allMembers;
  }

  formatLastSeen(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getRoleClass(role: string): string {
    switch (role) {
      case 'Owner': return 'brass';
      case 'Admin': return 'ox';
      case 'Moderator': return 'blue';
      case 'Member': return 'parch';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Active': return 'laurel';
      case 'Inactive': return 'parch';
      case 'Pending': return 'brass';
      default: return '';
    }
  }
}
