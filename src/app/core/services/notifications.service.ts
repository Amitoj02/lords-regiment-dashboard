import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiNotification, PaginatedResponse, mapNotification } from '../models/api.model';
import { Notification, NotificationTone } from '../models/notification.model';

/** Body for POST /notifications (ManageNotifications). */
export interface ComposeNotificationPayload {
    title: string;
    body: string;
    tone?: NotificationTone;
    authorLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/notifications`;

    /** The caller's "Field Dispatch" feed (first page; the backend caps `limit` at 100). */
    getAll(): Observable<Notification[]> {
        return this.http
            .get<PaginatedResponse<ApiNotification>>(`${this.base}?limit=100`)
            .pipe(map((res) => res.data.map(mapNotification)));
    }

    unreadCount(): Observable<number> {
        return this.http
            .get<{ count: number }>(`${this.base}/unread-count`)
            .pipe(map((res) => res.count));
    }

    /** Publish an announcement (ManageNotifications). */
    compose(payload: ComposeNotificationPayload): Observable<Notification> {
        return this.http.post<ApiNotification>(this.base, payload).pipe(map(mapNotification));
    }

    /** Mark one dispatch read; resolves to the resulting read state. */
    markRead(id: string): Observable<boolean> {
        return this.http
            .post<{ read: boolean }>(`${this.base}/${id}/read`, {})
            .pipe(map((res) => res.read));
    }

    /** Mark every dispatch read; resolves to the number newly marked. */
    markAllRead(): Observable<number> {
        return this.http
            .post<{ read: number }>(`${this.base}/read-all`, {})
            .pipe(map((res) => res.read));
    }
}
