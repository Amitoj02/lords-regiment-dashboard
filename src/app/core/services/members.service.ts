import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEvent, ApiMember, PaginatedResponse, mapEvent, mapMember } from '../models/api.model';
import { Member, MemberRole } from '../models/member.model';
import { RegimentEvent } from '../models/event.model';

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

    /**
     * Self-service profile edit (PATCH). Sends only the fields the backend
     * self-edit DTO accepts: inGameName (the sole display identity) and the
     * storage KEYS of freshly-uploaded avatar/banner images (avatarKey/bannerKey).
     */
    update(id: string, changes: Partial<Member>): Observable<Member> {
        const body: Record<string, unknown> = {};
        if (changes.inGameName !== undefined) body['inGameName'] = changes.inGameName;
        if (changes.avatarKey !== undefined) body['avatarKey'] = changes.avatarKey;
        if (changes.bannerKey !== undefined) body['bannerKey'] = changes.bannerKey;
        return this.http.patch<ApiMember>(`${this.base}/${id}`, body).pipe(map(mapMember));
    }

    /** A member's attended events (profile Event History tab, T-0142). */
    getEvents(id: string): Observable<RegimentEvent[]> {
        return this.http
            .get<ApiEvent[]>(`${this.base}/${id}/events`)
            .pipe(map((rows) => rows.map(mapEvent)));
    }

    /** A member's event RSVPs (profile RSVPs tab, T-0142). */
    getRsvps(id: string): Observable<RegimentEvent[]> {
        return this.http
            .get<ApiEvent[]>(`${this.base}/${id}/rsvps`)
            .pipe(map((rows) => rows.map(mapEvent)));
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

    /** Lift an active suspension (POST /members/:id/unsuspend). Mirrors {@link unban}. */
    unsuspend(id: string): Observable<Member> {
        return this.http.post<ApiMember>(`${this.base}/${id}/unsuspend`, {}).pipe(map(mapMember));
    }

    getServiceRecord(id: string): Observable<ServiceRecordEntry[]> {
        return this.http.get<ServiceRecordEntry[]>(`${this.base}/${id}/service-record`);
    }

    getCommandInfo(id: string): Observable<CommandInfo> {
        return this.http.get<CommandInfo>(`${this.base}/${id}/command-info`);
    }
}
