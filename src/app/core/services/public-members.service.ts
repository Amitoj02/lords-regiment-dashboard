import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiGalleryItem, PaginatedResponse, mapGalleryItem } from '../models/api.model';
import { GalleryItem } from '../models/gallery.model';
import { PublicMember } from '../models/public-member.model';

/** One page of the public roster. */
export interface PublicRosterPage {
    members: PublicMember[];
    total: number;
    page: number;
    limit: number;
    hasPrev: boolean;
    hasNext: boolean;
}

/** Filters the public roster accepts. Deliberately fewer than the member one. */
export interface PublicRosterQuery {
    page?: number;
    limit?: number;
    search?: string;
    rankId?: string;
}

/** Page size for the public roster. Matches what the crawler shell paginates by. */
export const PUBLIC_ROSTER_PAGE_SIZE = 25;

/**
 * The anonymous roster/profile API (T-0287).
 *
 * ── WHY THIS IS SEPARATE FROM `MembersService` ──────────────────────────────
 * It talks to a different set of endpoints (`/api/public/members/*`) that carry
 * a different, deliberately smaller projection, and it is the ONLY members
 * service a signed-out visitor may call. Keeping it apart means a public page
 * cannot accidentally reach for `MembersService.getAll()` — which 401s
 * anonymously and, through the JWT interceptor, used to eject the visitor to
 * `/login`.
 *
 * Pages that show more to a signed-in member (last-seen on the roster, the
 * event-history tab on a profile) call BOTH: this one for the body, the
 * authenticated one for the extra. That is the "anonymous shell + enrichment"
 * shape, and it is what keeps the public response identical for every caller
 * and therefore cacheable at the edge.
 */
@Injectable({ providedIn: 'root' })
export class PublicMembersService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/public/members`;

    /** One page of the public roster. */
    getRoster(query: PublicRosterQuery = {}): Observable<PublicRosterPage> {
        let params = new HttpParams()
            .set('page', String(query.page ?? 1))
            .set('limit', String(query.limit ?? PUBLIC_ROSTER_PAGE_SIZE));
        if (query.search) params = params.set('search', query.search);
        if (query.rankId) params = params.set('rankId', query.rankId);

        return this.http.get<PaginatedResponse<PublicMember>>(this.base, { params }).pipe(
            map((res) => ({
                members: res.data,
                total: res.meta.total,
                page: res.meta.page,
                limit: res.meta.limit,
                hasPrev: res.meta.hasPrev,
                hasNext: res.meta.hasNext,
            })),
        );
    }

    /**
     * One public profile.
     *
     * `handle` is the raw route segment — `@panda` or a 12-char short id. It is
     * encoded rather than interpolated: `@` is a legal path character but a
     * handle arrives from the URL bar, and the API is the only thing that gets
     * to decide whether a segment is well-formed.
     */
    getProfile(handle: string): Observable<PublicMember> {
        return this.http.get<PublicMember>(`${this.base}/${encodeURIComponent(handle)}`);
    }

    /** That member's approved gallery contributions. */
    getGallery(handle: string, limit = 12): Observable<GalleryItem[]> {
        return this.http
            .get<PaginatedResponse<ApiGalleryItem>>(
                `${this.base}/${encodeURIComponent(handle)}/gallery`,
                { params: new HttpParams().set('limit', String(limit)) },
            )
            .pipe(map((res) => res.data.map(mapGalleryItem)));
    }
}
