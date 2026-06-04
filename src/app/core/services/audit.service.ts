import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuditLog } from '../models/audit-log.model';

const STUB_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'al1',
    timestamp: '2026-06-04T10:02:00Z',
    actor: 'Jameson Nolt',
    action: 'APPLICATION_APPROVED',
    detail: 'Application from Conrad Ashe approved.',
    severity: 'info',
    targetUser: 'Conrad Ashe',
    discordSynced: true,
    requestId: 'req-001',
  },
  {
    id: 'al2',
    timestamp: '2026-06-04T09:45:00Z',
    actor: 'Sade Wren',
    action: 'APPLICATION_DECLINED',
    detail: 'Application from Nadia Voss declined — prior conduct issues.',
    severity: 'warn',
    targetUser: 'Nadia Voss',
    discordSynced: true,
    requestId: 'req-002',
  },
  {
    id: 'al3',
    timestamp: '2026-06-04T08:30:00Z',
    actor: 'Alistair Holcombe',
    action: 'RANK_UPDATED',
    detail: 'Mara Erskine promoted from Private to Corporal.',
    severity: 'info',
    targetUser: 'Mara Erskine',
    beforeState: 'Private',
    afterState: 'Corporal',
    discordSynced: true,
    requestId: 'req-003',
  },
  {
    id: 'al4',
    timestamp: '2026-06-03T22:15:00Z',
    actor: 'Diego Vasquez',
    action: 'GALLERY_APPROVED',
    detail: 'Gallery item "Siege Defense Highlights" approved.',
    severity: 'info',
    discordSynced: false,
    requestId: 'req-004',
  },
  {
    id: 'al5',
    timestamp: '2026-06-03T20:00:00Z',
    actor: 'Rhett Asher',
    action: 'EVENT_CREATED',
    detail: 'Event "Officer Training Drill" created for 2026-06-04.',
    severity: 'info',
    discordSynced: true,
    requestId: 'req-005',
  },
  {
    id: 'al6',
    timestamp: '2026-06-03T18:00:00Z',
    actor: 'System',
    action: 'DISCORD_SYNC_FAILED',
    detail: 'Discord role sync failed for Bjorn Trager — account not linked.',
    severity: 'err',
    targetUser: 'Bjorn Trager',
    discordSynced: false,
    requestId: 'req-006',
  },
  {
    id: 'al7',
    timestamp: '2026-06-02T14:35:00Z',
    actor: 'Jameson Nolt',
    action: 'MEMBER_ROLE_CHANGED',
    detail: 'Konstantin Soto role changed from Applicant to Mercenary.',
    severity: 'info',
    targetUser: 'Konstantin Soto',
    beforeState: 'Applicant',
    afterState: 'Mercenary',
    discordSynced: false,
    requestId: 'req-007',
  },
  {
    id: 'al8',
    timestamp: '2026-06-01T10:00:00Z',
    actor: 'Alistair Holcombe',
    action: 'SETTINGS_UPDATED',
    detail: 'Regiment settings updated — event notification defaults changed.',
    severity: 'warn',
    discordSynced: false,
    requestId: 'req-008',
  },
  {
    id: 'al9',
    timestamp: '2026-05-30T15:00:00Z',
    actor: 'System',
    action: 'MEMBER_STATUS_AUTO_INACTIVE',
    detail: 'Bjorn Trager automatically marked Inactive after 30 days inactivity.',
    severity: 'warn',
    targetUser: 'Bjorn Trager',
    beforeState: 'Active',
    afterState: 'Inactive',
    discordSynced: false,
    requestId: 'req-009',
  },
  {
    id: 'al10',
    timestamp: '2026-05-25T23:05:00Z',
    actor: 'Diego Vasquez',
    action: 'EVENT_COMPLETED',
    detail: 'Event "May Grand Campaign — Final Assault" marked as previous.',
    severity: 'info',
    discordSynced: true,
    requestId: 'req-010',
  },
];

@Injectable({ providedIn: 'root' })
export class AuditService {
  // TODO: replace with HttpClient calls to /api/audit

  getAll(): Observable<AuditLog[]> {
    return of(STUB_AUDIT_LOGS);
  }

  getById(id: string): Observable<AuditLog | undefined> {
    return of(STUB_AUDIT_LOGS.find(l => l.id === id));
  }

  getBySeverity(severity: AuditLog['severity']): Observable<AuditLog[]> {
    // TODO: GET /api/audit?severity=:severity
    return of(STUB_AUDIT_LOGS.filter(l => l.severity === severity));
  }
}
