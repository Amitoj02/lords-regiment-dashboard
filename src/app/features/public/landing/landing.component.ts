import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentEvent } from '../../../core/models/event.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { GalleryService } from '../../../core/services/gallery.service';

@Component({
    selector: 'hf-landing',
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.scss'],
    standalone: false,
})
export class LandingComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly previewLimit = 3;

    upcomingEvents: RegimentEvent[] = [];
    galleryItems: GalleryItem[] = [];

    stats = [
        { value: '84', label: 'Active Members' },
        { value: '312', label: 'Events Fielded' },
        { value: '11', label: 'Campaigns Won' },
    ];

    officers = [
        { name: 'Alistair Holcombe', rank: 'Colonel', chevrons: 6, initials: 'AH' },
        { name: 'Diego Vasquez', rank: 'Major', chevrons: 5, initials: 'DV' },
        { name: 'Rhett Asher', rank: 'Captain', chevrons: 4, initials: 'RA' },
        { name: 'Jameson Nolt', rank: 'Lieutenant', chevrons: 3, initials: 'JN' },
    ];

    private readonly auth = inject(AuthService);

    constructor(
        private eventsService: EventsService,
        private galleryService: GalleryService,
    ) {}

    /** "Apply to Join" = sign in with Discord (members go to the dashboard). */
    applyToJoin(): void {
        this.auth.applyToJoin();
    }

    /**
     * Hero CTA label follows the session (the click target is handled by
     * applyToJoin): member → dashboard, applicant → their application, anonymous
     * → apply.
     */
    get applyLabel(): string {
        if (!this.auth.isAuthenticated()) return 'Apply to Join';
        return this.auth.isMember() ? 'Go to Dashboard' : 'View Application';
    }

    ngOnInit(): void {
        this.eventsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((events) => {
                this.upcomingEvents = events
                    .filter((e) => e.status === 'upcoming')
                    .slice(0, this.previewLimit);
            });
        this.galleryService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                this.galleryItems = items
                    .filter((i) => i.status === 'approved' && i.thumbnailUrl)
                    .slice(0, this.previewLimit);
            });
    }
}
