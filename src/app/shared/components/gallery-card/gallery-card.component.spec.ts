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

    it('resets the failure flags when a new item is bound', () => {
        component.item = item({ mediaUrl: 'https://cdn.example/uploads/clip.mp4' });
        component.posterFailed = true;
        component.videoFailed = true;
        component.item = item({ id: 'g2', mediaUrl: 'https://cdn.example/uploads/other.mp4' });
        expect(component.posterFailed).toBe(false);
        expect(component.videoFailed).toBe(false);
    });
});
