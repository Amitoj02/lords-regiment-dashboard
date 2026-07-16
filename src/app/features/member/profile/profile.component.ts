import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Member, Platform } from '../../../core/models/member.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { RegimentEvent } from '../../../core/models/event.model';
import { MembersService } from '../../../core/services/members.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { EventsService } from '../../../core/services/events.service';
import { AuthService } from '../../../core/services/auth.service';
import { StorageService } from '../../../core/services/storage.service';

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

    // ── Self-edit form (T-0121) ──────────────────────────────────────────────
    editing = false;
    saving = false;
    saveError: string | null = null;
    editName = '';
    editInGameName = '';
    editPlatform: Platform | '' = '';
    editTimezone = '';
    readonly platformOptions: { value: Platform; label: string }[] = [
        { value: 'steam', label: 'Steam / PC' },
        { value: 'xbox', label: 'Xbox' },
        { value: 'ps', label: 'PlayStation' },
    ];
    /** Local preview of a chosen avatar/banner + the resolved storage key. */
    avatarPreview: string | null = null;
    avatarKey: string | null = null;
    avatarUploading = false;
    bannerPreview: string | null = null;
    bannerKey: string | null = null;
    bannerUploading = false;

    // ── Full-size avatar viewer (T-0122) ─────────────────────────────────────
    viewerOpen = false;

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
        private storage: StorageService,
    ) {}

    ngOnInit(): void {
        this.isAdmin = this.auth.isAdmin();
        const routeId = this.route.snapshot.paramMap.get('id');
        // Own profile when no :id — load the signed-in user's own record
        // (T-0121: drop the legacy 'm1' fallback).
        const currentUser = this.auth.currentUser();
        const id = routeId ?? currentUser?.id ?? '';
        this.isOwnProfile = !routeId || currentUser?.id === id;

        if (!id) {
            return;
        }

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
                this.taggedItems = [];
            });

        this.eventsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((events) => {
                this.eventHistory = events.filter((e) => e.attendees?.includes(id));
            });
    }

    // ── Self-edit (T-0121) ────────────────────────────────────────────────────

    startEdit(): void {
        if (!this.member) {
            return;
        }
        this.editing = true;
        this.saveError = null;
        this.editName = this.member.name;
        this.editInGameName = this.member.inGameName ?? '';
        this.editPlatform = this.member.platform ?? '';
        this.editTimezone = this.member.timezone ?? '';
        this.avatarPreview = null;
        this.avatarKey = null;
        this.bannerPreview = null;
        this.bannerKey = null;
    }

    cancelEdit(): void {
        this.editing = false;
        this.avatarPreview = null;
        this.avatarKey = null;
        this.bannerPreview = null;
        this.bannerKey = null;
    }

    onAvatarSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
            return;
        }
        this.avatarPreview = URL.createObjectURL(file);
        this.avatarUploading = true;
        this.storage
            .upload('member-avatar', file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (key) => {
                    this.avatarKey = key;
                    this.avatarUploading = false;
                },
                error: () => {
                    this.avatarUploading = false;
                    this.saveError = 'Avatar upload failed. Please try again.';
                },
            });
    }

    onBannerSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
            return;
        }
        this.bannerPreview = URL.createObjectURL(file);
        this.bannerUploading = true;
        this.storage
            .upload('member-banner', file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (key) => {
                    this.bannerKey = key;
                    this.bannerUploading = false;
                },
                error: () => {
                    this.bannerUploading = false;
                    this.saveError = 'Banner upload failed. Please try again.';
                },
            });
    }

    get canSave(): boolean {
        return !this.saving && !this.avatarUploading && !this.bannerUploading && !!this.member;
    }

    save(): void {
        if (!this.member || !this.canSave) {
            return;
        }
        this.saving = true;
        this.saveError = null;
        const changes: Partial<Member> = {
            name: this.editName.trim(),
            inGameName: this.editInGameName.trim(),
            platform: this.editPlatform || undefined,
            timezone: this.editTimezone.trim() || undefined,
        };
        if (this.avatarKey) {
            changes.avatarKey = this.avatarKey;
        }
        if (this.bannerKey) {
            changes.bannerKey = this.bannerKey;
        }
        this.membersService
            .update(this.member.id, changes)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (updated) => {
                    this.member = updated;
                    this.saving = false;
                    this.editing = false;
                    // Refresh /auth/me so the sidebar + header avatar update live.
                    this.auth.loadCurrentUser().subscribe();
                },
                error: () => {
                    this.saving = false;
                    this.saveError = 'Could not save your profile. Please try again.';
                },
            });
    }

    // ── Full-size avatar viewer (T-0122) ──────────────────────────────────────

    get canOpenViewer(): boolean {
        return !!this.member?.avatarUrl;
    }

    openViewer(): void {
        if (this.canOpenViewer) {
            this.viewerOpen = true;
        }
    }

    closeViewer(): void {
        this.viewerOpen = false;
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
