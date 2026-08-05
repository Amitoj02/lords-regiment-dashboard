import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { RegimentEvent } from '../../../core/models/event.model';
import { GalleryItem } from '../../../core/models/gallery.model';
import { Member, canOpenAdminActions } from '../../../core/models/member.model';
import { PublicMember, publicHandle } from '../../../core/models/public-member.model';
import { MemberSocialLink } from '../../../core/models/social-link.model';
import { AuthService } from '../../../core/services/auth.service';
import { MembersService, ServiceRecordEntry } from '../../../core/services/members.service';
import { PublicMembersService } from '../../../core/services/public-members.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { SeoImage, SeoService } from '../../../core/services/seo.service';

/**
 * The segments on the right-hand column (T-0289). Only `gallery` is public.
 *
 * `activity` replaced the old separate `events` and `rsvps` tabs. They were two
 * controls over one question — "what has this member been to" — differing only
 * in tense, and a member with three RSVPs and forty attendances got two tabs
 * where one was almost always empty. `record` was a fourth panel stacked under
 * whichever tab was open, so the column's length depended on a control that had
 * nothing to do with it; it is a segment now.
 */
export type ProfileTab = 'gallery' | 'activity' | 'record';

/**
 * One row in the merged Activity list. An RSVP and an attendance are the same
 * event seen from either side of its start time, so they share a shape and are
 * told apart by `status` alone.
 */
export interface ProfileActivityEntry {
    id: string;
    date: string;
    title: string;
    serverName: string | null;
    status: string;
    /** Badge variant: brass for a commitment, laurel for a completed one. */
    variant: 'brass' | 'laurel';
}

/** Why the page has no member to render. */
export type ProfileError = 'not-found' | 'gone' | 'unavailable';

/** Fallback regiment name — the same string the crawler shell falls back to. */
const DEFAULT_REGIMENT_NAME = 'Lords Regiment';

/**
 * The PUBLIC member profile (T-0287), at `/u/:handle` and at `/me`.
 *
 * ── ANONYMOUS BODY, SIGNED-IN ENRICHMENT ────────────────────────────────────
 * The page body is `PublicMember` — the projection an anonymous visitor and a
 * search engine may read, identical for every caller and therefore cacheable at
 * the edge. Everything that varies per viewer (the Discord tag, last access,
 * event history, RSVPs, the service record, the admin actions block) is a
 * SEPARATE fetch made only when there is a session to make it with.
 *
 * That split is load-bearing, not stylistic: every authenticated call from this
 * component sits behind `auth.isAuthenticated()`, because a 401 fired from a
 * page an anonymous reader can open is a real bug — it drops whatever session
 * state exists and, until the interceptor was scoped to `/app`, ejected the
 * reader to a sign-in form they never asked for.
 */
