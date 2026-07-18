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
    thumbnailUrl?: string;
    files?: GalleryFileInput[];
    tags?: string[];
}

/**
 * Body for PATCH /gallery/:id (moderator edit — T-0115 backend counterpart).
 * Only the caption and tags are editable; the media itself (files/type/link) is
 * immutable once submitted. Mirrors the backend UpdateGalleryItemDto.
 */
export interface UpdateGalleryPayload {
    caption?: string;
    tags?: string[];
}

/** Lean pending-submission summary for the dashboard panel (T-0094/T-0127). */
export interface GallerySubmissionSummary {
    id: string;
    title: string;
    submitterUsername: string | null;
}

/** Response of the like/unlike endpoints. */
export interface GalleryLikeState {
    likesCount: number;
    liked: boolean;
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

    like(id: string): Observable<GalleryLikeState> {
        return this.http.post<GalleryLikeState>(`${this.base}/${id}/like`, {});
    }

    unlike(id: string): Observable<GalleryLikeState> {
        return this.http.delete<GalleryLikeState>(`${this.base}/${id}/like`);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }
}
