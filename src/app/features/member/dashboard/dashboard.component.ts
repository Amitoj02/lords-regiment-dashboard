import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegimentEvent } from '../../../core/models/event.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { Application } from '../../../core/models/application.model';
import { EventsService } from '../../../core/services/events.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { ApplicationsService } from '../../../core/services/applications.service';

@Component({
    selector: 'hf-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    standalone: false,
})
export class DashboardComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly PREVIEW_COUNT = 3;

    upcomingEvents: RegimentEvent[] = [];
    recentGallery: GalleryItem[] = [];
    pendingApplications: Application[] = [];

    // Current member data (would come from AuthService in production)
    currentMember = {
        name: 'Alistair Holcombe',
        rank: 'Colonel',
        chevrons: 6,
        attendanceRate: 94,
        medals: [
            {
                letter: 'V',
                ribbon: 'gold' as const,
                title: 'Valour Cross',
                description: 'Awarded for exceptional battlefield conduct.',
            },
            {
                letter: 'C',
                ribbon: 'tricolor' as const,
                title: 'Campaign Star',
                description: 'Awarded for completing a full campaign.',
            },
            {
                letter: 'L',
                ribbon: 'red' as const,
                title: 'Long Service',
                description: 'Three or more seasons of active service.',
            },
        ],
    };

    dispatches = [
        {
            tone: 'info',
            title: 'Thursday Line Battle — Server password updated',
            body: 'New password: holdfast2026. Please do not share outside the regiment.',
            time: '2 hours ago',
        },
        {
            tone: 'warn',
            title: 'Officer drill mandatory this Wednesday',
            body: 'All officers and NCOs are expected. Mark your RSVP.',
            time: 'Yesterday',
        },
        {
            tone: 'ok',
            title: 'Promotion approved: Sade Wren → Sergeant',
            body: 'Congratulations to Sade Wren on their promotion. Roles updated in Discord.',
            time: '3 days ago',
        },
    ];

    constructor(
        private eventsService: EventsService,
        private galleryService: GalleryService,
        private applicationsService: ApplicationsService,
    ) {}

    ngOnInit(): void {
        this.eventsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((events) => {
                this.upcomingEvents = events
                    .filter((e) => e.status === 'upcoming')
                    .slice(0, this.PREVIEW_COUNT);
            });

        this.galleryService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                this.recentGallery = items
                    .filter((i) => i.status === 'approved' && i.thumbnailUrl)
                    .slice(0, this.PREVIEW_COUNT);
            });

        this.applicationsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((apps) => {
                this.pendingApplications = apps
                    .filter((a) => a.status === 'pending')
                    .slice(0, this.PREVIEW_COUNT);
            });
    }
}
