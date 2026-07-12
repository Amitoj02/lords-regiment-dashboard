import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiGalleryItem, PaginatedResponse, mapGalleryItem } from '../models/api.model';
import { GalleryItem, GalleryItemType } from '../models/gallery.model';

/** One file in a multi-file submission (POST /gallery). `sizeBytes` is a numeric string. */
export interface GalleryFileInput {
    fileName: string;
    url?: string;
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
    eventId?: string;
    files?: GalleryFileInput[];
    taggedMemberIds?: string[];
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

    /** Public feed (approved only). Optional type / event filters. */
    getAll(type?: GalleryItemType, eventId?: string): Observable<GalleryItem[]> {
        let params = new HttpParams().set('limit', '100');
        if (type) params = params.set('type', type);
        if (eventId) params = params.set('eventId', eventId);
        return this.http
            .get<PaginatedResponse<ApiGalleryItem>>(this.base, { params })
            .pipe(map((res) => res.data.map(mapGalleryItem)));
    }

    getById(id: string): Observable<GalleryItem> {
        return this.http.get<ApiGalleryItem>(`${this.base}/${id}`).pipe(map(mapGalleryItem));
    }

    /** The pending moderation queue (ModerateGallery). */
    moderationQueue(): Observable<GalleryItem[]> {
        return this.http
            .get<PaginatedResponse<ApiGalleryItem>>(`${this.base}/moderation/queue?limit=100`)
            .pipe(map((res) => res.data.map(mapGalleryItem)));
    }

    /** Submit a new item (SubmitToGallery) — lands in the moderation queue. */
    submit(payload: GallerySubmitPayload): Observable<GalleryItem> {
        return this.http.post<ApiGalleryItem>(this.base, payload).pipe(map(mapGalleryItem));
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
