import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Application } from '../models/application.model';

const STUB_APPLICATIONS: Application[] = [
  {
    id: 'app1',
    applicantName: 'Yusuf Bey',
    discordTag: 'ybey#1789',
    inGameName: 'Yusuf_Bey',
    platform: 'steam',
    applicantType: 'Applicant',
    source: 'Discord server listing',
    submittedAt: '2026-06-02T14:30:00Z',
    status: 'pending',
    whyJoin: 'I want to be part of a disciplined regiment with a strong community.',
    howFound: 'Found the regiment on the Holdfast Discord server list.',
    priorExperience: 'Two seasons with the 42nd Foot, some experience with organised events.',
    timezone: 'Europe/Istanbul',
    isPreviousApplicant: false,
  },
  {
    id: 'app2',
    applicantName: 'Lorne Hadley',
    discordTag: 'lhadley#2210',
    inGameName: 'Lorne_H',
    platform: 'steam',
    applicantType: 'Applicant',
    source: 'Friend referral',
    submittedAt: '2026-06-01T09:00:00Z',
    status: 'pending',
    whyJoin: 'Bjorn Trager recommended the regiment. Looking for a structured group.',
    howFound: 'Referred by Bjorn Trager.',
    priorExperience: 'New to Holdfast, experienced in other milsim games.',
    timezone: 'America/Chicago',
    isPreviousApplicant: false,
  },
  {
    id: 'app3',
    applicantName: 'Elara Finch',
    discordTag: 'efinch#3344',
    inGameName: 'Elara_F',
    platform: 'xbox',
    applicantType: 'Mercenary',
    source: 'In-game',
    submittedAt: '2026-05-28T18:00:00Z',
    status: 'pending',
    whyJoin: 'Looking for occasional battle participation without full commitment.',
    howFound: 'Met regiment members in a public server.',
    priorExperience: 'Casual player, no prior regiment experience.',
    timezone: 'America/Denver',
    isPreviousApplicant: false,
  },
  {
    id: 'app4',
    applicantName: 'Conrad Ashe',
    discordTag: 'cashe#0099',
    inGameName: 'Conrad_Ashe',
    platform: 'steam',
    applicantType: 'Applicant',
    source: 'Reddit',
    submittedAt: '2026-05-20T12:00:00Z',
    status: 'approved',
    whyJoin: 'Regiment looked great in YouTube clips.',
    howFound: 'r/holdfast thread.',
    priorExperience: 'One year with the 1st Guards.',
    timezone: 'Europe/London',
    isPreviousApplicant: false,
    moderatorNote: 'Strong application, good prior experience.',
  },
  {
    id: 'app5',
    applicantName: 'Nadia Voss',
    discordTag: 'nvoss#4422',
    inGameName: 'Nadia_V',
    platform: 'steam',
    applicantType: 'Applicant',
    source: 'YouTube',
    submittedAt: '2026-05-15T08:30:00Z',
    status: 'declined',
    whyJoin: 'Interesting regiment.',
    howFound: 'YouTube showcase video.',
    priorExperience: 'None specified.',
    timezone: 'Europe/Amsterdam',
    isPreviousApplicant: true,
    moderatorNote: 'Previous application declined for conduct issues. Declined again.',
  },
  {
    id: 'app6',
    applicantName: 'Theo Kiran',
    discordTag: 'tkiran#5511',
    inGameName: 'Theo_K',
    platform: 'ps',
    applicantType: 'Applicant',
    source: 'Discord server listing',
    submittedAt: '2026-06-03T17:00:00Z',
    status: 'held',
    whyJoin: 'Want to join a serious regiment.',
    howFound: 'Discord listing.',
    priorExperience: 'Six months with a casual group.',
    timezone: 'Asia/Kolkata',
    isPreviousApplicant: false,
    moderatorNote: 'Holding pending timezone availability check.',
  },
];

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  // TODO: replace with HttpClient calls to /api/applications

  getAll(): Observable<Application[]> {
    return of(STUB_APPLICATIONS);
  }

  getById(id: string): Observable<Application | undefined> {
    return of(STUB_APPLICATIONS.find(a => a.id === id));
  }

  approve(id: string, note?: string): Observable<Application | undefined> {
    // TODO: POST /api/applications/:id/approve
    const idx = STUB_APPLICATIONS.findIndex(a => a.id === id);
    if (idx !== -1) {
      STUB_APPLICATIONS[idx] = { ...STUB_APPLICATIONS[idx], status: 'approved', moderatorNote: note };
      return of(STUB_APPLICATIONS[idx]);
    }
    return of(undefined);
  }

  decline(id: string, note?: string): Observable<Application | undefined> {
    // TODO: POST /api/applications/:id/decline
    const idx = STUB_APPLICATIONS.findIndex(a => a.id === id);
    if (idx !== -1) {
      STUB_APPLICATIONS[idx] = { ...STUB_APPLICATIONS[idx], status: 'declined', moderatorNote: note };
      return of(STUB_APPLICATIONS[idx]);
    }
    return of(undefined);
  }

  hold(id: string, note?: string): Observable<Application | undefined> {
    // TODO: POST /api/applications/:id/hold
    const idx = STUB_APPLICATIONS.findIndex(a => a.id === id);
    if (idx !== -1) {
      STUB_APPLICATIONS[idx] = { ...STUB_APPLICATIONS[idx], status: 'held', moderatorNote: note };
      return of(STUB_APPLICATIONS[idx]);
    }
    return of(undefined);
  }
}
