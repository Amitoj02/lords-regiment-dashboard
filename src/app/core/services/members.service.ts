import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMember, PaginatedResponse, mapMember } from '../models/api.model';
import { Member, MemberRole } from '../models/member.model';

/** A member's service-record timeline entry (GET /members/:id/service-record). */
export interface ServiceRecordEntry {
    id: string;
    occurredAt: string;
    type: string;
    event: string;
    note: string | null;
}

/** Sensitive command info (GET /members/:id/command-info; view_audit_log only). */
export interface CommandInfo {
    memberId: string;
    lastSignInAt: string | null;
    lastSignInIp: string | null;
    email: string | null;
    discordUsername: string | null;
    guildMember: boolean;
    suspendedUntil: string | null;
    bannedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class MembersService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/members`;

    /** The roster (first page — the backend caps `limit` at 100). */
    getAll(): Observable<Member[]> {
        return this.http
            .get<PaginatedResponse<ApiMember>>(`${this.base}?limit=100`)
            .pipe(map((res) => res.data.map(mapMember)));
    }

    getById(id: string): Observable<Member> {
        return this.http.get<ApiMember>(`${this.base}/${id}`).pipe(map(mapMember));
    }

    /** Self-service profile edit (PATCH; only platform/timezone/inGameName/avatarUrl). */
    update(id: string, changes: Partial<Member>): Observable<Member> {
        const body: Record<string, unknown> = {};
        if (changes.platform !== undefined) body['platform'] = changes.platform;
        if (changes.timezone !== undefined) body['timezone'] = changes.timezone;
        if (changes.inGameName !== undefined) body['inGameName'] = changes.inGameName;
        return this.http.patch<ApiMember>(`${this.base}/${id}`, body).pipe(map(mapMember));
    }

    // ── Admin actions (each returns the updated member) ──────────────────────
    changeRank(id: string, rankId: string, note?: string): Observable<Member> {
        return this.http
            .post<ApiMember>(`${this.base}/${id}/rank`, { rankId, note })
            .pipe(map(mapMember));
    }

    changeRole(id: string, role: MemberRole, note?: string): Observable<Member> {
        return this.http
            .post<ApiMember>(`${this.base}/${id}/role`, { role, note })
            .pipe(map(mapMember));
    }

    awardMedal(id: string, medalId: string, detail?: string): Observable<Member> {
        return this.http
            .post<ApiMember>(`${this.base}/${id}/medals`, { medalId, detail })
            .pipe(map(mapMember));
    }

    removeMedal(id: string, medalId: string): Observable<Member> {
        return this.http
            .delete<ApiMember>(`${this.base}/${id}/medals/${medalId}`)
            .pipe(map(mapMember));
    }

    suspend(id: string, until: string, reason?: string): Observable<Member> {
        return this.http
            .post<ApiMember>(`${this.base}/${id}/suspend`, { until, reason })
            .pipe(map(mapMember));
    }

    ban(id: string, reason?: string): Observable<Member> {
        return this.http.post<ApiMember>(`${this.base}/${id}/ban`, { reason }).pipe(map(mapMember));
    }

    unban(id: string): Observable<Member> {
        return this.http.post<ApiMember>(`${this.base}/${id}/unban`, {}).pipe(map(mapMember));
    }

    getServiceRecord(id: string): Observable<ServiceRecordEntry[]> {
        return this.http.get<ServiceRecordEntry[]>(`${this.base}/${id}/service-record`);
    }

    getCommandInfo(id: string): Observable<CommandInfo> {
        return this.http.get<CommandInfo>(`${this.base}/${id}/command-info`);
    }
}
