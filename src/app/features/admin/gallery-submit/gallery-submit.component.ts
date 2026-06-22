import { Component } from '@angular/core';

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
export class GallerySubmitComponent {
    activeTab: 'files' | 'link' = 'files';

    uploadedFiles: UploadedFile[] = [
        {
            id: 'f1',
            filename: 'siege_defense_01.jpg',
            size: '2.4 MB',
            caption: '',
            thumbnailColor: '#3a4a5c',
        },
        {
            id: 'f2',
            filename: 'charge_left_flank.jpg',
            size: '1.9 MB',
            caption: '',
            thumbnailColor: '#4a3a2c',
        },
        {
            id: 'f3',
            filename: 'artillery_volley.jpg',
            size: '3.1 MB',
            caption: '',
            thumbnailColor: '#2c3a2c',
        },
    ];

    submissionTitle = '';
    selectedEvent = '';
    tagInput = '';
    tags: string[] = [];

    readonly events = [
        { value: 'ev1', label: 'Grand Autumn Campaign — Line Battle' },
        { value: 'ev2', label: 'Officer Training Drill' },
        { value: 'ev3', label: 'May Grand Campaign — Final Assault' },
    ];

    taggedMembers: string[] = [];
    tagMemberInput = '';

    linkUrl = '';

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
        // No-op stub: persistence wired up when the gallery backend lands.
    }

    submit(): void {
        // No-op stub: submission wired up when the gallery backend lands.
    }
}
