import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditService } from './audit.service';
import { ApiAuditEntry, PaginatedResponse } from '../models/api.model';
import { AuditLog } from '../models/audit-log.model';

function apiEntry(overrides: Partial<ApiAuditEntry> = {}): ApiAuditEntry {
    return {
        id: 'a1',
        occurredAt: '2026-06-04T08:00:00Z',
        action: 'member.ban',
        severity: 'warn',
        actorType: 'member',
        actorMemberId: 'm1',
        actorLabel: 'Jameson Nolt',
        targetType: 'member',
        targetId: 'm2',
        targetMemberId: 'm2',
        targetLabel: 'Bjorn Trager',
        detail: 'Banned for cause',
        before: { status: 'Active' },
        after: { status: 'Banned' },
        requestId: null,
        discordSyncStatus: null,
        ...overrides,
    };
}

function page(data: ApiAuditEntry[]): PaginatedResponse<ApiAuditEntry> {
    return {
        data,
        meta: {
            page: 1,
            limit: 100,
            total: data.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
        },
    };
}

describe('AuditService', () => {
    let service: AuditService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(AuditService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getAll() maps occurredAt/actorLabel and stringifies before/after', () => {
        let result: AuditLog[] | undefined;
        service.getAll().subscribe((logs) => (result = logs));
        const req = httpMock.expectOne(
            (r) => r.url === '/api/audit' && r.params.get('limit') === '100',
        );
        expect(req.request.method).toBe('GET');
        req.flush(page([apiEntry()]));

        const log = result?.[0];
        expect(log?.timestamp).toBe('2026-06-04T08:00:00Z');
        expect(log?.actor).toBe('Jameson Nolt');
        expect(log?.targetUser).toBe('Bjorn Trager');
        expect(log?.beforeState).toBe(JSON.stringify({ status: 'Active' }));
        expect(log?.afterState).toBe(JSON.stringify({ status: 'Banned' }));
    });

    it('getAll() maps discordSyncStatus through (populated + null)', () => {
        let result: AuditLog[] | undefined;
        service.getAll().subscribe((logs) => (result = logs));
        const req = httpMock.expectOne((r) => r.url === '/api/audit');
        req.flush(
            page([
                apiEntry({ discordSyncStatus: 'failed' }),
                apiEntry({ id: 'a2', discordSyncStatus: null }),
            ]),
        );

        expect(result?.[0].discordSyncStatus).toBe('failed');
        expect(result?.[1].discordSyncStatus).toBeNull();
    });

    it('getAll(filters) forwards the severity + action params', () => {
        service.getAll({ severity: 'err', action: 'member.ban' }).subscribe();
        const req = httpMock.expectOne(
            (r) =>
                r.url === '/api/audit' &&
                r.params.get('severity') === 'err' &&
                r.params.get('action') === 'member.ban',
        );
        expect(req.request.method).toBe('GET');
        req.flush(page([]));
    });

    it('exportCsv() requests a blob from the export endpoint', () => {
        let blob: Blob | undefined;
        service.exportCsv({ action: 'member.ban' }).subscribe((b) => (blob = b));
        const req = httpMock.expectOne(
            (r) => r.url === '/api/audit/export' && r.params.get('action') === 'member.ban',
        );
        expect(req.request.method).toBe('GET');
        expect(req.request.responseType).toBe('blob');
        req.flush(new Blob(['id,action'], { type: 'text/csv' }));
        expect(blob instanceof Blob).toBe(true);
    });
});
