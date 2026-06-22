import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { GalleryItem } from '../models/gallery.model';

const STUB_GALLERY: GalleryItem[] = [
    {
        id: 'g1',
        title: 'May Campaign — Final Charge',
        type: 'image',
        thumbnailUrl: '/assets/images/bg-1.jpg',
        mediaUrl: '/assets/images/bg-1.jpg',
        submittedBy: 'Rhett Asher',
        submittedAt: '2026-05-26T08:00:00Z',
        status: 'approved',
        likes: 14,
        tags: ['campaign', 'battle'],
        linkedEvent: 'ev4',
        taggedMembers: ['m1', 'm2', 'm3'],
        caption: 'The regiment charges at full strength during the final campaign assault.',
    },
    {
        id: 'g2',
        title: 'Formation Drill Screenshot',
        type: 'image',
        thumbnailUrl: '/assets/images/bg-2.jpg',
        mediaUrl: '/assets/images/bg-2.jpg',
        submittedBy: 'Mara Erskine',
        submittedAt: '2026-06-01T15:30:00Z',
        status: 'approved',
        likes: 7,
        tags: ['training', 'formation'],
        taggedMembers: ['m4', 'm5', 'm6'],
        caption: 'Perfect line formation during Thursday drill.',
    },
    {
        id: 'g3',
        title: 'Siege Defense Highlights',
        type: 'video',
        thumbnailUrl: '/assets/images/bg-1.jpg',
        mediaUrl: 'https://www.youtube.com/watch?v=example',
        submittedBy: 'Diego Vasquez',
        submittedAt: '2026-06-03T10:00:00Z',
        status: 'approved',
        likes: 22,
        tags: ['siege', 'highlight'],
        linkedEvent: 'ev2',
        fileCount: 1,
    },
    {
        id: 'g4',
        title: 'Regiment Banner at Waterloo Reenactment',
        type: 'image',
        thumbnailUrl: '/assets/images/banner.png',
        mediaUrl: '/assets/images/banner.png',
        submittedBy: 'Bjorn Trager',
        submittedAt: '2026-06-04T07:00:00Z',
        status: 'pending',
        likes: 0,
        tags: ['banner', 'ceremony'],
    },
    {
        id: 'g5',
        title: 'Discord Recap Thread Link',
        type: 'link',
        thumbnailUrl: '',
        mediaUrl: 'https://discord.com/channels/example',
        submittedBy: 'Sade Wren',
        submittedAt: '2026-05-28T20:00:00Z',
        status: 'approved',
        likes: 3,
        tags: ['discord', 'recap'],
        linkedEvent: 'ev4',
    },
    {
        id: 'g6',
        title: 'Questionable Content Submission',
        type: 'image',
        thumbnailUrl: '',
        mediaUrl: '',
        submittedBy: 'Unknown',
        submittedAt: '2026-06-02T22:00:00Z',
        status: 'declined',
        likes: 0,
        tags: [],
        caption: 'Declined by moderator.',
    },
];

@Injectable({ providedIn: 'root' })
export class GalleryService {
    // TODO: replace with HttpClient calls to /api/gallery

    getAll(): Observable<GalleryItem[]> {
        return of(STUB_GALLERY);
    }

    getById(id: string): Observable<GalleryItem | undefined> {
        return of(STUB_GALLERY.find((g) => g.id === id));
    }

    approve(id: string): Observable<GalleryItem | undefined> {
        // TODO: POST /api/gallery/:id/approve
        const idx = STUB_GALLERY.findIndex((g) => g.id === id);
        if (idx !== -1) {
            STUB_GALLERY[idx] = { ...STUB_GALLERY[idx], status: 'approved' };
            return of(STUB_GALLERY[idx]);
        }
        return of(undefined);
    }

    decline(id: string): Observable<GalleryItem | undefined> {
        // TODO: POST /api/gallery/:id/decline
        const idx = STUB_GALLERY.findIndex((g) => g.id === id);
        if (idx !== -1) {
            STUB_GALLERY[idx] = { ...STUB_GALLERY[idx], status: 'declined' };
            return of(STUB_GALLERY[idx]);
        }
        return of(undefined);
    }

    submit(item: Omit<GalleryItem, 'id' | 'status' | 'likes'>): Observable<GalleryItem> {
        // TODO: POST /api/gallery
        const newItem: GalleryItem = {
            ...item,
            id: `g${Date.now()}`,
            status: 'pending',
            likes: 0,
        };
        STUB_GALLERY.push(newItem);
        return of(newItem);
    }
}
