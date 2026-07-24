import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MedalsService } from './medals.service';
import { ApiMedal } from '../models/api.model';
import { Medal } from '../models/member.model';

function apiMedal(overrides: Partial<ApiMedal> = {}): ApiMedal {
    return {
        id: 'm1',
        title: 'Marksman, First Class',
        glyph: 'M',
        imageUrl: null,
        description: 'Exceptional accuracy.',
        precedence: 2,
        discordRoleName: '@Marksman',
        discordRoleId: 'd1',
        linked: true,
        holdersCount: 7,
        awardsCount: 9,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

describe('MedalsService', () => {
    let service: MedalsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
        });
        service = TestBed.inject(MedalsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getAll() GETs /medals and maps id + discordRoleId + precedence', () => {
        let result: Medal[] | undefined;
        service.getAll().subscribe((medals) => (result = medals));
        const req = httpMock.expectOne('/api/medals');
        expect(req.request.method).toBe('GET');
        req.flush([apiMedal()]);

        const medal = result?.[0];
        expect(medal?.id).toBe('m1');
        expect(medal?.discordRoleId).toBe('d1');
        expect(medal?.precedence).toBe(2);
        expect(medal?.letter).toBe('M');
        expect(medal?.awards).toBe(9);
    });

    it('create() POSTs the payload to /medals', () => {
        service
            .create({ title: 'Campaign Medal', glyph: 'C', imageKey: 'medals/reg/img.svg' })
            .subscribe();
        const req = httpMock.expectOne('/api/medals');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            title: 'Campaign Medal',
            glyph: 'C',
            imageKey: 'medals/reg/img.svg',
        });
        req.flush(apiMedal());
    });

    it('update() PATCHes /medals/:id', () => {
        service.update('m1', { title: 'Regimental Cross' }).subscribe();
        const req = httpMock.expectOne('/api/medals/m1');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ title: 'Regimental Cross' });
        req.flush(apiMedal({ title: 'Regimental Cross' }));
    });

    it('delete() DELETEs /medals/:id', () => {
        service.delete('m1').subscribe();
        const req = httpMock.expectOne('/api/medals/m1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    it('reorder() POSTs the id order to /medals/reorder', () => {
        service.reorder(['m2', 'm1']).subscribe();
        const req = httpMock.expectOne('/api/medals/reorder');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ order: ['m2', 'm1'] });
        req.flush([apiMedal({ id: 'm2' }), apiMedal({ id: 'm1' })]);
    });

    it('linkDiscord() POSTs the role id + name to /medals/:id/link-discord', () => {
        service.linkDiscord('m1', 'd9', '@Sharpshooter').subscribe();
        const req = httpMock.expectOne('/api/medals/m1/link-discord');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ discordRoleId: 'd9', discordRoleName: '@Sharpshooter' });
        req.flush(apiMedal());
    });

    it('unlinkDiscord() POSTs to /medals/:id/unlink-discord', () => {
        service.unlinkDiscord('m1').subscribe();
        const req = httpMock.expectOne('/api/medals/m1/unlink-discord');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({});
        req.flush(apiMedal({ linked: false, discordRoleId: null }));
    });
});
