import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GalleryService } from './gallery.service';
import { ApiGalleryItem, PaginatedResponse } from '../models/api.model';
import { GalleryItem } from '../models/gallery.model';

function apiItem(overrides: Partial<ApiGalleryItem> = {}): ApiGalleryItem {
    return {
        id: 'g1',
        title: 'Siege Defense',
        caption: 'Northern wall',
        type: 'image',
        linkUrl: null,
        thumbnailUrl: 'https://cdn/thumb.png',
        status: 'pending',
        declineReason: null,
        author: { memberId: 'm1', name: 'Mara Erskine' },
        files: [
            {
                id: 'f1',
                fileName: 'shot.png',
                url: 'https://cdn/shot.png',
                mediaType: 'image',
                sizeBytes: '2048',
                width: 1920,
                height: 1080,
                durationSeconds: null,
                caption: null,
                thumbnailColor: '#3a4a5c',
            },
        ],
        tags: ['siege', 'defense'],
        likesCount: 4,
        liked: false,
        submittedAt: '2026-06-04T06:00:00Z',
        approvedAt: null,
        createdAt: '2026-06-04T06:00:00Z',
        updatedAt: '2026-06-04T06:00:00Z',
        ...overrides,
    };
}

function page(data: ApiGalleryItem[]): PaginatedResponse<ApiGalleryItem> {
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

describe('GalleryService', () => {
    let service: GalleryService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
        });
        service = TestBed.inject(GalleryService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getAll(type) sets the filter query params', () => {
        service.getAll('image').subscribe();
        const req = httpMock.expectOne(
            (r) =>
                r.url === '/api/gallery' &&
                r.params.get('type') === 'image' &&
                r.params.get('limit') === '100',
        );
        expect(req.request.method).toBe('GET');
        req.flush(page([]));
    });

    it('getAll() maps media/author/tags fields (T-0111)', () => {
        let result: GalleryItem[] | undefined;
        service.getAll().subscribe((items) => (result = items));
        const req = httpMock.expectOne((r) => r.url === '/api/gallery');
        req.flush(page([apiItem()]));

        const item = result?.[0];
        expect(item?.submittedBy).toBe('Mara Erskine');
        expect(item?.mediaUrl).toBe('https://cdn/shot.png');
        expect(item?.likes).toBe(4);
        expect(item?.tags).toEqual(['siege', 'defense']);
        expect(item?.fileCount).toBe(1);
    });

    it('getArchive() hits the authenticated archive endpoint (T-0086)', () => {
        service.getArchive().subscribe();
        const req = httpMock.expectOne(
            (r) => r.url === '/api/gallery/archive' && r.params.get('limit') === '100',
        );
        expect(req.request.method).toBe('GET');
        req.flush(page([apiItem({ status: 'approved' })]));
    });

    it('moderationQueue(status) sends the status filter (T-0115)', () => {
        service.moderationQueue('declined').subscribe();
        const req = httpMock.expectOne(
            (r) =>
                r.url === '/api/gallery/moderation/queue' &&
                r.params.get('status') === 'declined' &&
                r.params.get('limit') === '100',
        );
        expect(req.request.method).toBe('GET');
        req.flush(page([apiItem({ status: 'declined', declineReason: 'blurry' })]));
    });

    it('pendingSummary() hits the pending-summary endpoint (T-0094)', () => {
        service.pendingSummary().subscribe();
        const req = httpMock.expectOne('/api/gallery/pending-summary');
        expect(req.request.method).toBe('GET');
        req.flush([{ id: 'g1', title: 'Siege', submitterUsername: 'Mara' }]);
    });

    it('submit() posts the payload with tags (T-0111)', () => {
        service
            .submit({ title: 'New', type: 'link', linkUrl: 'https://y.tube', tags: ['clutch'] })
            .subscribe();
        const req = httpMock.expectOne('/api/gallery');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            title: 'New',
            type: 'link',
            linkUrl: 'https://y.tube',
            tags: ['clutch'],
        });
        req.flush(apiItem());
    });

    it('decline() sends the reason', () => {
        service.decline('g1', 'blurry').subscribe();
        const req = httpMock.expectOne('/api/gallery/g1/decline');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ reason: 'blurry' });
        req.flush(apiItem({ status: 'declined' }));
    });

    it('like() returns the like state', () => {
        let state: { likesCount: number; liked: boolean } | undefined;
        service.like('g1').subscribe((s) => (state = s));
        const req = httpMock.expectOne('/api/gallery/g1/like');
        expect(req.request.method).toBe('POST');
        req.flush({ likesCount: 5, liked: true });
        expect(state).toEqual({ likesCount: 5, liked: true });
    });

    it('update() PATCHes the caption + tags and maps the result (T-0183)', () => {
        let result: GalleryItem | undefined;
        service.update('g1', { caption: 'New caption', tags: ['siege'] }).subscribe((i) => {
            result = i;
        });
        const req = httpMock.expectOne('/api/gallery/g1');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ caption: 'New caption', tags: ['siege'] });
        req.flush(apiItem({ caption: 'New caption', tags: ['siege'] }));
        expect(result?.caption).toBe('New caption');
        expect(result?.tags).toEqual(['siege']);
    });

    it('delete() issues a DELETE', () => {
        service.delete('g1').subscribe();
        const req = httpMock.expectOne('/api/gallery/g1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
