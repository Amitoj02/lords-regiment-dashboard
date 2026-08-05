import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MemberSocialLink } from '../../../core/models/social-link.model';

/**
 * The "Elsewhere" chip row — a member's linked accounts (T-0289).
 *
 * ── WHY THE DISCORD CHIP IS A SEPARATE INPUT ────────────────────────────────
 * Every other platform arrives in `links`, which comes off the PUBLIC member
 * projection and is therefore safe to render for anyone. A Discord tag is not:
 * it resolves a person to a DM-able account, so it lives on the SIGNED-IN
 * projection and only ever reaches this component when the caller had a session
 * to fetch it with. Keeping it a distinct input means the gate is expressed
 * once, in the parent, on a field that is absent rather than hidden — and it
 * makes "how does a guest see this?" answerable by reading the binding.
 *
 * It also renders differently, and has to: a Discord tag is a name, not a URL.
 * There is nowhere to send a click, so its chip is a `<span>`.
 *
 * ── ON THE BRAND COLOURS ────────────────────────────────────────────────────
 * The palette has no Twitch purple and should not grow one — these are other
 * people's brands, not our design system. They live as literals in this one
 * stylesheet, tinted onto ink so a row of seven chips reads as one row rather
 * than a paint chart.
 */
@Component({
    selector: 'hf-social-links',
    templateUrl: './social-links.component.html',
    styleUrls: ['./social-links.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class SocialLinksComponent {
    /** Public links, in the server's display order. */
    @Input() links: MemberSocialLink[] = [];

    /**
     * The member's Discord tag, or null. Pass it ONLY when the viewer is
     * entitled to it — this component does no gating of its own.
     */
    @Input() discordTag: string | null = null;

    /** `false` drops the handle text and leaves a row of marks. */
    @Input() showHandles = true;

    /** Whether there is anything at all to draw. */
    get hasAny(): boolean {
        return this.links.length > 0 || !!this.discordTag;
    }
}
