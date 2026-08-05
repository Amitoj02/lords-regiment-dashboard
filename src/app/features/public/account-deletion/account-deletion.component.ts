import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';
import { environment } from '../../../../environments/environment';

/** Shape of POST /members/me/deletion-request (only the token is used here). */
interface DeletionRequestResult {
    confirmToken: string;
}

@Component({
    selector: 'app-account-deletion',
    templateUrl: './account-deletion.component.html',
    styleUrls: ['./account-deletion.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class AccountDeletionComponent implements OnInit {
    confirmText = '';
    checkbox1 = false;
    checkbox2 = false;

    exporting = false;
    submitting = false;
    done = false;
    error: string | null = null;

    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly seo = inject(SeoService);
    private readonly base = `${environment.apiBaseUrl}/members/me`;

    ngOnInit(): void {
        // Signed-in, single-member, and destructive. Nobody should ever arrive
        // here from a search result.
        this.seo.apply({
            title: 'Discharge & Account Deletion',
            description: 'Export your data or permanently delete your regiment account.',
            noIndex: true,
        });
    }

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
     * Deferred deletion (GDPR): run the full request → confirm → execute chain.
     * `request` returns a confirm token (normally delivered out-of-band via Discord
     * re-auth, returned directly here); `confirm` re-authorises the request and
     * `execute` performs the terminal soft-delete + PII anonymisation.
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
                switchMap(() => this.http.post(`${this.base}/deletion-request/execute`, {})),
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

    /**
     * Leave without deleting.
     *
     * Explicitly /account rather than `Location.back()`: this page is now
     * reachable by URL from outside the app (a link in a Discord DM, a bookmark),
     * and "back" from a cold entry is whatever the browser was showing before
     * this site — or nothing at all.
     */
    cancel(): void {
        void this.router.navigateByUrl('/account');
    }

    /** Sign out after a completed deletion (the account is now anonymised). */
    finish(): void {
        this.auth.logout();
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
