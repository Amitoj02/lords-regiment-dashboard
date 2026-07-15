import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { GalleryAdminComponent } from './gallery-admin.component';
import { GalleryService } from '../../../core/services/gallery.service';
import { GalleryItem } from '../../../core/models/gallery.model';

function item(overrides: Partial<GalleryItem> = {}): GalleryItem {
    return {
        id: 'g1',
        title: 'Siege Defense',
        type: 'image',
        thumbnailUrl: '',
        submittedBy: 'Jameson Nolt',
        submittedAt: '2026-06-07T19:30:00',
        status: 'approved',
        likes: 3,
        tags: ['siege'],
        ...overrides,
    };
}

describe('GalleryAdminComponent', () => {
    let fixture: ComponentFixture<GalleryAdminComponent>;
    let component: GalleryAdminComponent;
    let galleryService: jasmine.SpyObj<GalleryService>;

    function setup(items: GalleryItem[], queue: GalleryItem[] = []): void {
        galleryService = jasmine.createSpyObj<GalleryService>('GalleryService', [
            'getAll',
            'moderationQueue',
        ]);
        galleryService.getAll.and.returnValue(of(items));
        galleryService.moderationQueue.and.returnValue(of(queue));

        TestBed.configureTestingModule({
            imports: [CommonModule, RouterModule.forRoot([])],
            declarations: [GalleryAdminComponent],
            providers: [{ provide: GalleryService, useValue: galleryService }],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(GalleryAdminComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('renders only approved items in the archive grid', () => {
        setup([item({ id: 'g1', status: 'approved' }), item({ id: 'g2', status: 'pending' })]);
        expect(component.items.length).toBe(1);
        const cards = fixture.nativeElement.querySelectorAll('.gallery-card');
        expect(cards.length).toBe(1);
    });

    it('links to the moderation queue and submit surfaces with a pending count', () => {
        setup(
            [item()],
            [item({ id: 'p1', status: 'pending' }), item({ id: 'p2', status: 'pending' })],
        );
        expect(component.pendingCount).toBe(2);
        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelector('a[href="/app/gallery/mod"]')).toBeTruthy();
        expect(el.querySelector('a[href="/app/gallery/submit"]')).toBeTruthy();
    });

    it('shows an empty state when the archive has no approved items', () => {
        setup([]);
        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelector('.empty')).toBeTruthy();
        expect(el.querySelectorAll('.gallery-card').length).toBe(0);
    });
});
