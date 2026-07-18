import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GalleryItem } from '../../../core/models/gallery.model';
import { GalleryService } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';
import { GalleryPageComponent } from './gallery-page.component';

function item(id: string, tags: string[], status: GalleryItem['status'] = 'approved'): GalleryItem {
    return {
        id,
        title: `Item ${id}`,
        type: 'image',
        thumbnailUrl: '',
        submittedBy: 'Someone',
        submittedAt: '2026-06-04T06:00:00Z',
        status,
        likes: 0,
        tags,
    };
}

// a=5, b=4, c=3, d=2, e=1, f=1, g=1 across approved items; 'z' only appears on a
// pending item and must be excluded from the ranking.
const ITEMS: GalleryItem[] = [
    item('1', ['a', 'b', 'c', 'd', 'e']),
    item('2', ['a', 'b', 'c', 'd', 'f']),
    item('3', ['a', 'b', 'c', 'g']),
    item('4', ['a', 'b']),
    item('5', ['a']),
    item('6', ['z', 'z2'], 'pending'),
];

describe('GalleryPageComponent — tag ranking (T-0176/T-0177)', () => {
    let component: GalleryPageComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [GalleryPageComponent],
            providers: [
                { provide: GalleryService, useValue: { getAll: () => of(ITEMS) } },
                {
                    provide: AuthService,
                    useValue: { isAuthenticated: () => false, hasCapability: () => false },
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(GalleryPageComponent);
        component = fixture.componentInstance;
        component.ngOnInit();
    });

    it('ranks tags by frequency across approved items only, alpha tiebreak', () => {
        expect(component.allTags).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
        expect(component.allTags).not.toContain('z');
    });

    it('exposes the top 5 inline and flags the overflow', () => {
        expect(component.topTags).toEqual(['a', 'b', 'c', 'd', 'e']);
        expect(component.hasOverflowTags).toBe(true);
        expect(component.overflowTags).toEqual(['f', 'g']);
    });

    it('keeps an active overflow tag visible inline while collapsed', () => {
        component.setTag('f');
        // 'f' is beyond the top-5, so it is surfaced inline and removed from overflow.
        expect(component.visibleTags).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
        expect(component.overflowTags).toEqual(['g']);
    });

    it('once expanded, the active overflow tag lives in the overflow region, not inline', () => {
        component.setTag('f');
        component.toggleTags();
        expect(component.tagsExpanded).toBe(true);
        expect(component.visibleTags).toEqual(['a', 'b', 'c', 'd', 'e']);
        expect(component.overflowTags).toEqual(['f', 'g']);
    });

    it('does not flag overflow when there are 5 or fewer tags', () => {
        component.allTags = ['a', 'b', 'c'];
        expect(component.hasOverflowTags).toBe(false);
        expect(component.topTags).toEqual(['a', 'b', 'c']);
        expect(component.overflowTags).toEqual([]);
    });
});
