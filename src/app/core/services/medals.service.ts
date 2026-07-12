import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMedal, mapMedal } from '../models/api.model';
import { Medal, MedalRibbon } from '../models/member.model';

export interface MedalPayload {
    title?: string;
    glyph?: string;
    ribbon?: MedalRibbon;
    description?: string;
    precedence?: number;
    discordRoleName?: string;
}

@Injectable({ providedIn: 'root' })
export class MedalsService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/medals`;

    getAll(): Observable<Medal[]> {
        return this.http.get<ApiMedal[]>(this.base).pipe(map((rows) => rows.map(mapMedal)));
    }

    create(payload: MedalPayload): Observable<Medal> {
        return this.http.post<ApiMedal>(this.base, payload).pipe(map(mapMedal));
    }

    update(id: string, payload: MedalPayload): Observable<Medal> {
        return this.http.patch<ApiMedal>(`${this.base}/${id}`, payload).pipe(map(mapMedal));
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    /** Reorder the cabinet: `order` is medal ids top → bottom (precedence 1..N). */
    reorder(order: string[]): Observable<Medal[]> {
        return this.http
            .post<ApiMedal[]>(`${this.base}/reorder`, { order })
            .pipe(map((rows) => rows.map(mapMedal)));
    }

    linkDiscord(id: string, discordRoleId: string, discordRoleName?: string): Observable<Medal> {
        return this.http
            .post<ApiMedal>(`${this.base}/${id}/link-discord`, { discordRoleId, discordRoleName })
            .pipe(map(mapMedal));
    }

    unlinkDiscord(id: string): Observable<Medal> {
        return this.http
            .post<ApiMedal>(`${this.base}/${id}/unlink-discord`, {})
            .pipe(map(mapMedal));
    }
}
