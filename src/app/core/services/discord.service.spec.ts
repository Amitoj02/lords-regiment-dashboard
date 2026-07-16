import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BotOperation, DiscordService } from './discord.service';
import { PaginatedResponse } from '../models/api.model';

describe('DiscordService', () => {
    let service: DiscordService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(DiscordService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getConnection() reads the connection snapshot', () => {
        service.getConnection().subscribe();
        const req = httpMock.expectOne('/api/discord/connection');
        expect(req.request.method).toBe('GET');
        req.flush({ connected: true, connectionStatus: 'connected' });
    });

    it('verifyConnection() re-probes the gateway and returns roles + channels', () => {
        let roles: { id: string; name: string }[] | undefined;
        service.verifyConnection().subscribe((c) => (roles = c.roles));
        const req = httpMock.expectOne('/api/discord/verify-connection');
        expect(req.request.method).toBe('POST');
        req.flush({
            connected: true,
            connectionStatus: 'connected',
            roles: [{ id: 'r1', name: 'Recruit', position: 1 }],
            channels: [{ id: 'c1', name: 'general' }],
        });
        expect(roles?.[0].name).toBe('Recruit');
    });

    it('updateSettings() PATCHes the sensitive applyBanRoleOnBan flag', () => {
        service.updateSettings({ applyBanRoleOnBan: true, banRoleId: 'r9' }).subscribe();
        const req = httpMock.expectOne('/api/discord/settings');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ applyBanRoleOnBan: true, banRoleId: 'r9' });
        req.flush({ applyBanRoleOnBan: true, joinRoleName: '', botEnabled: true });
    });

    it('resync() unwraps the enqueued count', () => {
        let enqueued: number | undefined;
        service.resync().subscribe((n) => (enqueued = n));
        const req = httpMock.expectOne('/api/discord/resync');
        expect(req.request.method).toBe('POST');
        req.flush({ enqueued: 12 });
        expect(enqueued).toBe(12);
    });

    it('getOperations() returns the paginated data array', () => {
        let ops: BotOperation[] | undefined;
        service.getOperations().subscribe((o) => (ops = o));
        const req = httpMock.expectOne('/api/discord/operations?limit=100');
        expect(req.request.method).toBe('GET');
        const body: PaginatedResponse<BotOperation> = {
            data: [
                {
                    id: 'op1',
                    occurredAt: '2026-06-04T08:00:00Z',
                    operation: 'sync',
                    success: true,
                    resolvable: false,
                },
            ],
            meta: { page: 1, limit: 100, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        };
        req.flush(body);
        expect(ops?.length).toBe(1);
        expect(ops?.[0].operation).toBe('sync');
    });

    it('resolveOperation() posts to the resolve endpoint', () => {
        service.resolveOperation('op1').subscribe();
        const req = httpMock.expectOne('/api/discord/operations/op1/resolve');
        expect(req.request.method).toBe('POST');
        req.flush({
            id: 'op1',
            occurredAt: '',
            operation: 'sync',
            success: true,
            resolvable: false,
        });
    });
});
