import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiAuditEntry, PaginatedResponse, mapAuditLog } from '../models/api.model';
import { AuditLog } from '../models/audit-log.model';

/** Filters accepted by GET /audit and GET /audit/export (all optional). */
export interface AuditFilters {
    severity?: AuditLog['severity'];
    action?: string;
    actorMemberId?: string;
    from?: string;
    to?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/audit`;

    /** The audit ledger (ViewAuditLog). First page; the backend caps `limit` at 100. */
    getAll(filters: AuditFilters = {}): Observable<AuditLog[]> {
        return this.http
            .get<PaginatedResponse<ApiAuditEntry>>(this.base, {
                params: this.toParams(filters).set('limit', '100'),
            })
            .pipe(map((res) => res.data.map(mapAuditLog)));
    }

    getById(id: string): Observable<AuditLog> {
        return this.http.get<ApiAuditEntry>(`${this.base}/${id}`).pipe(map(mapAuditLog));
    }

    getBySeverity(severity: AuditLog['severity']): Observable<AuditLog[]> {
        return this.getAll({ severity });
    }

    /**
     * Export the filtered ledger as a CSV (text/csv). Returns the raw Blob; the
     * caller triggers the download (e.g. via a temporary object-URL anchor).
     */
    exportCsv(filters: AuditFilters = {}): Observable<Blob> {
        return this.http.get(`${this.base}/export`, {
            params: this.toParams(filters),
            responseType: 'blob',
        });
    }

    private toParams(filters: AuditFilters): HttpParams {
        let params = new HttpParams();
        if (filters.severity) params = params.set('severity', filters.severity);
        if (filters.action) params = params.set('action', filters.action);
        if (filters.actorMemberId) params = params.set('actorMemberId', filters.actorMemberId);
        if (filters.from) params = params.set('from', filters.from);
        if (filters.to) params = params.set('to', filters.to);
        return params;
    }
}
