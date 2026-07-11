import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegimentProfile, RegimentStats } from '../models/api.model';

/** Public regiment profile + landing stats (GET /regiment, GET /regiment/stats). */
@Injectable({ providedIn: 'root' })
export class RegimentService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/regiment`;

    getProfile(): Observable<RegimentProfile> {
        return this.http.get<RegimentProfile>(this.base);
    }

    getStats(): Observable<RegimentStats> {
        return this.http.get<RegimentStats>(`${this.base}/stats`);
    }
}
