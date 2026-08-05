import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegimentProfile, RegimentStats } from '../models/api.model';

/** Public regiment profile + landing stats (GET /regiment, GET /regiment/stats). */
@Injectable({ providedIn: 'root' })
export class RegimentService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/regiment`;

    /**
     * One in-flight request, shared (T-0293).
     *
     * The regiment's NAME is now part of the meta description on the roster, the
     * calendar and the gallery as well as the landing page and every profile —
     * because the crawler shell builds those strings from the editable name, and
     * a page that hardcoded "Lords Regiment" would silently disagree with the
     * shell the moment anyone renamed the regiment. Without this cache that
     * would be a fresh GET on every public navigation.
     *
     * `refCount: false`, so the value survives the last subscriber unsubscribing
     * and a second page gets it synchronously. It is deliberately held for the
     * lifetime of the tab: this is a public, slow-moving projection, and an
     * officer who renames the regiment is doing it through `/settings`, which
     * reads a different endpoint and does not go stale behind them.
     */
    private readonly profile$ = this.http
        .get<RegimentProfile>(this.base)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    getProfile(): Observable<RegimentProfile> {
        return this.profile$;
    }

    getStats(): Observable<RegimentStats> {
        return this.http.get<RegimentStats>(`${this.base}/stats`);
    }
}
