import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StorageService, PresignedUpload } from './storage.service';

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
            providers: [provideHttpClient(), provideHttpClientTesting()],
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
});
