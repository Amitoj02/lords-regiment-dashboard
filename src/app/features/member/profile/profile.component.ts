import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Member } from '../../../core/models/member.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { RegimentEvent } from '../../../core/models/event.model';
import { MembersService } from '../../../core/services/members.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { EventsService } from '../../../core/services/events.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'hf-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    standalone: false,
})
export class ProfileComponent implements OnInit {
    member: Member | null = null;
    galleryItems: GalleryItem[] = [];
    taggedItems: GalleryItem[] = [];
    eventHistory: RegimentEvent[] = [];
    activeTab: 'gallery' | 'tagged' | 'events' | 'rsvps' = 'gallery';
    isAdmin = false;
    isOwnProfile = false;

    /** The target of the admin-action modal (null = closed). */
    adminTarget: Member | null = null;

    private readonly destroyRef = inject(DestroyRef);
    private readonly maxGalleryItems = 6;

    medals = [
        {
            letter: 'V',
            ribbon: 'gold' as const,
            title: 'Valour Cross',
            description: 'Exceptional battlefield conduct.',
        },
        {
            letter: 'C',
            ribbon: 'tricolor' as const,
            title: 'Campaign Star',
            description: 'Completed a full campaign.',
        },
        {
            letter: 'L',
            ribbon: 'red' as const,
            title: 'Long Service',
            description: 'Three+ seasons of active service.',
        },
        {
            letter: 'D',
            ribbon: 'blue' as const,
            title: 'Distinguished Drill',
            description: 'Excellence in formation drill.',
        },
    ];

    serviceTimeline = [
        { date: 'Jan 2022', event: 'Enlisted as Private', note: '' },
        { date: 'Mar 2022', event: 'Promoted to Corporal', note: 'Excellent drill performance.' },
        { date: 'Jun 2022', event: 'Promoted to Sergeant', note: '' },
        { date: 'Oct 2022', event: 'Awarded Valour Cross', note: 'May Campaign — Final Assault.' },
        { date: 'Mar 2023', event: 'Promoted to Lieutenant', note: '' },
        { date: 'Sep 2023', event: 'Promoted to Captain', note: '' },
        { date: 'Feb 2024', event: 'Promoted to Major', note: '' },
        { date: 'Jan 2025', event: 'Promoted to Colonel', note: 'Regiment CO.' },
    ];

    constructor(
        private route: ActivatedRoute,
        private membersService: MembersService,
        private galleryService: GalleryService,
        private eventsService: EventsService,
        private auth: AuthService,
    ) {}

    ngOnInit(): void {
        this.isAdmin = this.auth.isAdmin();
        const id = this.route.snapshot.paramMap.get('id') ?? 'm1';
        const currentUser = this.auth.currentUser() as { id: string } | null;
        this.isOwnProfile = currentUser?.id === id || !this.route.snapshot.paramMap.get('id');

        this.membersService
            .getById(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((member) => {
                this.member = member ?? null;
            });

        this.galleryService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                this.galleryItems = items
                    .filter((i) => i.submittedBy && i.status === 'approved')
                    .slice(0, this.maxGalleryItems);
                this.taggedItems = items
                    .filter((i) => i.taggedMembers?.includes(id))
                    .slice(0, this.maxGalleryItems);
            });

        this.eventsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((events) => {
                this.eventHistory = events.filter((e) => e.attendees?.includes(id));
            });
    }

    setTab(tab: 'gallery' | 'tagged' | 'events' | 'rsvps'): void {
        this.activeTab = tab;
    }

    openAdminActions(): void {
        this.adminTarget = this.member;
    }

    onMemberUpdated(updated: Member): void {
        this.member = updated;
    }

    getInitials(name: string): string {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    getRoleClass(role: string): string {
        switch (role) {
            case 'Owner':
                return 'brass';
            case 'Admin':
                return 'ox';
            case 'Moderator':
                return 'blue';
            default:
                return 'parch';
        }
    }
}
