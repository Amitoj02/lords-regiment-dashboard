import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiRank, mapRank } from '../models/api.model';
import { Rank } from '../models/member.model';

export interface RankPayload {
    name?: string;
    chevrons?: number;
    precedence?: number;
    discordRoleName?: string;
}

@Injectable({ providedIn: 'root' })
export class RanksService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/ranks`;

    getAll(): Observable<Rank[]> {
        return this.http.get<ApiRank[]>(this.base).pipe(map((rows) => rows.map(mapRank)));
    }

    create(payload: RankPayload): Observable<Rank> {
        return this.http.post<ApiRank>(this.base, payload).pipe(map(mapRank));
    }

    update(id: string, payload: RankPayload): Observable<Rank> {
        return this.http.patch<ApiRank>(`${this.base}/${id}`, payload).pipe(map(mapRank));
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    /** Reorder the ladder: `order` is rank ids top → bottom (precedence 1..N). */
    reorder(order: string[]): Observable<Rank[]> {
        return this.http
            .post<ApiRank[]>(`${this.base}/reorder`, { order })
            .pipe(map((rows) => rows.map(mapRank)));
    }

    linkDiscord(id: string, discordRoleId: string, discordRoleName?: string): Observable<Rank> {
        return this.http
            .post<ApiRank>(`${this.base}/${id}/link-discord`, { discordRoleId, discordRoleName })
            .pipe(map(mapRank));
    }

    unlinkDiscord(id: string): Observable<Rank> {
        return this.http.post<ApiRank>(`${this.base}/${id}/unlink-discord`, {}).pipe(map(mapRank));
    }
}
