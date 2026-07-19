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

/** One RSVP-roster row (GET /events/:id/rsvps). Mirrors RsvpRosterEntryDto. */
export interface EventRsvpRosterEntry {
    memberId: string;
    name: string | null;
    avatarUrl: string | null;
    status: RsvpStatus;
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
     * The authenticated member calendar (GET /events/mine): the member projection
     * (server binding + the caller's own myRsvp) for enrolled members, redacted
     * for non-enrolled callers. Used by the in-shell events surfaces.
     */
    getAllMine(status?: EventStatus, includeArchived = false): Observable<RegimentEvent[]> {
        const params = ['limit=100'];
        if (status) params.push(`status=${status}`);
        // Moderators can request archived events too (T-0137); the backend gates it
        // on ManageEvents and silently ignores the flag for other callers.
        if (includeArchived) params.push('archived=true');
        return this.http
            .get<PaginatedResponse<ApiEvent>>(`${this.base}/mine?${params.join('&')}`)
            .pipe(map((res) => res.data.map(mapEvent)));
    }

    /** A single event in the member projection (GET /events/mine/:id). */
    getMineById(id: string): Observable<RegimentEvent> {
        return this.http.get<ApiEvent>(`${this.base}/mine/${id}`).pipe(map(mapEvent));
    }

    /**
     * Create and publish an event (ManageEvents). There is no draft state — the
     * backend publishes directly (T-0072). Frontend fields translate to the DTO.
     */
    create(event: Omit<RegimentEvent, 'id'>): Observable<RegimentEvent> {
        return this.http.post<ApiEvent>(this.base, this.toBody(event)).pipe(map(mapEvent));
    }

    update(id: string, changes: Partial<RegimentEvent>): Observable<RegimentEvent> {
        return this.http
            .patch<ApiEvent>(`${this.base}/${id}`, this.toBody(changes))
            .pipe(map(mapEvent));
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    /**
     * Delete a whole recurring series (the template + every occurrence) — T-0099.
     * Accepts the template id OR any occurrence id (the backend resolves it).
     */
    deleteSeries(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}/series`);
    }

    // ── Lifecycle transitions (each returns the updated event) ───────────────
    archive(id: string): Observable<RegimentEvent> {
        return this.http.post<ApiEvent>(`${this.base}/${id}/archive`, {}).pipe(map(mapEvent));
    }

    /** Unarchive an event — restores it to the calendar (T-0136). */
    unarchive(id: string): Observable<RegimentEvent> {
        return this.http.post<ApiEvent>(`${this.base}/${id}/unarchive`, {}).pipe(map(mapEvent));
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

    /** The event's RSVP roster (who RSVP'd + their choice). Gated on ViewMembersDirectory. */
    getRsvps(id: string): Observable<EventRsvpRosterEntry[]> {
        return this.http.get<EventRsvpRosterEntry[]>(`${this.base}/${id}/rsvps`);
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
        // A freshly-uploaded banner is submitted as a storage key (T-0093); the
        // backend re-validates its namespace and stores the resolved public URL.
        if (e.bannerKey !== undefined) body['bannerKey'] = e.bannerKey;
        if (e.date && e.startTime) body['startsAt'] = `${e.date}T${e.startTime}:00`;
        // End may fall on a different date than start (T-0089); default to `date`.
        if (e.endTime) body['endsAt'] = `${e.endDate || e.date}T${e.endTime}:00`;
        if (e.timezone !== undefined) body['timezone'] = e.timezone;
        if (e.serverName !== undefined) body['serverName'] = e.serverName;
        if (e.serverRegion !== undefined) body['serverRegion'] = e.serverRegion;
        if (e.serverPassword !== undefined) body['serverPassword'] = e.serverPassword;
        if (e.platforms !== undefined) body['platforms'] = e.platforms;
        if (e.tags !== undefined) body['tags'] = e.tags;
        // A structured cadence makes the event an active recurring template (T-0090).
        if (e.recurrenceCadence !== undefined) body['recurrenceCadence'] = e.recurrenceCadence;
        if (e.recurrenceActive !== undefined) body['recurrenceActive'] = e.recurrenceActive;
        if (e.notifyBefore !== undefined) {
            body['notifyOffsets'] = e.notifyBefore.map(parseNotifyOffset);
        }
        return body;
    }
}
