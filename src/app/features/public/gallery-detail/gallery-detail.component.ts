import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryItem } from '../../../core/models/gallery.model';
import { GalleryService, UpdateGalleryPayload } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';
import { MediaEmbed, MediaEmbedService } from '../../../shared/services/media-embed.service';

/**
 * Public gallery detail page (T-0078) at /gallery/:id. Reads the id from the
 * route and renders the full item — media, submitter, date, tags, caption — using
 * the existing GalleryService.getById (no new service method needed). Moderators
 * additionally get an inline edit (caption + tags) / delete panel (T-0183).
 */
@Component({
    selector: 'hf-gallery-detail',
    templateUrl: './gallery-detail.component.html',
    styleUrls: ['./gallery-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class GalleryDetailComponent implements OnInit {
    item: GalleryItem | null = null;
    embed: MediaEmbed | null = null;
    loading = true;
    notFound = false;

    // Moderator edit state (T-0183). The media itself is never editable here.
    editing = false;
    editTitle = '';
    editCaption = '';
    editTags: string[] = [];
    tagInput = '';
    readonly maxTags = 10;
    saving = false;
    deleting = false;

    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly gallery = inject(GalleryService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly mediaEmbed = inject(MediaEmbedService);

    /** Capability gate for the moderator edit/delete panel (T-0183). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    /** The signed-in member is the post's author (T-0191). */
    get isAuthor(): boolean {
        return (
            !!this.item &&
            this.auth.isAuthenticated() &&
            this.auth.currentUser()?.id === this.item.submittedByMemberId
        );
    }

    /** Editing details (title/caption/tags) requires the moderate_gallery capability (T-0191). */
    get canEditDetails(): boolean {
        return this.can('moderate_gallery');
    }

    /** Moderators may delete any post; the author may delete their own (T-0191). */
    get canDelete(): boolean {
        return this.canEditDetails || this.isAuthor;
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.loading = false;
            this.notFound = true;
            return;
        }
        this.gallery
            .getById(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (item) => {
                    this.item = item;
                    this.embed = this.mediaEmbed.resolve(item.mediaUrl ?? item.thumbnailUrl);
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Failed to load gallery item', err);
                    this.loading = false;
                    this.notFound = true;
                },
            });
    }

    get mediaUrl(): string | null {
        return this.item?.mediaUrl ?? this.item?.thumbnailUrl ?? null;
    }

    /** Whether the tag input has hit the 10-tag cap. */
    get tagsAtLimit(): boolean {
        return this.editTags.length >= this.maxTags;
    }

    /** Enter edit mode, seeding the form from the current item. */
    startEdit(): void {
        if (!this.item) {
            return;
        }
        this.editTitle = this.item.title;
        this.editCaption = this.item.caption ?? '';
        this.editTags = [...this.item.tags];
        this.tagInput = '';
        this.editing = true;
    }

    cancelEdit(): void {
        this.editing = false;
        this.tagInput = '';
    }

    addTag(value?: string): void {
        const t = (value ?? this.tagInput).trim().toLowerCase();
        if (t && !this.editTags.includes(t) && !this.tagsAtLimit) {
            this.editTags.push(t);
        }
        this.tagInput = '';
    }

    removeTag(t: string): void {
        this.editTags = this.editTags.filter((tag) => tag !== t);
    }

    /** Persist the caption/tags edit (PATCH /gallery/:id). */
    save(): void {
        if (!this.item || this.saving) {
            return;
        }
        const title = this.editTitle.trim();
        if (!title) {
            // Title is required (backend column is NOT NULL) — refuse an empty save.
            return;
        }
        this.saving = true;
        const payload: UpdateGalleryPayload = {
            title,
            caption: this.editCaption.trim() || undefined,
            tags: [...this.editTags],
        };
        this.gallery
            .update(this.item.id, payload)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (updated) => {
                    this.item = updated;
                    this.editing = false;
                    this.saving = false;
                },
                error: (err) => {
                    console.error('Failed to update gallery item', err);
                    this.saving = false;
                },
            });
    }

    /** Delete the item + its stored media, then return to the gallery (T-0183). */
    deleteItem(): void {
        if (
            !this.item ||
            this.deleting ||
            !confirm(
                'Delete this dispatch permanently? This also removes the stored media and cannot be undone.',
            )
        ) {
            return;
        }
        this.deleting = true;
        this.gallery
            .delete(this.item.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.router.navigateByUrl('/gallery');
                },
                error: (err) => {
                    console.error('Failed to delete gallery item', err);
                    this.deleting = false;
                },
            });
    }
}
