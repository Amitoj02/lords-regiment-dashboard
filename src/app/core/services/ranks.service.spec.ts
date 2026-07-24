import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RanksService } from './ranks.service';
import { ApiRank } from '../models/api.model';
import { Rank } from '../models/member.model';

function apiRank(overrides: Partial<ApiRank> = {}): ApiRank {
    return {
        id: 'r1',
        name: 'Sergeant',
        imageUrl: null,
        precedence: 5,
        discordRoleName: '@Sergeant',
        discordRoleId: 'd1',
        linked: true,
        holdersCount: 8,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

describe('RanksService', () => {
    let service: RanksService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
        });
        service = TestBed.inject(RanksService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getAll() GETs /ranks and maps id + discordRoleId + precedence', () => {
        let result: Rank[] | undefined;
        service.getAll().subscribe((ranks) => (result = ranks));
        const req = httpMock.expectOne('/api/ranks');
        expect(req.request.method).toBe('GET');
        req.flush([apiRank()]);

        const rank = result?.[0];
        expect(rank?.id).toBe('r1');
        expect(rank?.discordRoleId).toBe('d1');
        expect(rank?.order).toBe(5);
        expect(rank?.holders).toBe(8);
        expect(rank?.discordRole).toBe('@Sergeant');
    });

    it('create() POSTs the payload to /ranks', () => {
        service
            .create({ name: 'Major', imageKey: 'ranks/reg/icon.png', precedence: 3 })
            .subscribe();
        const req = httpMock.expectOne('/api/ranks');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            name: 'Major',
            imageKey: 'ranks/reg/icon.png',
            precedence: 3,
        });
        req.flush(apiRank());
    });

    it('update() PATCHes /ranks/:id', () => {
        service.update('r1', { name: 'Colonel' }).subscribe();
        const req = httpMock.expectOne('/api/ranks/r1');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ name: 'Colonel' });
        req.flush(apiRank({ name: 'Colonel' }));
    });

    it('delete() DELETEs /ranks/:id', () => {
        service.delete('r1').subscribe();
        const req = httpMock.expectOne('/api/ranks/r1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    it('reorder() POSTs the id order to /ranks/reorder', () => {
        service.reorder(['r2', 'r1']).subscribe();
        const req = httpMock.expectOne('/api/ranks/reorder');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ order: ['r2', 'r1'] });
        req.flush([apiRank({ id: 'r2' }), apiRank({ id: 'r1' })]);
    });

    it('linkDiscord() POSTs the role id + name to /ranks/:id/link-discord', () => {
        service.linkDiscord('r1', 'd9', '@Captain').subscribe();
        const req = httpMock.expectOne('/api/ranks/r1/link-discord');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ discordRoleId: 'd9', discordRoleName: '@Captain' });
        req.flush(apiRank());
    });

    it('unlinkDiscord() POSTs to /ranks/:id/unlink-discord', () => {
        service.unlinkDiscord('r1').subscribe();
        const req = httpMock.expectOne('/api/ranks/r1/unlink-discord');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({});
        req.flush(apiRank({ linked: false, discordRoleId: null }));
    });

    // ── Bulk re-link handle (lords-dashboard-backend:T-0158) ─────────────────
    it('linkDiscord() returns the mapped rank AND the batch handle', () => {
        let result: { entity: { name: string }; relinkBatchId: string | null } | undefined;
        service.linkDiscord('r1', 'd9', '@Captain').subscribe((r) => (result = r));
        httpMock
            .expectOne('/api/ranks/r1/link-discord')
            .flush(apiRank({ relinkBatchId: 'batch-1' }));

        // Both halves matter: the caller refreshes from the entity and polls with
        // the handle, off ONE request instead of re-fetching to find out what
        // just happened.
        expect(result?.entity.name).toBeTruthy();
        expect(result?.relinkBatchId).toBe('batch-1');
    });

    it('reports a null handle when the change queued no run', () => {
        // `relinkBatchId` is OMITTED, not nulled, when nothing was enqueued (no
        // old role to strip, or no holders with a linked Discord identity).
        let batchId: string | null | undefined = 'unset';
        service.linkDiscord('r1', 'd9').subscribe((r) => (batchId = r.relinkBatchId));
        httpMock.expectOne('/api/ranks/r1/link-discord').flush(apiRank());
        expect(batchId).toBeNull();
    });

    it('unlinkDiscord() queues too — an unlink strips the role from every holder', () => {
        let batchId: string | null | undefined;
        service.unlinkDiscord('r1').subscribe((r) => (batchId = r.relinkBatchId));
        httpMock
            .expectOne('/api/ranks/r1/unlink-discord')
            .flush(apiRank({ linked: false, discordRoleId: null, relinkBatchId: 'batch-2' }));
        expect(batchId).toBe('batch-2');
    });
});
