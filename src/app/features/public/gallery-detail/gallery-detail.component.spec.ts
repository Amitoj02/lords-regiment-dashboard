import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { GalleryItem } from '../../../core/models/gallery.model';
import { GalleryLikeState, GalleryService } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { ToastService } from '../../../core/services/toast.service';
import { GalleryDetailComponent } from './gallery-detail.component';

const ITEM: GalleryItem = {
    id: 'g1',
    title: 'Volley at the Sunken Bridge',
    type: 'image',
    thumbnailUrl: '',
    mediaUrl: 'https://cdn.example/plate.png',
    submittedBy: 'Cpl. Aldworth',
    submittedByMemberId: 'm1',
    submittedAt: '2026-07-28T18:00:00Z',
    status: 'approved',
    likes: 47,
    views: 1247,
    tags: [],
};

/**
 * The like/view half of the detail page (T-0311). The rest of the page —
 * media resolution, SEO tags, the moderator edit panel — is covered by the
 * surfaces that own it; this spec is about the toggle's state machine and about
 * what a signed-out reader is and is not offered.
 */
describe('GalleryDetailComponent — likes + views (T-0311)', () => {
    let fixture: ComponentFixture<GalleryDetailComponent>;
    let component: GalleryDetailComponent;
    let gallery: {
        getById: jasmine.Spy;
        likeState: jasmine.Spy;
        like: jasmine.Spy;
        unlike: jasmine.Spy;
        recordView: jasmine.Spy;
        delete: jasmine.Spy;
        update: jasmine.Spy;
    };
    let toast: { error: jasmine.Spy };
    let authenticated: boolean;

    /**
     * Arrange the doubles WITHOUT constructing the component, so a test can
     * adjust a return value before `create()` runs `ngOnInit` — which is where
     * the like state and the view are resolved.
     */
    function arrange(item: GalleryItem = ITEM): void {
        gallery = {
            getById: jasmine.createSpy('getById').and.returnValue(of(item)),
            likeState: jasmine
                .createSpy('likeState')
                .and.returnValue(of<GalleryLikeState>({ likesCount: 47, liked: false })),
            like: jasmine
                .createSpy('like')
                .and.returnValue(of<GalleryLikeState>({ likesCount: 48, liked: true })),
            unlike: jasmine
                .createSpy('unlike')
                .and.returnValue(of<GalleryLikeState>({ likesCount: 47, liked: false })),
            recordView: jasmine.createSpy('recordView').and.returnValue(of({ viewsCount: 1248 })),
            delete: jasmine.createSpy('delete').and.returnValue(of(void 0)),
            update: jasmine.createSpy('update').and.returnValue(of(item)),
        };
        toast = { error: jasmine.createSpy('error') };
        currentItem = item;
    }

    let currentItem: GalleryItem = ITEM;

    /** Construct the component and run its first change detection. */
    function create(): void {
        const item = currentItem;
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            declarations: [GalleryDetailComponent],
            providers: [
                { provide: GalleryService, useValue: gallery },
                { provide: ToastService, useValue: toast },
                {
                    provide: AuthService,
                    useValue: {
                        isAuthenticated: () => authenticated,
                        hasCapability: () => false,
                        currentUser: () => null,
                    },
                },
                { provide: RegimentService, useValue: { getProfile: () => of(null) } },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: { get: () => item.id } } },
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(GalleryDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    /** The common case: default doubles, component built. */
    function build(item: GalleryItem = ITEM): void {
        arrange(item);
        create();
    }

    describe('signed in', () => {
        beforeEach(() => {
            authenticated = true;
            build();
        });

        it('seeds the likes count from the item', () => {
            expect(component.likes).toBe(47);
        });

        it('asks the API whether this member already liked it, and adopts the answer', () => {
            // The public GET carries no `liked`, so without this the heart would
            // start hollow for someone who has liked it — and their next tap
            // would be a no-op "like" rather than the unlike they meant.
            arrange();
            gallery.likeState.and.returnValue(of({ likesCount: 47, liked: true }));
            create();

            expect(gallery.likeState).toHaveBeenCalledWith('g1');
            expect(component.liked).toBe(true);
        });

        it('records a view on load and takes the server’s total over the item’s', () => {
            // The item was fetched at 1247; recording this visit is what makes it
            // 1248, and the server's answer is the one that ends up on screen.
            expect(gallery.recordView).toHaveBeenCalledWith('g1');
            expect(ITEM.views).toBe(1247);
            expect(component.views).toBe(1248);
        });

        it('fills the heart and moves the figure on the tap, before the server replies', () => {
            let resolve: (state: GalleryLikeState) => void = () => undefined;
            gallery.like.and.returnValue(
                new Observable<GalleryLikeState>((sub) => {
                    resolve = (state) => {
                        sub.next(state);
                        sub.complete();
                    };
                }),
            );

            component.toggleLike();
            expect(component.liked).toBe(true);
            expect(component.likes).toBe(48);
            expect(component.likePending).toBe(true);

            resolve({ likesCount: 52, liked: true });
            // The server's count wins — others may have liked it meanwhile.
            expect(component.likes).toBe(52);
            expect(component.likePending).toBe(false);
        });

        it('unlikes when already liked', () => {
            arrange();
            gallery.likeState.and.returnValue(of({ likesCount: 47, liked: true }));
            create();

            component.toggleLike();

            expect(gallery.unlike).toHaveBeenCalledWith('g1');
            expect(gallery.like).not.toHaveBeenCalled();
            expect(component.liked).toBe(false);
        });

        it('rolls the optimistic state back and says so when the request fails', () => {
            gallery.like.and.returnValue(throwError(() => new Error('offline')));

            component.toggleLike();

            expect(component.liked).toBe(false);
            expect(component.likes).toBe(47);
            expect(component.likePending).toBe(false);
            expect(toast.error).toHaveBeenCalled();
        });

        it('refuses a second tap while one is in flight', () => {
            gallery.like.and.returnValue(new Observable<GalleryLikeState>(() => undefined));

            component.toggleLike();
            component.toggleLike();

            expect(gallery.like).toHaveBeenCalledTimes(1);
        });

        it('reads "Like" only while the count is zero', () => {
            component.likes = 0;
            expect(component.likesLabel).toBe('Like');
            component.likes = 1247;
            expect(component.likesLabel).toBe('1.2k');
        });

        it('plays no animation before the first tap, then alternates keyframes', () => {
            // Angular re-rendering with the SAME animation-name does not restart
            // it, so a fast double tap would look like nothing happened.
            expect(component.popAnimation).toBe('none');

            component.toggleLike();
            const first = component.popAnimation;
            component.toggleLike();
            const second = component.popAnimation;

            expect(first).not.toBe('none');
            expect(second).not.toBe(first);
        });

        it('bursts only when the tap ADDS a like, never when it removes one', () => {
            component.toggleLike();
            expect(component.burstAnimation).not.toBe('none');
            expect(component.ringAnimation).not.toBe('none');

            gallery.unlike.and.returnValue(of({ likesCount: 47, liked: false }));
            component.toggleLike();
            expect(component.burstAnimation).toBe('none');
            expect(component.ringAnimation).toBe('none');
        });

        it('renders the toggle as a real button', () => {
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('button.detail-like')).toBeTruthy();
        });
    });

    describe('signed out', () => {
        beforeEach(() => {
            authenticated = false;
            build();
        });

        it('still counts the view — every reader counts, membership is irrelevant', () => {
            expect(gallery.recordView).toHaveBeenCalledWith('g1');
            expect(component.views).toBe(1248);
        });

        it('never asks the authenticated like-state endpoint', () => {
            // It is a guaranteed 401 by design; calling it would put an error in
            // the console on every anonymous page view.
            expect(gallery.likeState).not.toHaveBeenCalled();
            expect(component.liked).toBe(false);
        });

        it('offers no button, but still shows both public counts', () => {
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('button.detail-like')).toBeNull();
            expect(el.querySelector('.detail-stat--likes')).toBeTruthy();
            expect(el.querySelector('.detail-stat--views')).toBeTruthy();
        });

        it('ignores a programmatic toggle rather than firing a doomed request', () => {
            component.toggleLike();
            expect(gallery.like).not.toHaveBeenCalled();
        });

        it('hides the likes chip at zero, the same rule the cards use', () => {
            build({ ...ITEM, likes: 0 });
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('.detail-stat--likes')).toBeNull();
            expect(el.querySelector('.detail-stat--views')).toBeTruthy();
        });
    });

    it('survives a view/like-state request that fails, without disturbing the page', () => {
        // Neither call is worth interrupting a reader for: a counter that could
        // break the page it counts would be worse than one that occasionally
        // misses.
        authenticated = true;
        arrange();
        gallery.recordView.and.returnValue(throwError(() => new Error('offline')));
        gallery.likeState.and.returnValue(throwError(() => new Error('offline')));

        expect(() => create()).not.toThrow();
        // Falls back to the counts the item itself carried.
        expect(component.views).toBe(1247);
        expect(component.likes).toBe(47);
        expect(component.liked).toBe(false);
        expect(component.notFound).toBe(false);
        expect(toast.error).not.toHaveBeenCalled();
    });
});
