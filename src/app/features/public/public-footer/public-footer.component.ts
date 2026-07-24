import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { RegimentService } from '../../../core/services/regiment.service';

@Component({
    selector: 'hf-public-footer',
    templateUrl: './public-footer.component.html',
    styleUrls: ['./public-footer.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class PublicFooterComponent implements OnInit {
    private readonly regiment = inject(RegimentService);
    private readonly destroyRef = inject(DestroyRef);

    currentYear = new Date().getFullYear();

    /**
     * The regiment's configured Discord invite (T-0234). Null until GET /regiment
     * lands, and null forever if no invite is configured — the "Discord Server"
     * link is then dropped from the Join column rather than rendered dead.
     */
    discordInviteUrl: string | null = null;

    ngOnInit(): void {
        // The footer renders on every public page; a failed profile fetch just
        // means no invite link, never a broken footer.
        this.regiment
            .getProfile()
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((profile) => {
                this.discordInviteUrl = profile?.discordInviteUrl?.trim() || null;
            });
    }
}
