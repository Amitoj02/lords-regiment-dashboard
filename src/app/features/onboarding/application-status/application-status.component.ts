import {
    Component,
    DestroyRef,
    OnInit,
    inject,
    signal,
    ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MyApplication } from '../../../core/models/application.model';
import { AuthService } from '../../../core/services/auth.service';
import { ApplicationsService } from '../../../core/services/applications.service';

/**
 * The canonical landing for a non-member who has already applied (T-0029): shows
 * their application status — pending (review within 48h), held, or declined
 * (plus a Reapply action unless an officer has blocked them). An approved
 * applicant is now a member and is sent on to the dashboard; someone with no
 * application is sent to the blank apply form.
 *
 * The only decision text this page renders is the officer's `userMessage`
 * (T-0249). It used to render `moderatorNote` and `declineReason`, which are
 * staff-only — they are not on {@link MyApplication} at all any more, so the
 * template cannot bind them back by accident.
 */
@Component({
    selector: 'hf-application-status',
    templateUrl: './application-status.component.html',
    styleUrls: ['./application-status.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class ApplicationStatusComponent implements OnInit {
    private readonly applications = inject(ApplicationsService);
    private readonly router = inject(Router);
    private readonly auth = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly mine = signal<MyApplication | null>(null);

    ngOnInit(): void {
        this.applications
            .getMine()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (mine) => {
                    this.loading.set(false);
                    // Approved → the applicant is now a member; move them on.
                    if (mine.application?.status === 'approved') {
                        // An approved applicant is a member now, and members belong on the public
                        // site — the dashboard is staff-only (T-0287).
                        this.router.navigateByUrl(this.auth.myProfilePath());
                        return;
                    }
                    // Nothing on record and not blocked → start the apply flow.
                    if (!mine.application && !mine.blocked) {
                        this.router.navigateByUrl('/onboarding/apply');
                        return;
                    }
                    this.mine.set(mine);
                },
                error: () => {
                    this.loading.set(false);
                    this.error.set('We could not load your application status. Please try again.');
                },
            });
    }

    get application() {
        return this.mine()?.application ?? null;
    }
    get blocked(): boolean {
        return this.mine()?.blocked ?? false;
    }
    /** A declined applicant may reapply unless an officer has blocked them. */
    get canReapply(): boolean {
        return !this.blocked && this.application?.status === 'declined';
    }

    /** Edit a still-pending application (re-opens the form pre-filled). */
    editApplication(): void {
        void this.router.navigate(['/onboarding/apply'], { queryParams: { edit: 1 } });
    }

    /** Reapply after a decline (a fresh blank application). */
    reapply(): void {
        void this.router.navigate(['/onboarding/apply']);
    }
}
