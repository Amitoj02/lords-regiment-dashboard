import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryFileInput, GalleryService } from '../../../core/services/gallery.service';
import { DEFAULT_STORAGE_POLICY, StorageService } from '../../../core/services/storage.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';
import { MediaEmbed, MediaEmbedService } from '../../../shared/services/media-embed.service';
import { VideoPosterService } from '../../../core/services/video-poster.service';
import { ToastService } from '../../../core/services/toast.service';
import { SeoService } from '../../../core/services/seo.service';

interface UploadedFile {
    id: string;
    filename: string;
    size: string;
    caption: string;
    mediaType: 'image' | 'video';
    previewUrl: string;
    /**
     * Poster key for a VIDEO entry (lords-dashboard-backend:T-0152). Null for an
     * image, and null for a video whose frame could not be decoded - in which
     * case the item simply falls back to the placeholder tile.
     */
    posterKey?: string | null;
    /** Storage key once the presigned PUT completes; null while uploading. */
    key: string | null;
    uploading: boolean;
    error: boolean;
    /** User-facing failure message from the backend (T-0160), when the upload fails. */
    errorMessage?: string;
}

@Component({
    selector: 'app-gallery-submit',
    templateUrl: './gallery-submit.component.html',
    styleUrls: ['./gallery-submit.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class GallerySubmitComponent implements OnInit {
    activeTab: 'files' | 'link' = 'files';

    uploadedFiles: UploadedFile[] = [];

    /** The fixed accepted-type list for gallery uploads (from the upload policy). */
    private static readonly GALLERY_TYPES = StorageService.formatExtensions(
        StorageService.targetPolicy(DEFAULT_STORAGE_POLICY, 'gallery').acceptedExtensions,
    );
    /** Accepted-types + size/item caps for the dropzone hint. The type list is the
     * fixed upload policy; the caps are admin-configurable (GET /api/settings), so
     * they are seeded from the backend defaults then refreshed live (T-0187). */
    galleryHint = this.composeGalleryHint(12, 80, 10);

    submissionTitle = '';
    tagInput = '';
    tags: string[] = [];
    readonly maxTags = 10;
    /** Quick-add tag chips for common highlight categories (T-0112). */
    readonly quickTags = ['clutch', 'melee', 'artillery', 'longshot', 'multikills'];

    linkUrl = '';
    /** Live provider-detected preview of the pasted external link (T-0164). */
    linkPreview: MediaEmbed | null = null;
    /** Set when the resolved poster image fails to load (falls back to a link chip). */
    linkPosterFailed = false;
    submitting = false;
    /** Server-side reason the last submit failed, shown beside the button. */
    submitError = '';

    private fileSeq = 0;
    private readonly destroyRef = inject(DestroyRef);
    private readonly seo = inject(SeoService);

    constructor(
        private galleryService: GalleryService,
        private storage: StorageService,
        private settings: SettingsService,
        private auth: AuthService,
        private router: Router,
        private media: MediaEmbedService,
        private videoPoster: VideoPosterService,
        private toast: ToastService,
    ) {}

    ngOnInit(): void {
        // A signed-in, capability-gated form. It has nothing to offer a search
        // result and every visitor who reaches it from one would be bounced.
        this.seo.apply({
            title: 'Submit to Gallery',
            description: 'Submit a photograph, clip or link to the regiment gallery.',
            noIndex: true,
        });

        // Gallery size/item caps are admin-configurable — refresh the hint from the
        // live settings, but never block on it (keep the seeded defaults on error).
        this.settings
            .getSettings()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (s) => {
                    this.galleryHint = this.composeGalleryHint(
                        s.galleryMaxImageSizeMb,
                        s.galleryMaxVideoSizeMb,
                        s.galleryMaxItemsPerSubmission,
                    );
                },
                error: () => {
                    /* keep the default hint */
                },
            });
    }

    /** "PNG, JPG, WebP, MP4, WEBM or MOV · images up to N MB, video up to M MB · max K files". */
    private composeGalleryHint(imageMb: number, videoMb: number, maxItems: number): string {
        return `${GallerySubmitComponent.GALLERY_TYPES} · images up to ${imageMb} MB, video up to ${videoMb} MB · max ${maxItems} files`;
    }

    /** Re-resolve the link preview whenever the URL input changes. */
    onLinkChange(): void {
        this.linkPosterFailed = false;
        this.linkPreview = this.media.resolve(this.linkUrl.trim());
    }

    /** Capability gate for a template action. */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    onFilesSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const files = input.files ? Array.from(input.files) : [];
        for (const file of files) {
            this.uploadFile(file);
        }
        // Reset the input so selecting the same file again re-triggers change.
        input.value = '';
    }

    private uploadFile(file: File): void {
        const mediaType: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image';
        const entry: UploadedFile = {
            id: `f${this.fileSeq++}`,
            filename: file.name,
            size: String(file.size),
            caption: '',
            mediaType,
            previewUrl: URL.createObjectURL(file),
            key: null,
            uploading: true,
            error: false,
        };
        this.uploadedFiles = [...this.uploadedFiles, entry];
        this.storage
            .upload('gallery', file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (key) => {
                    entry.key = key;
                    entry.uploading = false;
                    if (mediaType === 'video') {
                        this.attachPoster(entry, file);
                    }
                },
                error: (err) => {
                    entry.uploading = false;
                    entry.error = true;
                    // Surface the backend's user-facing reason (e.g. the size limit) — T-0160.
                    entry.errorMessage = StorageService.uploadErrorMessage(err);
                },
            });
    }

    /**
     * Best-effort poster capture for an uploaded video. Deliberately fire-and-
     * forget and never surfaced as an error: a missing poster costs a thumbnail,
     * while blocking or failing the submission would cost the upload the member
     * actually asked for. `uploading` is already false by this point, so the
     * submit button is not held hostage to a decode.
     */
    private attachPoster(entry: UploadedFile, file: File): void {
        void this.videoPoster
            .capture(file)
            .then((blob) => {
                if (!blob) return;
                const poster = new File([blob], `${file.name}.poster.jpg`, { type: 'image/jpeg' });
                this.storage
                    .upload('gallery-poster', poster)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (posterKey) => (entry.posterKey = posterKey),
                        error: () => (entry.posterKey = null),
                    });
            })
            .catch(() => {
                entry.posterKey = null;
            });
    }

    removeFile(id: string): void {
        this.uploadedFiles = this.uploadedFiles.filter((f) => f.id !== id);
    }

    get tagsAtLimit(): boolean {
        return this.tags.length >= this.maxTags;
    }

    addTag(value?: string): void {
        const t = (value ?? this.tagInput).trim().toLowerCase();
        if (t && !this.tags.includes(t) && !this.tagsAtLimit) {
            this.tags.push(t);
        }
        this.tagInput = '';
    }

    removeTag(t: string): void {
        this.tags = this.tags.filter((tag) => tag !== t);
    }

    get availableQuickTags(): string[] {
        return this.quickTags.filter((q) => !this.tags.includes(q));
    }

    get uploadsPending(): boolean {
        return this.uploadedFiles.some((f) => f.uploading);
    }

    get canSubmit(): boolean {
        return !!this.submissionTitle.trim() && !this.submitting && !this.uploadsPending;
    }

    submit(): void {
        const title = this.submissionTitle.trim();
        if (!title || !this.canSubmit) {
            return;
        }
        const isLink = this.activeTab === 'link';
        const files: GalleryFileInput[] = isLink
            ? []
            : this.uploadedFiles
                  .filter((f) => f.key)
                  .map((f) => ({
                      fileName: f.filename,
                      key: f.key ?? undefined,
                      mediaType: f.mediaType,
                      sizeBytes: f.size,
                      caption: f.caption || undefined,
                  }));

        // type: link when on the Link tab, else video if any video was uploaded.
        const type = isLink
            ? 'link'
            : files.some((f) => f.mediaType === 'video')
              ? 'video'
              : 'image';

        this.submitting = true;
        this.submitError = '';
        this.galleryService
            .submit({
                title,
                type,
                linkUrl: isLink ? this.linkUrl.trim() || undefined : undefined,
                files: files.length ? files : undefined,
                // One poster per ITEM, so the first video that produced one wins.
                posterKey: isLink
                    ? undefined
                    : (this.uploadedFiles.find((f) => f.posterKey)?.posterKey ?? undefined),
                tags: this.tags.length ? [...this.tags] : undefined,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.submitting = false;
                    // *** SAY WHAT JUST HAPPENED. *** A submission lands as
                    // `pending`, and the gallery lists only APPROVED items — so
                    // this navigation used to drop the member on a grid that
                    // pointedly did not contain the thing they had just spent
                    // several minutes uploading, with no explanation at all. The
                    // toast is the only thing that tells them it worked.
                    this.toast.info(
                        'Submitted for review. An officer will approve it before it appears in the gallery.',
                    );
                    this.router.navigateByUrl('/gallery');
                },
                error: (err: unknown) => {
                    console.error('Failed to submit to gallery', err);
                    this.submitting = false;
                    // A failed submit was previously SILENT — console only. The
                    // button simply un-disabled itself and nothing was said.
                    this.submitError =
                        (err as { error?: { message?: string } })?.error?.message ??
                        'Could not submit — try again.';
                    this.toast.error(this.submitError);
                },
            });
    }
}
