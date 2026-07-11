import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Application } from '../../../core/models/application.model';
import { ApplicationsService } from '../../../core/services/applications.service';

interface QueueItem {
    id: string;
    name: string;
    discordTag: string;
    applicantType: string;
    timeAgo: string;
    isReapply: boolean;
    avatarInitials: string;
}

@Component({
    selector: 'app-applications',
    templateUrl: './applications.component.html',
    styleUrls: ['./applications.component.scss'],
    standalone: false,
})
export class ApplicationsComponent implements OnInit {
    activeTab: 'pending' | 'approved' | 'declined' | 'reapply' = 'pending';
    selectedId = 'app1';

    moderatorNote = '';
    discordDmMessage = '';
    showPassword = false;

    queue: QueueItem[] = [
        {
            id: 'app1',
            name: 'Mara Erskine',
            discordTag: 'merskine#4417',
            applicantType: 'Applicant',
            timeAgo: '2h ago',
            isReapply: false,
            avatarInitials: 'ME',
        },
        {
            id: 'app2',
            name: 'Yusuf Bey',
            discordTag: 'ybey#1789',
            applicantType: 'Applicant',
            timeAgo: '6h ago',
            isReapply: false,
            avatarInitials: 'YB',
        },
        {
            id: 'app3',
            name: 'Lorne Hadley',
            discordTag: 'lhadley#2210',
            applicantType: 'Applicant',
            timeAgo: '1d ago',
            isReapply: false,
            avatarInitials: 'LH',
        },
        {
            id: 'app4',
            name: 'Elara Finch',
            discordTag: 'efinch#3344',
            applicantType: 'Mercenary',
            timeAgo: '3d ago',
            isReapply: false,
            avatarInitials: 'EF',
        },
        {
            id: 'app5',
            name: 'Nadia Voss',
            discordTag: 'nvoss#4422',
            applicantType: 'Applicant',
            timeAgo: '5d ago',
            isReapply: true,
            avatarInitials: 'NV',
        },
    ];

    selectedApplication: Application = {
        id: 'app1',
        applicantName: 'Mara Erskine',
        discordTag: 'merskine#4417',
        inGameName: 'Mara_E',
        platform: 'steam',
        applicantType: 'Applicant',
        source: 'Discord server listing',
        submittedAt: '2026-06-04T08:00:00Z',
        status: 'pending',
        timezone: 'Europe/London',
        whyJoin:
            'I have been following the Lords Regiment for several months and admire the discipline and camaraderie displayed in your event footage. I am looking for a regiment that takes line infantry seriously without losing the fun of the game. I believe I would be a strong fit based on my prior service with the 23rd Foot.',
        howFound:
            'Saw your recruitment post on the Holdfast Nations at War Discord. Was also recommended by a former regimental member.',
        priorExperience:
            'Eighteen months with the 23rd Foot (Line Infantry), two campaigns as a sergeant. Attended weekly training drills and participated in three major line battles. Left on good terms when the regiment disbanded.',
        isPreviousApplicant: false,
    };

    private readonly destroyRef = inject(DestroyRef);

    constructor(private applicationsService: ApplicationsService) {}

    ngOnInit(): void {
        this.loadApplication(this.selectedId);
    }

    loadApplication(id: string): void {
        this.selectedId = id;
        this.moderatorNote = '';
        this.discordDmMessage = '';
    }

    selectApplication(id: string): void {
        this.loadApplication(id);
    }

    isSelected(id: string): boolean {
        return this.selectedId === id;
    }

    get selectedIndex(): number {
        return this.queue.findIndex((q) => q.id === this.selectedId);
    }

    prev(): void {
        const idx = this.selectedIndex;
        if (idx > 0) {
            this.loadApplication(this.queue[idx - 1].id);
        }
    }

    next(): void {
        const idx = this.selectedIndex;
        if (idx < this.queue.length - 1) {
            this.loadApplication(this.queue[idx + 1].id);
        }
    }

    private removeFromQueue(id: string): void {
        const idx = this.queue.findIndex((q) => q.id === id);
        if (idx === -1) {
            return;
        }
        this.queue.splice(idx, 1);
        const nextItem = this.queue[idx] ?? this.queue[idx - 1];
        if (nextItem) {
            this.loadApplication(nextItem.id);
        }
    }

    approve(): void {
        const id = this.selectedId;
        // Approve takes no note server-side (it promotes to a member); the
        // moderator note applies to decline/hold only.
        this.applicationsService
            .approve(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.removeFromQueue(id),
                error: (err) => console.error('Failed to approve application', err),
            });
    }

    decline(): void {
        const id = this.selectedId;
        this.applicationsService
            .decline(id, this.moderatorNote)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.removeFromQueue(id),
                error: (err) => console.error('Failed to decline application', err),
            });
    }

    hold(): void {
        const id = this.selectedId;
        this.applicationsService
            .hold(id, this.moderatorNote)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.removeFromQueue(id),
                error: (err) => console.error('Failed to hold application', err),
            });
    }

    setTab(tab: 'pending' | 'approved' | 'declined' | 'reapply'): void {
        this.activeTab = tab;
    }
}
