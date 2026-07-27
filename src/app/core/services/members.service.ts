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

/**
 * What a "Derive data from Discord" run found (backend T-0204). Unlike every
 * other admin action this one does not answer with a bare member: the caller did
 * not know what would happen, so the response says what it did. Finding NOTHING
 * is a success — `rank` null and `medals` empty, with a summary that says so.
 */
export interface DeriveFromDiscordResult {
    member: Member;
    /** The rank pulled across, or null when the rank was left alone. */
    rank: string | null;
    /** Titles of the medals newly credited (ones already held are skipped). */
    medals: string[];
    /** One human sentence, authored by the server so it matches the audit entry. */
    summary: string;
}

/** The raw wire shape of {@link DeriveFromDiscordResult}. */
interface ApiDeriveResult {
    member: ApiMember;
    rank: string | null;
    medals: string[];
    summary: string;
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

    /**
     * Credit a member with the rank + medals their Discord roles already carry
     * (POST /members/:id/derive-from-discord). Promotion-only, additive-only on
     * medals, and safe to press twice — see {@link DeriveFromDiscordResult}.
     */
    deriveFromDiscord(id: string): Observable<DeriveFromDiscordResult> {
        return this.http
            .post<ApiDeriveResult>(`${this.base}/${id}/derive-from-discord`, {})
            .pipe(map((res) => ({ ...res, member: mapMember(res.member) })));
    }

    getServiceRecord(id: string): Observable<ServiceRecordEntry[]> {
        return this.http.get<ServiceRecordEntry[]>(`${this.base}/${id}/service-record`);
    }
}
