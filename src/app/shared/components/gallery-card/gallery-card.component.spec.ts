import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GalleryCardComponent } from './gallery-card.component';
import { GalleryItem } from '../../../core/models/gallery.model';

function item(overrides: Partial<GalleryItem> = {}): GalleryItem {
    return {
        id: 'g1',
        title: 'Line Battle VOD',
        type: 'video',
        thumbnailUrl: '',
        submittedBy: 'Jameson Nolt',
        submittedAt: '2026-06-07T19:30:00',
        status: 'approved',
        likes: 0,
        views: 0,
        tags: [],
        ...overrides,
    };
}

describe('GalleryCardComponent (T-0242 video posters)', () => {
    let fixture: ComponentFixture<GalleryCardComponent>;
    let component: GalleryCardComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [CommonModule, RouterModule.forRoot([])],
            declarations: [GalleryCardComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(GalleryCardComponent);
        component = fixture.componentInstance;
    });

    function render(value: GalleryItem): HTMLElement {
        component.item = value;
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('renders an uploaded clip with a persisted poster as an <img>, never a <video>', () => {
        // iOS Safari paints no frame for a preload-less <video>, so the poster has
        // to replace the element outright rather than sit behind it.
        const el = render(
            item({
                mediaUrl: 'https://cdn.example/uploads/clip.mp4',
                thumbnailUrl: 'https://cdn.example/uploads/clip-poster.jpg',
            }),
        );
        expect(el.querySelector('video')).toBeNull();
        const img = el.querySelector('img.gallery-card-img') as HTMLImageElement;
        expect(img).toBeTruthy();
        expect(img.getAttribute('src')).toBe('https://cdn.example/uploads/clip-poster.jpg');
    });

    it('still marks a postered clip as playable so the card reads as a video', () => {
        render(
            item({
                mediaUrl: 'https://cdn.example/uploads/clip.mp4',
                thumbnailUrl: 'https://cdn.example/uploads/clip-poster.jpg',
            }),
        );
        expect(component.showPlay).toBe(true);
        expect(
            (fixture.nativeElement as HTMLElement).querySelector('.gallery-play-overlay'),
        ).toBeTruthy();
    });

    it('falls back to the inline clip when no poster was persisted', () => {
        const el = render(item({ mediaUrl: 'https://cdn.example/uploads/clip.mp4' }));
        const video = el.querySelector('video') as HTMLVideoElement;
        expect(video).toBeTruthy();
        // Guards the mobile-data invariant: metadata only, never autoplay.
        expect(video.getAttribute('preload')).toBe('metadata');
        expect(video.hasAttribute('autoplay')).toBe(false);
    });

    it('asks the posterless clip for a frame with a #t= fragment (T-0308)', () => {
        // WebKit paints nothing for a clip it was not asked for a time of, which
        // is why an iOS reader saw a flat black tile behind the play badge.
        const el = render(item({ mediaUrl: 'https://cdn.example/uploads/clip.mp4' }));
        const video = el.querySelector('video') as HTMLVideoElement;
        expect(video.getAttribute('src')).toBe('https://cdn.example/uploads/clip.mp4#t=0.1');
    });

    it('leaves a clip URL that already carries a fragment alone', () => {
        component.item = item({ mediaUrl: 'https://cdn.example/uploads/clip.mp4#t=4' });
        expect(component.videoPreviewSrc).toBe('https://cdn.example/uploads/clip.mp4#t=4');
    });

    it('has no clip src to offer for a still image', () => {
        component.item = item({ type: 'image', mediaUrl: 'https://cdn.example/uploads/shot.png' });
        expect(component.videoPreviewSrc).toBeNull();
    });

    it('shows the placeholder plus the play badge when the clip cannot be decoded', () => {
        render(item({ mediaUrl: 'https://cdn.example/uploads/clip.mp4' }));
        component.videoFailed = true;
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('video')).toBeNull();
        expect(el.querySelector('.gallery-card-placeholder')).toBeTruthy();
        expect(el.querySelector('.gallery-play-overlay')).toBeTruthy();
    });

    it('falls back from a broken poster to the inline clip', () => {
        render(
            item({
                mediaUrl: 'https://cdn.example/uploads/clip.mp4',
                thumbnailUrl: 'https://cdn.example/uploads/gone.jpg',
            }),
        );
        component.posterFailed = true;
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('video')).toBeTruthy();
    });

    it('treats an empty thumbnailUrl as no poster (mapGalleryItem maps null to "")', () => {
        component.item = item({ mediaUrl: 'https://cdn.example/uploads/clip.mp4' });
        expect(component.posterSrc).toBeNull();
    });

    it('keeps the derived poster for link embeds that have no persisted thumbnail', () => {
        component.item = item({
            type: 'link',
            mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        });
        expect(component.posterSrc).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    });

    it('prefers the full image over the poster for image items', () => {
        const el = render(
            item({
                type: 'image',
                mediaUrl: 'https://cdn.example/uploads/shot.png',
                thumbnailUrl: 'https://cdn.example/uploads/shot-small.png',
            }),
        );
        const img = el.querySelector('img.gallery-card-img') as HTMLImageElement;
        expect(img.getAttribute('src')).toBe('https://cdn.example/uploads/shot.png');
    });

    describe('like + view counts (T-0311)', () => {
        it('always shows the views chip, including at zero', () => {
            // A dispatch nobody has opened yet is a fact about how new it is —
            // hiding the eye would make "new" and "unpopular" look identical.
            const el = render(item({ views: 0 }));
            expect(el.querySelector('.gallery-stat--views')).toBeTruthy();
            expect(
                el.querySelector('.gallery-stat--views .gallery-stat-figure')!.textContent,
            ).toContain('0');
        });

        it('hides the heart entirely below one like, rather than printing "0"', () => {
            // A card reading "0 likes" is a small public verdict on the picture.
            const el = render(item({ likes: 0, views: 12 }));
            expect(el.querySelector('.gallery-stat--likes')).toBeNull();
        });

        it('shows the heart as soon as there is one like', () => {
            const el = render(item({ likes: 1, views: 12 }));
            expect(el.querySelector('.gallery-stat--likes')).toBeTruthy();
        });

        it('compacts both figures the same way', () => {
            const el = render(item({ likes: 1247, views: 4830 }));
            const figures = Array.from(el.querySelectorAll('.gallery-stat-figure')).map((n) =>
                n.textContent!.trim(),
            );
            expect(figures).toEqual(['1.2k', '4.8k']);
        });

        it('drops both chips when the surface opts out via [showStats]', () => {
            component.showStats = false;
            const el = render(item({ likes: 9, views: 12 }));
            expect(el.querySelector('.gallery-card-stats')).toBeNull();
        });

        it('defaults [showStats] on, so an archive card carries its counts', () => {
            expect(component.showStats).toBe(true);
        });

        it('names the figures for a screen reader, which cannot see the icons', () => {
            const el = render(item({ likes: 1, views: 1 }));
            const group = el.querySelector('.gallery-card-stats')!;
            // Singular at one, and the like clause is absent when there are none.
            expect(group.getAttribute('aria-label')).toBe('1 like, 1 view');

            const noLikes = render(item({ likes: 0, views: 5 }));
            expect(noLikes.querySelector('.gallery-card-stats')!.getAttribute('aria-label')).toBe(
                '5 views',
            );
        });

        it('renders no interactive control — the whole card is one link target', () => {
            // A heart that could be clicked here would be a button nested inside
            // the card's <a>. Liking lives on the detail page.
            const el = render(item({ likes: 3, views: 9 }));
            expect(el.querySelector('.gallery-card-stats button')).toBeNull();
        });
    });

    it('resets the failure flags when a new item is bound', () => {
        component.item = item({ mediaUrl: 'https://cdn.example/uploads/clip.mp4' });
        component.posterFailed = true;
        component.videoFailed = true;
        component.item = item({ id: 'g2', mediaUrl: 'https://cdn.example/uploads/other.mp4' });
        expect(component.posterFailed).toBe(false);
        expect(component.videoFailed).toBe(false);
    });
});
