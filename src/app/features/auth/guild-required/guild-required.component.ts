import {
    Component,
    DestroyRef,
    OnInit,
    inject,
    signal,
    ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * The guild gate (T-0261). A signed-in user who is not in the regiment's Discord
 * server keeps their session but cannot reach the dashboard, and lands here.
 *
 * It is a route rather than a modal on purpose: it is deep-linkable, survives a
 * reload, and cannot be clicked past. It deliberately renders no `hf-app-shell`
 * either — the shell's sidebar links straight back into the routes being gated.
 *
 * Nobody is parked here who is not actually gated: the flag being off, guild
 * membership, and the manage_settings exemption all send the visitor straight
 * back to wherever they were going.
 */
@Component({
    selector: 'hf-guild-required',
    standalone: false,
    templateUrl: './guild-required.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./guild-required.component.scss'],
})
export class GuildRequiredComponent implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    /** True while the "I have joined" re-check is in flight. */
    readonly checking = signal(false);

    /** Blank or absent invite ⇒ unconfigured: the CTA is hidden, the notice stands. */
    get discordInviteUrl(): string | null {
        return this.auth.guildInviteUrl();
    }

    ngOnInit(): void {
        // Reached this URL without being gated (flag off, already a member,
        // exempt, or a stale bookmark) → carry on to the real destination.
        if (!this.auth.isGuildGated()) {
            this.auth.resumeAfterGate();
        }
    }

    /**
     * Ask the API again, bypassing the client throttle, and let the user through
     * the instant the verdict flips.
     */
    recheck(): void {
        if (this.checking()) return;
        this.checking.set(true);
        this.auth
            .recheckGuildStatus()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((status) => {
                this.checking.set(false);
                if (!this.auth.isGuildGated()) {
                    this.auth.resumeAfterGate();
                    return;
                }
                // A degraded verdict is "we could not ask", not "you are not in
                // the server" — say so, or the user retries against a dead bot.
                this.toast.error(
                    status?.degraded
                        ? 'We could not reach Discord just now. Please try again in a minute.'
                        : 'We still cannot see you in the regiment Discord server. Join it, then check again.',
                );
            });
    }

    signOut(): void {
        this.auth.logout();
    }
}
