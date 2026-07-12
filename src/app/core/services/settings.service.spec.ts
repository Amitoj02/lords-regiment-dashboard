import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PermissionsMatrix, SettingsService } from './settings.service';

describe('SettingsService', () => {
    let service: SettingsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(SettingsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getSettings() reads the control-panel projection', () => {
        service.getSettings().subscribe();
        const req = httpMock.expectOne('/api/settings');
        expect(req.request.method).toBe('GET');
        req.flush({ name: 'The Lords Regiment' });
    });

    it('updateSettings() PATCHes the changed fields', () => {
        service.updateSettings({ publicRoster: false, name: 'LR' }).subscribe();
        const req = httpMock.expectOne('/api/settings');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ publicRoster: false, name: 'LR' });
        req.flush({ name: 'LR' });
    });

    it('getPermissions() reads the authorization matrix', () => {
        let matrix: PermissionsMatrix | undefined;
        service.getPermissions().subscribe((m) => (matrix = m));
        const req = httpMock.expectOne('/api/settings/permissions');
        expect(req.request.method).toBe('GET');
        req.flush({
            roles: ['Owner', 'Admin'],
            capabilities: ['manage_settings'],
            matrix: { Owner: { manage_settings: true }, Admin: { manage_settings: false } },
        });
        expect(matrix?.roles).toEqual(['Owner', 'Admin']);
    });

    it('updatePermissions() wraps the changes array', () => {
        service
            .updatePermissions([{ role: 'Admin', capability: 'manage_events', granted: true }])
            .subscribe();
        const req = httpMock.expectOne('/api/settings/permissions');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({
            changes: [{ role: 'Admin', capability: 'manage_events', granted: true }],
        });
        req.flush({ roles: [], capabilities: [], matrix: {} });
    });
});
