import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationsService } from './notifications.service';
import { ApiNotification, PaginatedResponse } from '../models/api.model';
import { Notification } from '../models/notification.model';

function apiNotification(overrides: Partial<ApiNotification> = {}): ApiNotification {
    return {
        id: 'n1',
        title: 'Muster',
        body: 'Fall in at 20:00',
        tone: 'info',
        authorLabel: null,
        createdAt: '2026-06-04T08:00:00Z',
        read: false,
        ...overrides,
    };
}

function page(data: ApiNotification[]): PaginatedResponse<ApiNotification> {
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

describe('NotificationsService', () => {
    let service: NotificationsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(NotificationsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getAll() maps a null author to the "Command" label', () => {
        let result: Notification[] | undefined;
        service.getAll().subscribe((n) => (result = n));
        const req = httpMock.expectOne('/api/notifications?limit=100');
        expect(req.request.method).toBe('GET');
        req.flush(page([apiNotification()]));
        expect(result?.[0].author).toBe('Command');
    });

    it('unreadCount() unwraps the count', () => {
        let count: number | undefined;
        service.unreadCount().subscribe((c) => (count = c));
        const req = httpMock.expectOne('/api/notifications/unread-count');
        req.flush({ count: 7 });
        expect(count).toBe(7);
    });

    it('compose() posts the dispatch payload', () => {
        service.compose({ title: 'Order', body: 'Advance', tone: 'warn' }).subscribe();
        const req = httpMock.expectOne('/api/notifications');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ title: 'Order', body: 'Advance', tone: 'warn' });
        req.flush(apiNotification());
    });

    it('markRead() posts to the per-item read endpoint', () => {
        let read: boolean | undefined;
        service.markRead('n1').subscribe((r) => (read = r));
        const req = httpMock.expectOne('/api/notifications/n1/read');
        expect(req.request.method).toBe('POST');
        req.flush({ read: true });
        expect(read).toBe(true);
    });

    it('markAllRead() unwraps the count marked', () => {
        let count: number | undefined;
        service.markAllRead().subscribe((c) => (count = c));
        const req = httpMock.expectOne('/api/notifications/read-all');
        expect(req.request.method).toBe('POST');
        req.flush({ read: 3 });
        expect(count).toBe(3);
    });
});
