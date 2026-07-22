import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    ApiApplicantApplication,
    ApiApplication,
    ApiMyApplication,
    PaginatedResponse,
    mapApplicantApplication,
    mapApplication,
} from '../models/api.model';
import {
    ApplicantApplication,
    ApplicantType,
    Application,
    MyApplication,
} from '../models/application.model';

/** Payload for the public recruitment intake (POST /applications). */
export interface CreateApplicationPayload {
    applicantName: string;
    inGameName: string;
    applicantType?: ApplicantType;
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

    /**
     * Public intake — the apply form. The submitter must be signed in (identity).
     * Returns the APPLICANT projection, not the staff one (T-0154).
     */
    submit(payload: CreateApplicationPayload): Observable<ApplicantApplication> {
        return this.http
            .post<ApiApplicantApplication>(this.base, payload)
            .pipe(map(mapApplicantApplication));
    }

    // ── Applicant self-service (the caller's own application) ────────────────────

    /**
     * The caller's current application (or null) + whether they are blocked.
     * These three self-service endpoints return the applicant projection: no
     * moderator note, no decline reason, no decision attribution — only the
     * officer's `userMessage` (T-0249).
     */
    getMine(): Observable<MyApplication> {
        return this.http.get<ApiMyApplication>(`${this.base}/mine`).pipe(
            map((res) => ({
                application: res.application ? mapApplicantApplication(res.application) : null,
                blocked: res.blocked,
            })),
        );
    }

    /** Edit the caller's own PENDING application. */
    updateMine(payload: UpdateApplicationPayload): Observable<ApplicantApplication> {
        return this.http
            .patch<ApiApplicantApplication>(`${this.base}/mine`, payload)
            .pipe(map(mapApplicantApplication));
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

    /**
     * Approve → promotes the applicant to a member. `userMessage` is the body
     * DM'd to the applicant; blank falls back to the backend default template.
     */
    approve(id: string, userMessage?: string): Observable<Application> {
        return this.http
            .post<ApiApplication>(`${this.base}/${id}/approve`, { discordDmMessage: userMessage })
            .pipe(map(mapApplication));
    }

    /**
     * Decline → `note` is the STAFF-ONLY moderator note and `userMessage` is
     * what the applicant actually receives (DM + status page).
     *
     * The note used to be posted as `reason`, which the applicant's status page
     * then rendered verbatim (T-0248). It now goes to the dedicated `note` field
     * the backend added for exactly this; `reason` is left unsent because the
     * console has no separate box for it, and the API treats an absent field as
     * "unchanged" rather than blanking what is stored.
     */
    decline(id: string, note?: string, userMessage?: string): Observable<Application> {
        return this.http
            .post<ApiApplication>(`${this.base}/${id}/decline`, {
                note,
                discordDmMessage: userMessage,
            })
            .pipe(map(mapApplication));
    }

    /**
     * Hold → `note` is the STAFF-ONLY officer note; `userMessage` is the
     * (optional) personalised body sent to the applicant.
     */
    hold(id: string, note?: string, userMessage?: string): Observable<Application> {
        return this.http
            .post<ApiApplication>(`${this.base}/${id}/hold`, {
                note,
                discordDmMessage: userMessage,
            })
            .pipe(map(mapApplication));
    }
}
