import { Location } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Member } from '../../../core/models/member.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { RegimentEvent } from '../../../core/models/event.model';
import { MembersService, ServiceRecordEntry } from '../../../core/services/members.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';
import { DEFAULT_STORAGE_POLICY, StorageService } from '../../../core/services/storage.service';

@Component({
    selector: 'hf-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    standalone: false,
})
export class ProfileComponent implements OnInit {
    member: Member | null = null;
    galleryItems: GalleryItem[] = [];
    eventHistory: RegimentEvent[] = [];
    rsvps: RegimentEvent[] = [];
    serviceRecord: ServiceRecordEntry[] = [];
    activeTab: 'gallery' | 'events' | 'rsvps' = 'gallery';
    isAdmin = false;
    isOwnProfile = false;
    /** Last Access + Service Record are gated to the member themselves or staff. */
    canViewPrivate = false;

    // Resolution state (T-0139): distinguish "still loading" from "not found" so
    // an invalid id shows a graceful empty state instead of an endless spinner.
    loading = true;
    notFound = false;

    /** The target of the admin-action modal (null = closed). */
    adminTarget: Member | null = null;

    // ── Self-edit form (T-0121) ──────────────────────────────────────────────
    editing = false;
    saving = false;
    saveError: string | null = null;
    editInGameName = '';
    /** Local preview of a chosen avatar/banner + the resolved storage key. */
    avatarPreview: string | null = null;
    avatarKey: string | null = null;
    avatarUploading = false;
    bannerPreview: string | null = null;
    bannerKey: string | null = null;
    bannerUploading = false;
    /** Accepted-types + max-size hints, seeded from the static policy then refreshed
     * from GET /storage/policy so they mirror the backend limits (T-0187). */
    avatarHint = StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'member-avatar');
    bannerHint = StorageService.uploadHint(DEFAULT_STORAGE_POLICY, 'member-banner');

    // ── Full-size avatar viewer (T-0122) ─────────────────────────────────────
    viewerOpen = false;

    private readonly destroyRef = inject(DestroyRef);
    private readonly maxGalleryItems = 6;
    /** Monotonic token so a prior navigation's late responses can't overwrite the
     * current member's data when routing quickly between profiles (T-0165). */
    private loadToken = 0;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private location: Location,
        private membersService: MembersService,
        private galleryService: GalleryService,
        private auth: AuthService,
        private storage: StorageService,
    ) {}

    ngOnInit(): void {
        // Angular reuses this component instance when navigating between
        // /app/profile/:id routes, so re-load on every param change rather than
        // reading the id once — otherwise the previous member lingers (T-0165).
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            this.loadMember(params.get('id'));
        });

        // Refresh the upload hints from the live backend storage policy (T-0187);
        // getPolicy() falls back to the defaults already shown if the fetch fails.
        this.storage
            .getPolicy()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((policy) => {
                this.avatarHint = StorageService.uploadHint(policy, 'member-avatar');
                this.bannerHint = StorageService.uploadHint(policy, 'member-banner');
            });
    }

    private loadMember(routeId: string | null): void {
        this.isAdmin = this.auth.isAdmin();
        const currentUser = this.auth.currentUser();
        // A bare /app/profile resolves to the signed-in user's own uid (T-0139).
        const id = routeId ?? currentUser?.id ?? '';
        // Own profile ONLY when the resolved id matches the signed-in uid.
        this.isOwnProfile = !!currentUser && currentUser.id === id;
        this.canViewPrivate = this.isOwnProfile || this.isAdmin;

        // Bump the load token; any in-flight response from a prior navigation is
        // now stale and will be dropped by the guards below.
        const token = ++this.loadToken;

        // Reset per-navigation state so nothing from the previous member lingers.
        this.member = null;
        this.galleryItems = [];
        this.eventHistory = [];
        this.rsvps = [];
        this.serviceRecord = [];
        this.notFound = false;
        this.loading = true;
        this.editing = false;
        this.viewerOpen = false;
        this.adminTarget = null;

        if (!id) {
            this.loading = false;
            this.notFound = true;
            return;
        }

        this.membersService
            .getById(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (member) => {
                    if (token !== this.loadToken) {
                        return;
                    }
                    this.loading = false;
                    if (!member) {
                        this.notFound = true;
                        return;
                    }
                    this.member = member;
                    this.loadRelated(id, token);
                },
                error: () => {
                    if (token !== this.loadToken) {
                        return;
                    }
                    this.loading = false;
                    this.notFound = true;
                },
            });
    }

    /** Return to the previous page (back button — T-0166). */
    back(): void {
        this.location.back();
    }

    /** Navigate to the dedicated account-deletion page (T-0169). */
    goToAccountDeletion(): void {
        this.editing = false;
        void this.router.navigate(['/app/account-deletion']);
    }

    /** Load the tabs + timeline once we have a valid member. `token` guards against
     * a superseded navigation writing stale data after the user moved on. */
    private loadRelated(id: string, token: number): void {
        // Scope the tab to the profiled member's own approved items. There is no
        // by-author gallery endpoint yet, so filter the public feed by author id
        // client-side (a dedicated per-author endpoint is a backend follow-up).
        this.galleryService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                if (token !== this.loadToken) {
                    return;
                }
                this.galleryItems = items
                    .filter((i) => i.submittedByMemberId === id && i.status === 'approved')
                    .slice(0, this.maxGalleryItems);
            });

        // Event History + RSVPs come straight from the member endpoints (T-0142).
        this.membersService
            .getEvents(id)
            .pipe(
                catchError(() => of<RegimentEvent[]>([])),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((events) => {
                if (token === this.loadToken) {
                    this.eventHistory = events;
                }
            });

        this.membersService
            .getRsvps(id)
            .pipe(
                catchError(() => of<RegimentEvent[]>([])),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((events) => {
                if (token === this.loadToken) {
                    this.rsvps = events;
                }
            });

        // Service Record is privacy-gated; the backend also returns 403 for a
        // non-admin viewing another member, so swallow errors to an empty list.
        if (this.canViewPrivate) {
            this.membersService
                .getServiceRecord(id)
                .pipe(
                    catchError(() => of<ServiceRecordEntry[]>([])),
                    takeUntilDestroyed(this.destroyRef),
                )
                .subscribe((entries) => {
                    if (token === this.loadToken) {
                        this.serviceRecord = entries;
                    }
                });
        }
    }

    // ── Self-edit (T-0121) ────────────────────────────────────────────────────

    startEdit(): void {
        if (!this.member) {
            return;
        }
        this.editing = true;
        this.saveError = null;
        this.editInGameName = this.member.inGameName ?? '';
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
                error: (err) => {
                    this.avatarUploading = false;
                    this.saveError = StorageService.uploadErrorMessage(
                        err,
                        'Avatar upload failed. Please try again.',
                    );
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
                error: (err) => {
                    this.bannerUploading = false;
                    this.saveError = StorageService.uploadErrorMessage(
                        err,
                        'Banner upload failed. Please try again.',
                    );
                },
            });
    }

    get canSave(): boolean {
        return (
            !this.saving &&
            !this.avatarUploading &&
            !this.bannerUploading &&
            !!this.member &&
            !!this.editInGameName.trim()
        );
    }

    save(): void {
        if (!this.member || !this.canSave) {
            return;
        }
        this.saving = true;
        this.saveError = null;
        const changes: Partial<Member> = {
            inGameName: this.editInGameName.trim(),
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

    setTab(tab: 'gallery' | 'events' | 'rsvps'): void {
        this.activeTab = tab;
    }

    openAdminActions(): void {
        this.adminTarget = this.member;
    }

    onMemberUpdated(updated: Member): void {
        this.member = updated;
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

    /**
     * Colour-code a service-record entry (dot + type tag) by its type. The
     * backend writes promotion/demotion/role/award/suspension/ban from
     * MembersService.addServiceRecord, plus 'enlistment' when an application is
     * approved.
     *
     * Every branch MUST return a class. The old `default: return ''` left the dot
     * on `.timeline-dot`'s inherited brass, pixel-identical to `.is-rank` — which
     * is why 'enlistment' (absent from this switch, and the first entry on every
     * member's timeline) has been rendering as a promotion. Unrecognised types
     * now read neutrally instead of claiming a rank change happened (T-0253).
     */
    serviceEntryClass(type: string): string {
        switch (type) {
            case 'promotion':
            case 'rank':
                return 'is-rank';
            case 'demotion':
                return 'is-demotion';
            case 'role':
                return 'is-role';
            case 'award':
            case 'medal':
                return 'is-medal';
            case 'suspension':
            case 'ban':
                return 'is-suspension';
            // 'enlistment' is a known type deliberately rendered neutrally — it
            // shares the fallback so a new backend type is never mis-coloured.
            case 'enlistment':
            default:
                return 'is-neutral';
        }
    }
}
