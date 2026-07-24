import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
    DEFAULT_STORAGE_POLICY,
    StorageService,
    PresignedUpload,
    StoragePolicy,
} from './storage.service';

function ticket(overrides: Partial<PresignedUpload> = {}): PresignedUpload {
    return {
        key: 'events/reg/uuid.png',
        uploadUrl: 'http://localhost:9100/lords-media/events/reg/uuid.png?X-Amz-Signature=abc',
        publicUrl: 'http://localhost:9100/lords-media/events/reg/uuid.png',
        expiresIn: 900,
        requiredContentType: 'image/png',
        ...overrides,
    };
}

describe('StorageService', () => {
    let service: StorageService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
        });
        service = TestBed.inject(StorageService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('requestUpload() posts the target + file metadata', () => {
        const file = new File([new Uint8Array(10)], 'shot.png', { type: 'image/png' });
        service.requestUpload('event-banner', file).subscribe();

        const req = httpMock.expectOne('/api/storage/uploads');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            target: 'event-banner',
            contentType: 'image/png',
            sizeBytes: 10,
            fileName: 'shot.png',
        });
        req.flush(ticket());
    });

    it('upload() presigns then PUTs the bytes and resolves to the key', () => {
        const file = new File([new Uint8Array(10)], 'shot.png', { type: 'image/png' });
        let resolvedKey: string | undefined;
        service.upload('event-banner', file).subscribe((key) => (resolvedKey = key));

        const presign = httpMock.expectOne('/api/storage/uploads');
        presign.flush(ticket());

        const put = httpMock.expectOne(ticket().uploadUrl);
        expect(put.request.method).toBe('PUT');
        expect(put.request.headers.get('Content-Type')).toBe('image/png');
        put.flush(null);

        expect(resolvedKey).toBe('events/reg/uuid.png');
    });

    // ── Upload policy (T-0187) ───────────────────────────────────────────────
    describe('getPolicy()', () => {
        function policyBody(overrides: Partial<StoragePolicy> = {}): StoragePolicy {
            return { ...DEFAULT_STORAGE_POLICY, maxUploadMb: 50, ...overrides };
        }

        it('GETs /api/storage/policy and returns the body', () => {
            let result: StoragePolicy | undefined;
            service.getPolicy().subscribe((p) => (result = p));

            const req = httpMock.expectOne('/api/storage/policy');
            expect(req.request.method).toBe('GET');
            req.flush(policyBody());

            expect(result?.maxUploadMb).toBe(50);
        });

        it('caches the policy — a second subscription does not re-request (shareReplay)', () => {
            service.getPolicy().subscribe();
            httpMock.expectOne('/api/storage/policy').flush(policyBody());

            let cached: StoragePolicy | undefined;
            service.getPolicy().subscribe((p) => (cached = p));
            httpMock.expectNone('/api/storage/policy');
            expect(cached?.maxUploadMb).toBe(50);
        });

        it('falls back to the default policy when the fetch fails', () => {
            let result: StoragePolicy | undefined;
            service.getPolicy().subscribe((p) => (result = p));

            httpMock
                .expectOne('/api/storage/policy')
                .flush('boom', { status: 500, statusText: 'Server Error' });

            expect(result).toBe(DEFAULT_STORAGE_POLICY);
        });
    });

    describe('hint formatting', () => {
        it('formatExtensions joins with commas and a trailing "or"', () => {
            expect(StorageService.formatExtensions(['png', 'jpg', 'webp'])).toBe(
                'PNG, JPG or WebP',
            );
            expect(StorageService.formatExtensions(['png'])).toBe('PNG');
        });

        it('uploadHint renders accepted types + the target size cap', () => {
            expect(StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'member-avatar')).toBe(
                'PNG, JPG or WebP · max 8 MB',
            );
            expect(StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'member-banner')).toBe(
                'PNG, JPG or WebP · max 12 MB',
            );
        });
    });
});
