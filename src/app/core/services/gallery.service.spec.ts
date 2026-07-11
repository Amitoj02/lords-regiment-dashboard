import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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
        eventId: 'ev1',
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
        taggedMembers: [{ memberId: 'm2', name: 'Sade Wren' }],
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
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(GalleryService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getAll(type, eventId) sets the filter query params', () => {
        service.getAll('image', 'ev1').subscribe();
        const req = httpMock.expectOne(
            (r) =>
                r.url === '/api/gallery' &&
                r.params.get('type') === 'image' &&
                r.params.get('eventId') === 'ev1' &&
                r.params.get('limit') === '100',
        );
        expect(req.request.method).toBe('GET');
        req.flush(page([]));
    });

    it('getAll() maps media/author/tagged fields', () => {
        let result: GalleryItem[] | undefined;
        service.getAll().subscribe((items) => (result = items));
        const req = httpMock.expectOne((r) => r.url === '/api/gallery');
        req.flush(page([apiItem()]));

        const item = result?.[0];
        expect(item?.submittedBy).toBe('Mara Erskine');
        expect(item?.mediaUrl).toBe('https://cdn/shot.png');
        expect(item?.likes).toBe(4);
        expect(item?.taggedMembers).toEqual(['m2']);
        expect(item?.fileCount).toBe(1);
    });

    it('moderationQueue() hits the moderation endpoint', () => {
        service.moderationQueue().subscribe();
        const req = httpMock.expectOne('/api/gallery/moderation/queue?limit=100');
        expect(req.request.method).toBe('GET');
        req.flush(page([apiItem()]));
    });

    it('submit() posts the payload', () => {
        service.submit({ title: 'New', type: 'link', linkUrl: 'https://y.tube' }).subscribe();
        const req = httpMock.expectOne('/api/gallery');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ title: 'New', type: 'link', linkUrl: 'https://y.tube' });
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

    it('delete() issues a DELETE', () => {
        service.delete('g1').subscribe();
        const req = httpMock.expectOne('/api/gallery/g1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
