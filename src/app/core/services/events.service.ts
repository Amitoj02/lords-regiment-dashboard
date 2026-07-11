import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEvent, PaginatedResponse, mapEvent, parseNotifyOffset } from '../models/api.model';
import { EventStatus, RegimentEvent, RsvpStatus } from '../models/event.model';

/** A confirmed attendee row (GET/POST /events/:id/attendees). Mirrors AttendeeDto. */
export interface EventAttendee {
    memberId: string;
    name: string | null;
    checkedInAt: string | null;
}

/** Response of POST /events/:id/reveal-password (SENSITIVE — decrypted password). */
export interface RevealedPassword {
    serverName: string | null;
    serverRegion: string | null;
    serverPassword: string | null;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/events`;

    /** The event list (first page — the backend caps `limit` at 100). Public projection. */
    getAll(status?: EventStatus): Observable<RegimentEvent[]> {
        const q = status ? `?status=${status}&limit=100` : '?limit=100';
        return this.http
            .get<PaginatedResponse<ApiEvent>>(`${this.base}${q}`)
            .pipe(map((res) => res.data.map(mapEvent)));
    }

    getById(id: string): Observable<RegimentEvent> {
        return this.http.get<ApiEvent>(`${this.base}/${id}`).pipe(map(mapEvent));
    }

    /**
     * Create an event (ManageEvents). Frontend fields are translated to the
     * backend DTO. `isDraft` must be passed explicitly — the backend defaults it
     * to false (published), so "Save draft" MUST send isDraft:true to keep the
     * event off the public calendar.
     */
    create(event: Omit<RegimentEvent, 'id'>, isDraft = false): Observable<RegimentEvent> {
        const body = this.toBody(event);
        body['isDraft'] = isDraft;
        return this.http.post<ApiEvent>(this.base, body).pipe(map(mapEvent));
    }

    update(id: string, changes: Partial<RegimentEvent>): Observable<RegimentEvent> {
        return this.http
            .patch<ApiEvent>(`${this.base}/${id}`, this.toBody(changes))
            .pipe(map(mapEvent));
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    // ── Lifecycle transitions (each returns the updated event) ───────────────
    publish(id: string): Observable<RegimentEvent> {
        return this.http.post<ApiEvent>(`${this.base}/${id}/publish`, {}).pipe(map(mapEvent));
    }

    archive(id: string): Observable<RegimentEvent> {
        return this.http.post<ApiEvent>(`${this.base}/${id}/archive`, {}).pipe(map(mapEvent));
    }

    complete(id: string, outcome?: string, inLineCount?: number): Observable<RegimentEvent> {
        return this.http
            .post<ApiEvent>(`${this.base}/${id}/complete`, { outcome, inLineCount })
            .pipe(map(mapEvent));
    }

    // ── RSVP (member view; the returned event carries myRsvp) ────────────────
    rsvp(
        id: string,
        status: RsvpStatus,
        reminderOffsetMinutes?: number,
    ): Observable<RegimentEvent> {
        return this.http
            .post<ApiEvent>(`${this.base}/${id}/rsvp`, { status, reminderOffsetMinutes })
            .pipe(map(mapEvent));
    }

    removeRsvp(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}/rsvp`);
    }

    // ── Attendees ────────────────────────────────────────────────────────────
    getAttendees(id: string): Observable<EventAttendee[]> {
        return this.http.get<EventAttendee[]>(`${this.base}/${id}/attendees`);
    }

    setAttendees(id: string, memberIds: string[]): Observable<EventAttendee[]> {
        return this.http.post<EventAttendee[]>(`${this.base}/${id}/attendees`, { memberIds });
    }

    /** Reveal the decrypted server password (RevealEventPasswords; must have RSVP'd). */
    revealPassword(id: string): Observable<RevealedPassword> {
        return this.http.post<RevealedPassword>(`${this.base}/${id}/reveal-password`, {});
    }

    /** Map the frontend view model onto the backend create/update DTO fields. */
    private toBody(e: Partial<RegimentEvent>): Record<string, unknown> {
        const body: Record<string, unknown> = {};
        if (e.title !== undefined) body['title'] = e.title;
        if (e.description !== undefined) body['description'] = e.description;
        if (e.bannerUrl !== undefined) body['bannerUrl'] = e.bannerUrl;
        if (e.date && e.startTime) body['startsAt'] = `${e.date}T${e.startTime}:00`;
        if (e.date && e.endTime) body['endsAt'] = `${e.date}T${e.endTime}:00`;
        if (e.timezone !== undefined) body['timezone'] = e.timezone;
        if (e.serverName !== undefined) body['serverName'] = e.serverName;
        if (e.serverPassword !== undefined) body['serverPassword'] = e.serverPassword;
        if (e.platforms !== undefined) body['platforms'] = e.platforms;
        if (e.tags !== undefined) body['tags'] = e.tags;
        if (e.recurring !== undefined) {
            body['isRecurring'] = !!e.recurring;
            body['recurrenceRule'] = e.recurring;
        }
        if (e.notifyBefore !== undefined) {
            body['notifyOffsets'] = e.notifyBefore.map(parseNotifyOffset);
        }
        return body;
    }
}