@Component({
    selector: 'hf-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class ProfileComponent implements OnInit {
    /** The public body. Everything the template renders unconditionally. */
    member: PublicMember | null = null;
    /**
     * The signed-in-only projection of the SAME member, or null when nobody is
     * signed in — or when the caller holds no `view_members_directory` and the
     * API refused. Absent means "show the public page", never "show a blank
     * row": every extra is gated on this object existing.
     */
    enriched: Member | null = null;

    galleryItems: GalleryItem[] = [];
    eventHistory: RegimentEvent[] = [];
    rsvps: RegimentEvent[] = [];
    serviceRecord: ServiceRecordEntry[] = [];
    activeTab: ProfileTab = 'gallery';

    isOwnProfile = false;
    /** The Service Record gate — self, or the capability the API itself checks. */
    canViewPrivate = false;

    loading = true;
    /** Non-null when there is no member to show; drives the whole error panel. */
    errorKind: ProfileError | null = null;

    /** The target of the admin-action modal (null = closed). */
    adminTarget: Member | null = null;

    /** Full-size avatar viewer (T-0122). */
    viewerOpen = false;

    /** Used in the SEO copy + the JSON-LD `memberOf`, so the two surfaces agree. */
    regimentName = DEFAULT_REGIMENT_NAME;

    readonly auth = inject(AuthService);

    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly publicMembers = inject(PublicMembersService);
    private readonly members = inject(MembersService);
    private readonly regiment = inject(RegimentService);
    private readonly seo = inject(SeoService);

    private readonly maxGalleryItems = 6;
    /** Monotonic token so a prior navigation's late responses can't overwrite the
     * current member's data when routing quickly between profiles (T-0165). */
    private loadToken = 0;

    ngOnInit(): void {
        // Angular reuses this instance across /u/:handle navigations (and between
        // /me and /u/:handle, which share it), so the handle is read on every
        // param change rather than once — otherwise the previous member lingers.
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            this.load(params.get('handle'));
        });

        // The regiment name is navigation-independent, so it is fetched once and
        // folded into the metadata whenever it arrives. Anonymous endpoint.
        this.regiment
            .getProfile()
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((profile) => {
                this.regimentName = profile?.name?.trim() || DEFAULT_REGIMENT_NAME;
                if (this.member) {
                    this.applySeo(this.member);
                }
            });
    }

    // ── Loading ──────────────────────────────────────────────────────────────

    /**
     * `routeHandle` is the `/u/:handle` segment — `@name` or a 12-char short id.
     * On `/me` there is no param at all and the caller resolves themselves.
     */
    private load(routeHandle: string | null): void {
        const handle = routeHandle ?? this.ownHandle();

        // The canonical rewrite below re-enters this subscription with the SAME
        // member addressed a different way (short id → handle, /me → /u/@name).
        // Re-fetching there would be a second round trip for a page already on
        // screen, and a visible flash of the loading state on top of it.
        if (handle && this.addressesLoadedMember(handle)) {
            return;
        }

        const token = ++this.loadToken;

        this.member = null;
        this.enriched = null;
        this.galleryItems = [];
        this.eventHistory = [];
        this.rsvps = [];
        this.serviceRecord = [];
        this.activeTab = 'gallery';
        this.adminTarget = null;
        this.viewerOpen = false;
        this.isOwnProfile = false;
        this.canViewPrivate = false;
        this.errorKind = null;
        this.loading = true;

        if (!handle) {
            // /me without a session, or a session with no id to resolve.
            this.loading = false;
            this.fail('not-found');
            return;
        }

        this.publicMembers
            .getProfile(handle)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (member) => {
                    if (token !== this.loadToken) {
                        return;
                    }
                    this.loading = false;
                    this.member = member;
                    this.onMemberLoaded(member, token, routeHandle);
                },
                error: (err: unknown) => {
                    if (token !== this.loadToken) {
                        return;
                    }
                    this.loading = false;
                    this.fail(this.errorKindFor(err));
                },
            });
    }

    /**
     * 410 is the ONE case the API distinguishes: the account was deleted.
     * Everything else — banned, suspended, applicant, never existed — it refuses
     * to tell apart on purpose (see the backend's `assertNotGone`), so neither
     * does this page. A transport failure is neither of those and must not be
     * reported as "no such member".
     */
    private errorKindFor(err: unknown): ProfileError {
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        if (status === 410) {
            return 'gone';
        }
        return status === 404 ? 'not-found' : 'unavailable';
    }

    private onMemberLoaded(member: PublicMember, token: number, routeHandle: string | null): void {
        const currentUser = this.auth.currentUser();
        this.isOwnProfile = !!currentUser && currentUser.id === member.id;
        // Mirrors the server's own rule for GET /members/:id/service-record:
        // yourself, or `view_audit_log`. A role check would be a second copy of
        // a per-regiment, admin-editable matrix, and copies drift.
        this.canViewPrivate = this.isOwnProfile || this.auth.hasCapability('view_audit_log');

        this.applySeo(member);
        this.syncCanonicalUrl(member, routeHandle);

        const handle = this.handleFor(member);

        // Public — the gallery tab is readable signed out, like the page it's on.
        this.publicMembers
            .getGallery(handle, this.maxGalleryItems)
            .pipe(
                catchError(() => of<GalleryItem[]>([])),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((items) => {
                if (token === this.loadToken) {
                    this.galleryItems = items;
                }
            });

        if (this.auth.isAuthenticated()) {
            this.loadSignedInExtras(member, token);
        }
    }

    /**
     * Everything behind a session. Each call swallows its own failure: a signed-in
     * caller without `view_members_directory` (an applicant, or a regiment that
     * narrowed the matrix) gets a 403 here, and the correct answer to that is the
     * public page they would have seen anyway — not an error.
     */
    private loadSignedInExtras(member: PublicMember, token: number): void {
        this.members
            .getById(member.id)
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((enriched) => {
                if (token === this.loadToken) {
                    this.enriched = enriched;
                }
            });

        this.members
            .getEvents(member.id)
            .pipe(
                catchError(() => of<RegimentEvent[]>([])),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((events) => {
                if (token === this.loadToken) {
                    this.eventHistory = events;
                }
            });

        this.members
            .getRsvps(member.id)
            .pipe(
                catchError(() => of<RegimentEvent[]>([])),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((events) => {
                if (token === this.loadToken) {
                    this.rsvps = events;
                }
            });

        if (this.canViewPrivate) {
            this.members
                .getServiceRecord(member.id)
                .pipe(
                    catchError(() => of<ServiceRecordEntry[]>([])),
                    takeUntilDestroyed(this.destroyRef),
                )
                .subscribe((entries) => {
                    if (token === this.loadToken) {
                        this.serviceRecord = entries;
                    }
                });
        }
    }

    private fail(kind: ProfileError): void {
        this.errorKind = kind;
        this.seo.apply({
            title: this.errorTitle,
            description: this.errorBody,
            // A page that resolves to nobody must not be indexed — but its links
            // (back to the roster) are still worth following.
            noIndex: true,
        });
    }

    // ── Addressing ───────────────────────────────────────────────────────────

    /** The caller's own `/u/:handle` segment, or null when signed out. */
    private ownHandle(): string | null {
        const user = this.auth.currentUser();
        if (!user) {
            return null;
        }
        return user.username ? `@${user.username}` : user.id;
    }

    /** The segment that addresses `member`, preferring the handle as the API does. */
    private handleFor(member: PublicMember): string {
        return member.username ? `@${member.username}` : member.id;
    }

    /** True when `handle` names the member already on screen, in either form. */
    private addressesLoadedMember(handle: string): boolean {
        const member = this.member;
        if (!member) {
            return false;
        }
        const decoded = decodeURIComponent(handle);
        if (decoded.startsWith('@')) {
            return !!member.username && decoded.slice(1).toLowerCase() === member.username;
        }
        // Short ids are base62 — case is significant, unlike a handle.
        return decoded === member.id;
    }

    /**
     * Put the reader on the member's canonical URL.
     *
     * A member is addressable by short id forever, so a link posted before they
     * claimed `@panda` still resolves — but leaving the reader there would leave
     * two live URLs for one page competing to be indexed, and would show a
     * vanity handle in the header above a URL that doesn't mention it.
     * `replaceUrl` because the short-id URL is not somewhere the back button
     * should be able to return to.
     *
     * `/me` is exempt, and deliberately so. It carries no `:handle` to be wrong
     * about, it is authGuard-only and therefore never crawled, and the
     * `rel=canonical` this page emits already points a crawler at the vanity
     * URL. Rewriting it would also be the expensive kind of rewrite: `/me` and
     * `/u/:handle` are separate route definitions, so the router tears this
     * component down between them and every fetch on the page runs a second
     * time — where a `/u/:handle` rewrite re-enters the same instance and is
     * caught by the guard in `load()`. And a member who has not claimed a handle
     * would simply be moved onto their short id, which is the worse URL of the
     * two.
     */
    private syncCanonicalUrl(member: PublicMember, routeHandle: string | null): void {
        if (routeHandle === null || member.canonicalPath === `/u/${routeHandle}`) {
            return;
        }
        void this.router.navigate([member.canonicalPath], { replaceUrl: true });
    }

    // ── Metadata ─────────────────────────────────────────────────────────────

    /**
     * Title, description, canonical, card image and JSON-LD.
     *
     * Every value here mirrors what the crawler shell emits for the same member
     * (backend `SeoService.renderProfile`). Googlebot renders this page on a
     * second pass and compares it with the shell it was served first; a
     * disagreement between the two is what makes dynamic rendering look like
     * cloaking, so the display name, the description and the Person payload are
     * all built the same way on both sides.
     */
    private applySeo(member: PublicMember): void {
        const canonicalUrl = this.absolute(member.canonicalPath);
        const image = this.absolute(member.avatarUrl);
        const handleLabel = publicHandle(member);
        const name = this.displayName(member);

        this.seo.apply({
            title: name,
            description: this.describe(member),
            canonicalPath: member.canonicalPath,
            imageUrl: this.cardImage(member, name),
            type: 'profile',
            jsonLd: {
                '@context': 'https://schema.org',
                '@type': 'ProfilePage',
                url: canonicalUrl,
                ...(member.joinedAt ? { dateCreated: member.joinedAt } : {}),
                mainEntity: {
                    '@type': 'Person',
                    name,
                    alternateName: handleLabel ?? member.inGameName,
                    identifier: member.id,
                    url: canonicalUrl,
                    ...(member.bio?.trim() ? { description: member.bio.trim() } : {}),
                    ...(image ? { image } : {}),
                    ...(member.rank ? { jobTitle: member.rank } : {}),
                    memberOf: {
                        '@type': 'Organization',
                        name: this.regimentName,
                        url: this.absolute('/'),
                    },
                    ...(member.medals.length
                        ? { award: member.medals.map((medal) => medal.title) }
                        : {}),
                },
            },
        });
    }

    /**
     * The image a shared profile link previews as (T-0293).
     *
     * The BANNER when the member has set one — it is landscape, so it fills the
     * wide card. Otherwise the avatar, declared `square` so the card degrades
     * deliberately to the thumbnail-beside-the-text layout instead of being
     * demoted into it: Discord inspects the real file and demotes a square image
     * whatever the tag claims, and a card that asked for the wide layout and did
     * not get it looks broken in a way the thumbnail does not.
     *
     * The same choice, in the same order, as `SeoService.profileCardImage` in
     * the API — this is the tag a crawler compares against the shell's.
     */
    private cardImage(member: PublicMember, name: string): SeoImage | null {
        if (member.bannerUrl) return { url: member.bannerUrl, alt: name };
        if (member.avatarUrl) return { url: member.avatarUrl, alt: name, shape: 'square' };
        return null;
    }

    /** "Jameson Nolt (@panda)" — the handle is what the URL says, so it leads. */
    private displayName(member: PublicMember): string {
        return member.username ? `${member.inGameName} (@${member.username})` : member.inGameName;
    }

    private describe(member: PublicMember): string {
        const parts = [
            member.rank
                ? `${member.rank} in ${this.regimentName}`
                : `Member of ${this.regimentName}`,
            member.medals.length === 1 ? '1 decoration' : `${member.medals.length} decorations`,
            `${member.eventsAttended} events attended`,
        ];
        if (member.joinedAt) {
            parts.push(`serving since ${this.longDate(member.joinedAt)}`);
        }
        return `${parts.join(' · ')}.`;
    }

    /** en-GB long form in UTC — byte-identical to the crawler shell's dates. */
    private longDate(iso: string): string {
        return new Date(iso).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
        });
    }

    private absolute(pathOrUrl: string | null): string | null {
        if (!pathOrUrl) {
            return null;
        }
        if (/^https?:\/\//i.test(pathOrUrl)) {
            return pathOrUrl;
        }
        const origin = this.document.location?.origin ?? '';
        return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
    }

    // ── Template helpers ─────────────────────────────────────────────────────

    /** The `@handle` label, or null when the member never claimed one. */
    get handleLabel(): string | null {
        return this.member ? publicHandle(this.member) : null;
    }

    get errorTitle(): string {
        switch (this.errorKind) {
            case 'gone':
                return 'No longer with the regiment';
            case 'unavailable':
                return 'Profile unavailable';
            default:
                return 'Member not found';
        }
    }

    get errorBody(): string {
        switch (this.errorKind) {
            case 'gone':
                return 'This account has been deleted. The profile that used to be here is gone for good.';
            case 'unavailable':
                return 'We could not load this profile just now. Please try again in a moment.';
            default:
                return 'No member answers to this address. They may have changed their handle, or never had one here.';
        }
    }

    setTab(tab: ProfileTab): void {
        this.activeTab = tab;
    }

    /**
     * Which segments to draw. `record` is the only one that can be absent
     * outright: it is not "locked" for a reader who may not see it, it does not
     * exist for them, because unlike attendance there is nothing to promise
     * behind a sign-in — a stranger will never be shown someone's disciplinary
     * timeline, so a padlock would be a lie about what signing in buys.
     */
    get visibleTabs(): ProfileTab[] {
        return this.canViewPrivate ? ['gallery', 'activity', 'record'] : ['gallery', 'activity'];
    }

    tabLabel(tab: ProfileTab): string {
        switch (tab) {
            case 'activity':
                return 'Activity';
            case 'record':
                return 'Service record';
            default:
                return 'Gallery';
        }
    }

    /**
     * Activity is a signed-in surface, but the segment still renders for a
     * signed-out reader with a lock on it. Hiding it outright would show a
     * crawler a different set of controls than a member sees — a visibly locked
     * segment says the same thing to both.
     */
    tabLocked(tab: ProfileTab): boolean {
        // Enrolment, not merely a session (T-0287). The events and RSVP
        // endpoints behind this segment carry
        // @RequireCapability(view_members_directory), which an Applicant does
        // not hold — unlocking it for anyone signed in gave that person a
        // segment that 403s into a permanently empty list, with the "nothing
        // recorded" copy implying the member has never attended anything.
        return tab === 'activity' && !this.auth.isMember();
    }

    /**
     * RSVPs and attendances, merged and ordered as one timeline (T-0289).
     *
     * Deduplicated by event id with the attendance winning: RSVPing to a battle
     * and then turning up to it is one event, and listing it twice — once as a
     * promise, once as a fact — reads as two.
     */
    get activity(): ProfileActivityEntry[] {
        const byId = new Map<string, ProfileActivityEntry>();

        for (const event of this.rsvps) {
            byId.set(event.id, {
                id: event.id,
                date: event.date,
                title: event.title,
                serverName: event.hasServerName ? (event.serverName ?? null) : null,
                status: event.status === 'previous' ? 'Past' : 'Going',
                variant: 'brass',
            });
        }

        for (const event of this.eventHistory) {
            byId.set(event.id, {
                id: event.id,
                date: event.date,
                title: event.title,
                serverName: event.hasServerName ? (event.serverName ?? null) : null,
                status: 'Attended',
                variant: 'laurel',
            });
        }

        // Most recent first — an upcoming commitment sorts above a past one for
        // free, which is the order a reader scanning "what are they up to" wants.
        return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
    }

    /** The member's own prose, or null. Public — it is theirs to publish. */
    get bio(): string | null {
        return this.member?.bio?.trim() || null;
    }

    /** Public linked accounts. Never Discord — see {@link discordTag}. */
    get socialLinks(): MemberSocialLink[] {
        return this.member?.socialLinks ?? [];
    }

    /**
     * The Discord tag, or null for anyone not entitled to it. It comes off the
     * ENRICHED projection, which an anonymous reader never receives — so this is
     * null for a guest because the field was never sent, not because a template
     * hid it.
     */
    get discordTag(): string | null {
        return this.enriched?.discordTag?.trim() || null;
    }

    /** Send the reader back here once they have signed in. */
    rememberReturn(): void {
        this.auth.stashReturnUrl(this.router.url);
    }

    get canOpenViewer(): boolean {
        return !!this.member?.avatarUrl;
    }

    openViewer(): void {
        if (this.canOpenViewer) {
            this.viewerOpen = true;
        }
    }

    closeViewer(): void {
        this.viewerOpen = false;
    }

    /**
     * Whether the "Admin Actions" trigger shows (T-0266). Gated on the ENRICHED
     * member: `permittedActions` is computed by the server from the caller, so it
     * is absent from the public projection by design — and an absent block reads
     * as "nothing permitted", which is exactly right for an anonymous reader.
     */
    get canAdminAct(): boolean {
        return canOpenAdminActions(this.enriched, (capability) =>
            this.auth.hasCapability(capability),
        );
    }

    openAdminActions(): void {
        if (!this.canAdminAct) {
            return;
        }
        this.adminTarget = this.enriched;
    }

    /**
     * An admin action landed. The modal answers with the authenticated
     * projection, so the public body is refreshed from it field by field —
     * a rank change or a new medal must show in the header and the honours
     * panel immediately, and those read from `member`, not `enriched`.
     */
    onMemberUpdated(updated: Member): void {
        this.enriched = updated;
        if (!this.member) {
            return;
        }
        this.member = {
            ...this.member,
            role: updated.role,
            rank: updated.rank || null,
            rankImageUrl: updated.rankImageUrl ?? null,
            medals: (updated.medalAwards ?? []).map((award) => ({
                id: award.id,
                medalId: award.medalId,
                title: award.title,
                glyph: award.glyph,
                imageUrl: award.imageUrl ?? null,
                // The catalogue criteria, never `detail` — the per-award citation
                // is staff prose and is not public (backend PublicMemberMedalDto).
                description: award.description ?? null,
                awardedAt: award.awardedAt,
            })),
        };
    }

    getRoleClass(role: string): string {
        switch (role) {
            case 'Owner':
                return 'brass';
            case 'Admin':
                return 'ox';
            case 'Moderator':
                return 'blue';
            default:
                return 'parch';
        }
    }

    /**
     * Colour-code a service-record entry (dot + type tag) by its type. The
     * backend writes promotion/demotion/role/award/suspension/ban from
     * MembersService.addServiceRecord, plus 'enlistment' when an application is
     * approved.
     *
     * Every branch MUST return a class. The old `default: return ''` left the dot
     * on `.timeline-dot`'s inherited brass, pixel-identical to `.is-rank` — which
     * is why 'enlistment' (absent from this switch, and the first entry on every
     * member's timeline) has been rendering as a promotion. Unrecognised types
     * now read neutrally instead of claiming a rank change happened (T-0253).
     */
    serviceEntryClass(type: string): string {
        switch (type) {
            case 'promotion':
            case 'rank':
                return 'is-rank';
            case 'demotion':
                return 'is-demotion';
            case 'role':
                return 'is-role';
            case 'award':
            case 'medal':
                return 'is-medal';
            case 'suspension':
            case 'ban':
                return 'is-suspension';
            // 'enlistment' is a known type deliberately rendered neutrally — it
            // shares the fallback so a new backend type is never mis-coloured.
            case 'enlistment':
            default:
                return 'is-neutral';
        }
    }
}
