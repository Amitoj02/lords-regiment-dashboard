import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    ApiApplication,
    ApiMyApplication,
    PaginatedResponse,
    mapApplication,
} from '../models/api.model';
import { Application, MyApplication } from '../models/application.model';

/** Payload for the public recruitment intake (POST /applications). */
export interface CreateApplicationPayload {
    applicantName: string;
    inGameName: string;
    discordTag?: string;
    currentRegiment: string;
    howFound: string;
    preferredClasses: string;
    skillsToImprove: string;
    interestConfirmed: boolean;
    representativeNote?: string;
}

/** Editable fields for PATCH /applications/mine (a pending application). */
export type UpdateApplicationPayload = Partial<CreateApplicationPayload>;

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

    // ── Applicant self-service (the caller's own application) ────────────────────

    /** The caller's current application (or null) + whether they are blocked. */
    getMine(): Observable<MyApplication> {
        return this.http.get<ApiMyApplication>(`${this.base}/mine`).pipe(
            map((res) => ({
                application: res.application ? mapApplication(res.application) : null,
                blocked: res.blocked,
            })),
        );
    }

    /** Edit the caller's own PENDING application. */
    updateMine(payload: UpdateApplicationPayload): Observable<Application> {
        return this.http
            .patch<ApiApplication>(`${this.base}/mine`, payload)
            .pipe(map(mapApplication));
    }

    // ── Officer moderation of applicants ─────────────────────────────────────────

    /** Permanently block the applicant behind an application from re-applying. */
    blockApplicant(id: string, reason?: string): Observable<Application> {
        return this.http
            .post<ApiApplication>(`${this.base}/${id}/block`, { reason })
            .pipe(map(mapApplication));
    }

    /** Re-enable a previously blocked applicant. */
    unblockApplicant(id: string): Observable<Application> {
        return this.http
            .post<ApiApplication>(`${this.base}/${id}/unblock`, {})
            .pipe(map(mapApplication));
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
