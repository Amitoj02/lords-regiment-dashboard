import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    ApiGalleryItem,
    ApiGallerySubmissionSummary,
    PaginatedResponse,
    mapGalleryItem,
} from '../models/api.model';
import { GalleryItem, GalleryItemStatus, GalleryItemType } from '../models/gallery.model';

/** One file in a multi-file submission (POST /gallery). `sizeBytes` is a numeric string. */
export interface GalleryFileInput {
    fileName: string;
    /** Storage key from StorageService.upload('gallery', …); the API resolves it to a URL. */
    key?: string;
    mediaType: 'image' | 'video';
    sizeBytes?: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
    caption?: string;
    thumbnailColor?: string;
}

/** Body for POST /gallery (SubmitToGallery). Author + regiment come from the JWT. */
export interface GallerySubmitPayload {
    title: string;
    caption?: string;
    type: GalleryItemType;
    linkUrl?: string;
    /**
     * Storage key of a client-captured video poster frame
     * (lords-dashboard-backend:T-0152). This REPLACED a raw `thumbnailUrl`: the
     * API used to persist that verbatim with no namespace check, so any caller
     * could point an item's thumbnail at an arbitrary URL. A key is validated
     * against the `gallery-poster` namespace server-side before it is stored.
     */
    posterKey?: string;
    files?: GalleryFileInput[];
    tags?: string[];
}

/**
 * Body for PATCH /gallery/:id (moderator edit — T-0115 backend counterpart).
 * The title (1..160), caption, and tags are editable; the media itself
 * (files/type/link) is immutable once submitted. Mirrors the backend
 * UpdateGalleryItemDto.
 */
export interface UpdateGalleryPayload {
    title?: string;
    caption?: string;
    tags?: string[];
}

/** Lean pending-submission summary for the dashboard panel (T-0094/T-0127). */
export interface GallerySubmissionSummary {
    id: string;
    title: string;
    submitterUsername: string | null;
}

/** Response of the like/unlike endpoints and of the like-state read. */
export interface GalleryLikeState {
    likesCount: number;
    liked: boolean;
}

/** Response of POST /gallery/:id/view — the fresh total, and nothing else. */
export interface GalleryViewState {
    viewsCount: number;
}

@Injectable({ providedIn: 'root' })
export class GalleryService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/gallery`;

    /** Public feed (approved only). Optional type filter. */
    getAll(type?: GalleryItemType): Observable<GalleryItem[]> {
        let params = new HttpParams().set('limit', '100');
        if (type) params = params.set('type', type);
        return this.http
            .get<PaginatedResponse<ApiGalleryItem>>(this.base, { params })
            .pipe(map((res) => res.data.map(mapGalleryItem)));
    }

    getById(id: string): Observable<GalleryItem> {
        return this.http.get<ApiGalleryItem>(`${this.base}/${id}`).pipe(map(mapGalleryItem));
    }

    /**
     * Authenticated member archive (ViewGallery): approved items for the caller's
     * regiment, ignoring the publicGallery flag (T-0086). Used by /app/gallery.
     */
    getArchive(type?: GalleryItemType): Observable<GalleryItem[]> {
        let params = new HttpParams().set('limit', '100');
        if (type) params = params.set('type', type);
        return this.http
            .get<PaginatedResponse<ApiGalleryItem>>(`${this.base}/archive`, { params })
            .pipe(map((res) => res.data.map(mapGalleryItem)));
    }

    /**
     * The moderation queue (ModerateGallery), filtered by status so the FE can
     * populate each tab — pending (default), approved, or declined (T-0115).
     */
    moderationQueue(status: GalleryItemStatus = 'pending'): Observable<GalleryItem[]> {
        const params = new HttpParams().set('limit', '100').set('status', status);
        return this.http
            .get<PaginatedResponse<ApiGalleryItem>>(`${this.base}/moderation/queue`, { params })
            .pipe(map((res) => res.data.map(mapGalleryItem)));
    }

    /**
     * Lean pending-submissions summary for the dashboard "Gallery submissions"
     * panel (ManageEvents holders) — T-0094/T-0127.
     */
    pendingSummary(): Observable<GallerySubmissionSummary[]> {
        return this.http.get<ApiGallerySubmissionSummary[]>(`${this.base}/pending-summary`);
    }

    /** Submit a new item (SubmitToGallery) — lands in the moderation queue. */
    submit(payload: GallerySubmitPayload): Observable<GalleryItem> {
        return this.http.post<ApiGalleryItem>(this.base, payload).pipe(map(mapGalleryItem));
    }

    /**
     * Moderator edit of an item's caption + tags (ModerateGallery — T-0115). The
     * media itself is not editable through this endpoint.
     */
    update(id: string, payload: UpdateGalleryPayload): Observable<GalleryItem> {
        return this.http
            .patch<ApiGalleryItem>(`${this.base}/${id}`, payload)
            .pipe(map(mapGalleryItem));
    }

    approve(id: string): Observable<GalleryItem> {
        return this.http
            .post<ApiGalleryItem>(`${this.base}/${id}/approve`, {})
            .pipe(map(mapGalleryItem));
    }

    decline(id: string, reason?: string): Observable<GalleryItem> {
        return this.http
            .post<ApiGalleryItem>(`${this.base}/${id}/decline`, { reason })
            .pipe(map(mapGalleryItem));
    }

    /**
     * The signed-in caller's OWN like state, without changing it.
     *
     * Needed because `GET /gallery/:id` is public and therefore carries no
     * `liked` — the detail page would otherwise paint a hollow heart for a
     * member who has already liked the dispatch, and their next tap would be a
     * no-op "like" instead of the unlike they meant. Only call this when
     * authenticated; anonymously it is a 401 by design (whether a given person
     * liked something is not a public fact).
     */
    likeState(id: string): Observable<GalleryLikeState> {
        return this.http.get<GalleryLikeState>(`${this.base}/${id}/like`);
    }

    like(id: string): Observable<GalleryLikeState> {
        return this.http.post<GalleryLikeState>(`${this.base}/${id}/like`, {});
    }

    unlike(id: string): Observable<GalleryLikeState> {
        return this.http.delete<GalleryLikeState>(`${this.base}/${id}/like`);
    }

    /**
     * Record that this visitor has seen an item, and get the fresh total.
     *
     * Public — signing in is not required and makes no difference; every
     * reader counts. The server dedupes by a keyed hash of the caller's address,
     * so calling this on every page load is correct: a returning visitor simply
     * does not move the number.
     */
    recordView(id: string): Observable<GalleryViewState> {
        return this.http.post<GalleryViewState>(`${this.base}/${id}/view`, {});
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }
}
