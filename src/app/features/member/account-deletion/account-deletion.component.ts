import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Shape of POST /members/me/deletion-request (only the token is used here). */
interface DeletionRequestResult {
    confirmToken: string;
}

@Component({
    selector: 'app-account-deletion',
    templateUrl: './account-deletion.component.html',
    styleUrls: ['./account-deletion.component.scss'],
    standalone: false,
})
export class AccountDeletionComponent {
    /** Emitted when the caller dismisses the danger zone (host closes the modal). */
    @Output() closed = new EventEmitter<void>();

    confirmText = '';
    checkbox1 = false;
    checkbox2 = false;

    exporting = false;
    submitting = false;
    done = false;
    error: string | null = null;

    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/members/me`;

    get canExecute(): boolean {
        return (
            this.confirmText === 'DELETE' &&
            this.checkbox1 &&
            this.checkbox2 &&
            !this.submitting &&
            !this.done
        );
    }

    /** GDPR data download — GET /members/me/export, saved as a JSON file. */
    downloadData(): void {
        if (this.exporting) {
            return;
        }
        this.exporting = true;
        this.error = null;
        this.http.get<Record<string, unknown>>(`${this.base}/export`).subscribe({
            next: (data) => {
                this.exporting = false;
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = 'lords-regiment-data-export.json';
                anchor.click();
                URL.revokeObjectURL(url);
            },
            error: (err) => {
                this.exporting = false;
                this.error = this.messageFrom(err, 'Could not export your data. Please try again.');
            },
        });
    }

    /**
     * Deferred deletion (GDPR): request a deletion (which returns a confirm token),
     * then immediately confirm it. The token is normally delivered out-of-band via
     * Discord re-auth; the backend returns it directly so the flow can complete here.
     */
    execute(): void {
        if (!this.canExecute) {
            return;
        }
        this.submitting = true;
        this.error = null;
        this.http
            .post<DeletionRequestResult>(`${this.base}/deletion-request`, {
                acknowledgePermanent: this.checkbox1,
                acknowledgeDataDownloaded: this.checkbox2,
            })
            .pipe(
                switchMap((res) =>
                    this.http.post(`${this.base}/deletion-request/confirm`, {
                        token: res.confirmToken,
                    }),
                ),
            )
            .subscribe({
                next: () => {
                    this.submitting = false;
                    this.done = true;
                },
                error: (err) => {
                    this.submitting = false;
                    this.error = this.messageFrom(
                        err,
                        'Could not process the discharge. Please try again.',
                    );
                },
            });
    }

    cancel(): void {
        this.closed.emit();
    }

    /** Surface the backend's user-facing message when present, else a fallback. */
    private messageFrom(err: unknown, fallback: string): string {
        const body = (err as { error?: unknown })?.error;
        const message = (body as { message?: unknown })?.message;
        if (typeof message === 'string' && message.trim()) {
            return message;
        }
        if (Array.isArray(message) && typeof message[0] === 'string') {
            return message[0];
        }
        return fallback;
    }
}
