import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-event-create',
    templateUrl: './event-create.component.html',
    styleUrls: ['./event-create.component.scss'],
    standalone: false,
})
export class EventCreateComponent {
    form: FormGroup;
    showPassword = false;

    readonly notifyOptions = ['15 minutes', '30 minutes', '1 hour', '2 hours', '1 day'];
    selectedNotify: string[] = ['1 hour'];

    tagInput = '';
    tags: string[] = ['line-battle'];

    readonly platformOptions = [
        { id: 'steam', label: 'Steam' },
        { id: 'xbox', label: 'Xbox' },
        { id: 'ps', label: 'PlayStation' },
    ];
    selectedPlatforms: string[] = ['steam'];

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            title: ['', Validators.required],
            orders: [''],
            date: ['', Validators.required],
            startTime: ['19:30'],
            endTime: ['22:00'],
            timezone: ['UTC'],
            recurring: [false],
            serverName: [''],
            serverPassword: [''],
        });
    }

    toggleNotify(n: string): void {
        const idx = this.selectedNotify.indexOf(n);
        if (idx === -1) {
            this.selectedNotify.push(n);
        } else {
            this.selectedNotify.splice(idx, 1);
        }
    }

    isNotifySelected(n: string): boolean {
        return this.selectedNotify.includes(n);
    }

    togglePlatform(p: string): void {
        const idx = this.selectedPlatforms.indexOf(p);
        if (idx === -1) {
            this.selectedPlatforms.push(p);
        } else {
            this.selectedPlatforms.splice(idx, 1);
        }
    }

    isPlatformSelected(p: string): boolean {
        return this.selectedPlatforms.includes(p);
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
        // TODO: save as draft
    }

    publish(): void {
        if (this.form.valid) {
            // TODO: publish event
        }
    }
}
