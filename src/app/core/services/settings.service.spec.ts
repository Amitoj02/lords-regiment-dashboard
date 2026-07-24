import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PermissionsMatrix, SettingsService } from './settings.service';

describe('SettingsService', () => {
    let service: SettingsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
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
        service.updateSettings({ publicEvents: false, name: 'LR' }).subscribe();
        const req = httpMock.expectOne('/api/settings');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ publicEvents: false, name: 'LR' });
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

    /**
     * `POST /discord/bind` is the sole binder of the regiment's guild (T-0264),
     * so PATCH /settings must never carry the id. `UpdateSettingsPayload` omits
     * it at the type level — this pins the runtime half: a caller passing the
     * whole DTO back still cannot smuggle it through.
     */
    it('updateSettings() never carries the Discord guild binding', () => {
        service.updateSettings({ name: 'LR', discordServerName: 'The Lords' }).subscribe();
        const req = httpMock.expectOne('/api/settings');
        expect(Object.keys(req.request.body as object)).not.toContain('discordServerId');
        req.flush({ name: 'LR' });
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

    /**
     * Transfer Ownership has been retired from the capability enum (T-0264). The
     * matrix is rendered straight from whatever the API returns, so the row goes
     * on its own — what must not change is that every REMAINING capability
     * survives a save untouched.
     */
    it('updatePermissions() round-trips every remaining capability unchanged', () => {
        const capabilities = ['manage_settings', 'manage_regiment_details', 'manage_events'];
        let saved: PermissionsMatrix | undefined;
        service
            .updatePermissions([
                { role: 'Moderator', capability: 'manage_regiment_details', granted: true },
            ])
            .subscribe((m) => (saved = m));

        const req = httpMock.expectOne('/api/settings/permissions');
        req.flush({
            roles: ['Owner', 'Admin', 'Moderator'],
            capabilities,
            matrix: {
                Owner: { manage_settings: true, manage_regiment_details: true },
                Admin: { manage_settings: true, manage_regiment_details: true },
                Moderator: { manage_regiment_details: true, manage_events: true },
            },
        });

        expect(saved?.capabilities).toEqual(capabilities);
        expect(saved?.capabilities).not.toContain('transfer_ownership');
        expect(saved?.matrix['Moderator']['manage_events']).toBeTrue();
    });
});
