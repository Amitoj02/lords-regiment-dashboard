import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventsService } from '../../../core/services/events.service';
import { GalleryFileInput, GalleryService } from '../../../core/services/gallery.service';
import { AuthService } from '../../../core/services/auth.service';

interface UploadedFile {
    id: string;
    filename: string;
    size: string;
    caption: string;
    thumbnailColor: string;
}

@Component({
    selector: 'app-gallery-submit',
    templateUrl: './gallery-submit.component.html',
    styleUrls: ['./gallery-submit.component.scss'],
    standalone: false,
})
export class GallerySubmitComponent implements OnInit {
    activeTab: 'files' | 'link' = 'files';

    uploadedFiles: UploadedFile[] = [];

    submissionTitle = '';
    selectedEvent = '';
    tagInput = '';
    tags: string[] = [];

    /** Populated from the real events list (GET /events) for the "linked event" picker. */
    events: { value: string; label: string }[] = [];

    taggedMembers: string[] = [];
    tagMemberInput = '';

    linkUrl = '';
    submitting = false;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private galleryService: GalleryService,
        private eventsService: EventsService,
        private auth: AuthService,
        private router: Router,
    ) {}

    /** Capability gate for a template action (see the spec's capability keys). */
    can(capability: string): boolean {
        return this.auth.hasCapability(capability);
    }

    ngOnInit(): void {
        this.eventsService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (events) => {
                    this.events = events.map((e) => ({ value: e.id, label: e.title }));
                },
                error: (err) => console.error('Failed to load events for tagging', err),
            });
    }

    removeFile(id: string): void {
        this.uploadedFiles = this.uploadedFiles.filter((f) => f.id !== id);
    }

    addTag(): void {
        const t = this.tagInput.trim();
        if (t && !this.tags.includes(t)) {
            this.tags.push(t);
        }
        this.tagInput = '';
    }

    removeTag(t: string): void {
        this.tags = this.tags.filter((tag) => tag !== t);
    }

    saveDraft(): void {
        // No draft endpoint on the backend — submission is a single reviewed step.
    }

    submit(): void {
        const title = this.submissionTitle.trim();
        if (!title || this.submitting) {
            return;
        }
        const isLink = this.activeTab === 'link';
        const files: GalleryFileInput[] = isLink
            ? []
            : this.uploadedFiles.map((f) => ({
                  fileName: f.filename,
                  mediaType: 'image',
                  caption: f.caption || undefined,
                  thumbnailColor: f.thumbnailColor,
              }));

        this.submitting = true;
        this.galleryService
            .submit({
                title,
                type: isLink ? 'link' : 'image',
                linkUrl: isLink ? this.linkUrl.trim() || undefined : undefined,
                eventId: this.selectedEvent || undefined,
                files: files.length ? files : undefined,
                taggedMemberIds: this.taggedMembers.length ? this.taggedMembers : undefined,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.submitting = false;
                    this.router.navigateByUrl('/admin/gallery');
                },
                error: (err) => {
                    console.error('Failed to submit to gallery', err);
                    this.submitting = false;
                },
            });
    }
}
