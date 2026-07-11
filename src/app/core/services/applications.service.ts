import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiApplication, PaginatedResponse, mapApplication } from '../models/api.model';
import { Application } from '../models/application.model';

/** Payload for the public recruitment intake (POST /applications). */
export interface CreateApplicationPayload {
    applicantName: string;
    inGameName: string;
    platform: string;
    applicantType?: 'Applicant' | 'Mercenary';
    discordTag?: string;
    timezone?: string;
    whyJoin: string;
    howFound: string;
    priorExperience?: string;
    ageConfirmed: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/applications`;

    /** Staff review queue. Optional status filter (pending/approved/declined/held). */
    getAll(status?: Application['status']): Observable<Application[]> {
        const q = status ? `?status=${status}&limit=100` : '?limit=100';
        return this.http
            .get<PaginatedResponse<ApiApplication>>(`${this.base}${q}`)
            .pipe(map((res) => res.data.map(mapApplication)));
    }

    getById(id: string): Observable<Application> {
        return this.http.get<ApiApplication>(`${this.base}/${id}`).pipe(map(mapApplication));
    }

    /** Public intake — the apply form. The submitter must be signed in (identity). */
    submit(payload: CreateApplicationPayload): Observable<Application> {
        return this.http.post<ApiApplication>(this.base, payload).pipe(map(mapApplication));
    }

    approve(id: string): Observable<Application> {
        return this.http
            .post<ApiApplication>(`${this.base}/${id}/approve`, {})
            .pipe(map(mapApplication));
    }

    decline(id: string, reason?: string): Observable<Application> {
        return this.http
            .post<ApiApplication>(`${this.base}/${id}/decline`, { reason })
            .pipe(map(mapApplication));
    }

    hold(id: string, note?: string): Observable<Application> {
        return this.http
            .post<ApiApplication>(`${this.base}/${id}/hold`, { note })
            .pipe(map(mapApplication));
    }
}
