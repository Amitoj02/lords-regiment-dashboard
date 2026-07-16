import { Component, DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GalleryFileInput, GalleryService } from '../../../core/services/gallery.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';

interface UploadedFile {
    id: string;
    filename: string;
    size: string;
    caption: string;
    mediaType: 'image' | 'video';
    previewUrl: string;
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
    standalone: false,
})
export class GallerySubmitComponent {
    activeTab: 'files' | 'link' = 'files';

    uploadedFiles: UploadedFile[] = [];

    submissionTitle = '';
    tagInput = '';
    tags: string[] = [];
    readonly maxTags = 10;
    /** Quick-add tag chips for common highlight categories (T-0112). */
    readonly quickTags = ['clutch', 'melee', 'artillery', 'longshot', 'multikills'];

    linkUrl = '';
    submitting = false;

    private fileSeq = 0;
    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private galleryService: GalleryService,
        private storage: StorageService,
        private auth: AuthService,
        private router: Router,
    ) {}

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
                },
                error: (err) => {
                    entry.uploading = false;
                    entry.error = true;
                    // Surface the backend's user-facing reason (e.g. the size limit) — T-0160.
                    entry.errorMessage = StorageService.uploadErrorMessage(err);
                },
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
        this.galleryService
            .submit({
                title,
                type,
                linkUrl: isLink ? this.linkUrl.trim() || undefined : undefined,
                files: files.length ? files : undefined,
                tags: this.tags.length ? [...this.tags] : undefined,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.submitting = false;
                    this.router.navigateByUrl('/app/gallery');
                },
                error: (err) => {
                    console.error('Failed to submit to gallery', err);
                    this.submitting = false;
                },
            });
    }
}
