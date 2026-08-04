import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import {
    Member,
    canOpenAdminActions,
    deriveMemberStatus,
    statusTooltip,
    statusVariant,
} from '../../../core/models/member.model';
import { PublicMember } from '../../../core/models/public-member.model';
import { AuthService } from '../../../core/services/auth.service';
import { MembersService } from '../../../core/services/members.service';
import {
    PUBLIC_ROSTER_PAGE_SIZE,
    PublicMembersService,
    PublicRosterPage,
    PublicRosterQuery,
} from '../../../core/services/public-members.service';
import { SeoService } from '../../../core/services/seo.service';

/** One entry of the rank filter. The API filters on the ID, not the name. */
export interface RosterRankOption {
    id: string;
    name: string;
}

/** Long enough that a typist is not fetching per keystroke, short enough to feel live. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * The PUBLIC roster at /roster (T-0287).
 *
 * ── TWO SOURCES, ONE TABLE ──────────────────────────────────────────────────
 * The body of every row comes from `/api/public/members`, which returns the
 * anonymous projection and is identical for every caller — that is what makes
 * it cacheable at the edge and what keeps a signed-out visitor from ever
 * triggering a 401.
 *
 * A signed-in viewer additionally gets the authenticated roster once, keyed by
 * id, purely to fill in what the public projection deliberately omits: the
 * Discord tag, the derived status pill, last-seen, and the per-row
 * `permittedActions` that decide whether the admin `···` appears. If that call
 * fails the map stays empty and the page degrades to exactly what a visitor
 * sees — a member whose session expired mid-browse still gets to read the
 * roster.
 *
 * ── WHY EVERY ROW CARRIES A REAL ANCHOR ─────────────────────────────────────
 * This page is the entire link graph into `/u/:handle`. The row used to be a
 * `<tr role="button">` with a click handler, which no crawler can follow and no
 * middle-click can open, so the profiles were reachable only by knowing their
 * URL. The anchor in the member cell IS the navigation now; the row click is a
 * mouse convenience layered over it.
 */
@Component({
    selector: 'hf-roster',
    templateUrl: './roster.component.html',
    styleUrls: ['./roster.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class RosterComponent implements OnInit {
    /** The current page of the PUBLIC projection — the body of the table. */
    members: PublicMember[] = [];

    /** The member whose admin-action modal is open (null = closed). */
    selectedMember: Member | null = null;

    loading = true;
    /** The last roster request failed. Rows already on screen are kept. */
    error = false;
    /** A page has landed at least once, so the table can stay up while we refetch. */
    hasLoaded = false;

    // ── Server-side paging + filtering ───────────────────────────────────────
    // All three go to the API as query params. They used to be applied in the
    // browser over a single `?limit=100` fetch, with a decorative pagination bar
    // underneath that always read "Showing 1–N of N" — so a regiment of more
    // than 100 members silently lost the tail, and the roster is now the page
    // most likely to be linked to from outside.
    page = 1;
    readonly pageSize = PUBLIC_ROSTER_PAGE_SIZE;
    total = 0;
    hasPrev = false;
    hasNext = false;

    /** Raw search box value. The term actually applied is {@link appliedSearch}. */
    searchQuery = '';
    /** Selected rank id, or '' for all. Applied immediately — no debounce on a select. */
    filterRankId = '';

    /** Ranks offered in the filter, in ladder order. See {@link deriveRankOptions}. */
    rankOptions: RosterRankOption[] = [];

    // Pure status-derivation helpers (T-0184). They read the AUTHENTICATED
    // member, so every call site sits behind a signed-in gate.
    readonly deriveStatus = deriveMemberStatus;
    readonly statusVariant = statusVariant;
    readonly statusTooltip = statusTooltip;

    private readonly destroyRef = inject(DestroyRef);
    private readonly seo = inject(SeoService);
    private readonly document = inject(DOCUMENT);

    /** Signed-in-only enrichment, keyed by member id. Empty when signed out. */
    private enrichment = new Map<string, Member>();

    /** The search term currently reflected in `members` (trimmed). */
    private appliedSearch = '';

    /** Roster fetches. `switchMap` so a fast Next/Next cannot land out of order. */
    private readonly request$ = new Subject<PublicRosterQuery>();
    /** Raw keystrokes, debounced before any of them becomes a request. */
    private readonly searchInput$ = new Subject<string>();

    constructor(
        private publicMembers: PublicMembersService,
        private membersService: MembersService,
        protected auth: AuthService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        this.request$
            .pipe(
                tap(() => {
                    this.loading = true;
                    this.error = false;
                }),
                switchMap((query) =>
                    this.publicMembers.getRoster(query).pipe(
                        catchError(() => {
                            this.error = true;
                            return of(null);
                        }),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                this.loading = false;
                if (result) {
                    this.applyPage(result);
                }
            });

        // Only the TEXT box is debounced. Paging and the rank select are single
        // deliberate acts, and putting them behind the same 300ms made "Next"
        // feel broken — the control you just pressed sat inert for a third of a
        // second before anything moved.
        this.searchInput$
            .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
            .subscribe((raw) => {
                // Strip the sigil the roster itself renders: every row shows
                // "@panda", so that is what people copy into the box — and the
                // API stores handles without it, so the search found nothing and
                // read as "that member is not on the roster".
                const term = raw.trim().replace(/^@+/, '');
                // The box can settle back on what is already applied — type then
                // undo, or clear the filters while a keystroke is still pending.
                if (term === this.appliedSearch) {
                    return;
                }
                this.appliedSearch = term;
                this.load(1);
            });

        this.loadEnrichment();
        // Tags before the fetch, so a navigation onto this route never leaves the
        // previous page's title and canonical in the document.
        this.applySeo();
        this.load(1);
    }

    // ── Loading ──────────────────────────────────────────────────────────────

    private load(page: number): void {
        this.request$.next({
            page,
            limit: this.pageSize,
            search: this.appliedSearch || undefined,
            rankId: this.filterRankId || undefined,
        });
    }

    private applyPage(result: PublicRosterPage): void {
        this.members = result.members;
        this.total = result.total;
        this.page = result.page;
        this.hasPrev = result.hasPrev;
        this.hasNext = result.hasNext;
        this.hasLoaded = true;
        // Re-applied per page: the description carries the member count and the
        // ItemList names the members actually on screen.
        this.applySeo();
    }

    /** Re-issue the current page after a failure. */
    retry(): void {
        this.load(this.page);
    }

    /**
     * The signed-in extras. One authenticated call, once — and never on the
     * anonymous path, because a 401 from a public page is a real bug: the JWT
     * interceptor reads one as a dead session and ejects the visitor to /login.
     */
    private loadEnrichment(): void {
        if (!this.auth.isAuthenticated()) return;
        this.membersService
            .getAll()
            .pipe(
                catchError(() => of([] as Member[])),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((rows) => {
                this.enrichment = new Map(rows.map((m) => [m.id, m]));
                this.rankOptions = this.deriveRankOptions(rows);
            });
    }

    /**
     * The rank filter's options, taken from the authenticated roster.
     *
     * ⚠️ SIGNED-IN ONLY, and not by preference. `GET /api/public/members` filters
     * on `rankId`; the anonymous projection carries the rank NAME and no id, and
     * `GET /api/ranks` is authenticated — so there is no anonymous route to a
     * rank id at all. Rather than offer a control that cannot be honoured, the
     * select is simply absent for a visitor (`rankOptions` stays empty). Widening
     * this needs the API to publish rank ids on the public projection first.
     *
     * Derived from the whole authenticated roster rather than from the page on
     * screen, so the list is the same on page 1 and page 4. That roster arrives
     * ordered by rank precedence, so first-seen order is ladder order and nothing
     * here has to re-sort.
     */
    private deriveRankOptions(rows: Member[]): RosterRankOption[] {
        const seen = new Map<string, string>();
        for (const row of rows) {
            if (row.rankId && row.rank && !seen.has(row.rankId)) {
                seen.set(row.rankId, row.rank);
            }
        }
        return Array.from(seen, ([id, name]) => ({ id, name }));
    }

    // ── Filters + paging ─────────────────────────────────────────────────────

    onSearchInput(value: string): void {
        this.searchInput$.next(value);
    }

    /** The rank select: one deliberate act, applied at once and back to page 1. */
    onRankChange(): void {
        this.load(1);
    }

    clearFilters(): void {
        this.searchQuery = '';
        this.appliedSearch = '';
        this.filterRankId = '';
        // Collapses any keystroke still inside the debounce window onto the term
        // we are about to apply, so it lands on the equality guard rather than
        // re-fetching the page we are already asking for.
        this.searchInput$.next('');
        this.load(1);
    }

    get hasActiveFilters(): boolean {
        return !!this.searchQuery || !!this.filterRankId;
    }

    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages || page === this.page || this.loading) return;
        this.load(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    get firstShown(): number {
        return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
    }

    get lastShown(): number {
        return Math.min(this.page * this.pageSize, this.total);
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
    }

    // ── Signed-in extras ─────────────────────────────────────────────────────

    /** The authenticated row for a member, or null when we hold none. */
    enriched(member: PublicMember): Member | null {
        return this.enrichment.get(member.id) ?? null;
    }

    /** Last seen is signed-in only, by decision — it is a live activity trail. */
    lastSeenFor(member: PublicMember): string | null {
        const row = this.enriched(member);
        return row ? this.formatLastSeen(row.lastSeen) : null;
    }

    /** The Discord tag never appears publicly — it is DM-able identity. */
    discordTagFor(member: PublicMember): string | null {
        return this.enriched(member)?.discordTag || null;
    }

    // ── Admin actions (signed-in staff only) ─────────────────────────────────

    /**
     * Whether the caller may open the admin-action modal on THIS row (T-0266).
     * Reads the ENRICHED row, so it is false for every anonymous visitor by
     * construction — `permittedActions` is not on the public projection at all,
     * and `canOpenAdminActions` reads an absent member as "nothing permitted".
     */
    canActOn(member: PublicMember): boolean {
        return canOpenAdminActions(this.enriched(member), (c) => this.auth.hasCapability(c));
    }

    openActions(member: PublicMember): void {
        // Re-check rather than trust the click: the row's button is already
        // hidden, but a keyboard/stale-list path must not open a dead modal.
        if (!this.canActOn(member)) return;
        this.selectedMember = this.enriched(member);
    }

    /**
     * Fold an admin action's result back in without a refetch. The modal hands
     * back the AUTHENTICATED member, and the three things it can change — role,
     * rank and medals — are all on the public row too, so both projections have
     * to be updated or the rank cell keeps showing the pre-promotion rank.
     *
     * A ban or a suspension additionally removes the member from the public
     * roster: that is the API's exclusion predicate, and it takes effect on the
     * next fetch. We deliberately do not drop the row here — re-deriving the
     * server's predicate client-side is how the two drift apart.
     */
    onMemberUpdated(updated: Member): void {
        this.enrichment.set(updated.id, updated);
        this.enrichment = new Map(this.enrichment);

        const index = this.members.findIndex((m) => m.id === updated.id);
        if (index === -1) return;
        const row = this.members[index];
        this.members = [
            ...this.members.slice(0, index),
            {
                ...row,
                role: updated.role,
                rank: updated.rank || null,
                rankImageUrl: updated.rankImageUrl ?? null,
                medals: (updated.medalAwards ?? []).map((award) => ({
                    id: award.id,
                    medalId: award.medalId,
                    title: award.title,
                    glyph: award.glyph,
                    imageUrl: award.imageUrl ?? null,
                    // The public shape carries the medal's CATALOGUE criteria.
                    // The per-award citation (`detail`) is signed-in only and has
                    // no field to go in here.
                    description: award.description ?? null,
                    awardedAt: award.awardedAt,
                })),
            },
            ...this.members.slice(index + 1),
        ];
    }

    // ── Export ───────────────────────────────────────────────────────────────

    /** Only signed-in Owners/Admins may pull a roster ledger export. */
    get canExport(): boolean {
        return this.auth.isAuthenticated() && this.auth.isOwnerOrAdmin();
    }

    /**
     * CSV of the CURRENT PAGE, with the columns the SIGNED-IN view actually
     * holds — which is why it is gated on the session and not merely on the role.
     * A row we hold no enrichment for exports blank in those columns rather than
     * inventing a value.
     */
    exportLedger(): void {
        if (!this.canExport) return;
        // NOTE: this exports the CURRENT PAGE, which is what the viewer can see.
        // The label and filename say so, because an Owner taking a ledger for a
        // muster must not silently get 25 of 137 names.
        const headers = [
            'In-game name',
            'Username',
            'Discord tag',
            'Rank',
            'Role',
            'Status',
            'Joined',
            'Events attended',
            'Last seen',
        ];
        const rows = this.members.map((m) => {
            const row = this.enriched(m);
            return [
                m.inGameName,
                m.username ? `@${m.username}` : '',
                row?.discordTag ?? '',
                m.rank ?? '',
                m.role,
                // Export the derived status so the CSV matches the visible pill.
                row ? deriveMemberStatus(row) : '',
                m.joinedAt ?? '',
                String(m.eventsAttended),
                row ? this.formatLastSeen(row.lastSeen) : '',
            ];
        });
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => this.csvCell(cell)).join(','))
            .join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `roster-page-${this.page}-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    /** Escape a single CSV field (quote when it contains a comma/quote/newline). */
    private csvCell(value: string): string {
        const v = value ?? '';
        return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }

    // ── Presentation ─────────────────────────────────────────────────────────

    /**
     * Whole-row navigation for mouse users, layered over the anchor in the first
     * cell — which stays the real, crawlable, keyboard-reachable link.
     *
     * Everything the anchor already does better is left to it: a modified or
     * middle click (open in a new tab) and any click that started on a control of
     * its own. Without those bail-outs, ⌘-clicking a row would swallow the new
     * tab and navigate the current one instead.
     */
    onRowClick(member: PublicMember, event: MouseEvent): void {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }
        if ((event.target as HTMLElement | null)?.closest('a, button')) {
            return;
        }
        void this.router.navigateByUrl(member.canonicalPath);
    }

    /**
     * `lastSeen` is `''` whenever the API sent a null `lastSeenAt` — every member
     * between approval and their first sign-in. `new Date('')` is an Invalid Date
     * and used to render the literal string "Invalid Date" in this column.
     */
    formatLastSeen(dateStr: string): string {
        const date = new Date(dateStr);
        if (!dateStr || Number.isNaN(date.getTime())) return 'Never';
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /** Month + year: an exact joining DATE is more precision than the column needs. */
    formatJoined(iso: string | null): string {
        if (!iso) return '—';
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    getRoleClass(role: string): string {
        switch (role) {
            case 'Owner':
                return 'brass';
            case 'Admin':
                return 'ox';
            case 'Moderator':
                return 'blue';
            case 'Member':
                return 'parch';
            default:
                return '';
        }
    }

    // ── SEO ──────────────────────────────────────────────────────────────────

    /**
     * The roster is the entry point to every profile, so its own metadata and its
     * ItemList are what give a crawler the link graph. The shell at
     * /api/seo/roster renders the same list server-side for a non-JS crawler;
     * these tags are what Googlebot's render pass and a human's browser see, and
     * the two must agree.
     */
    private applySeo(): void {
        this.seo.apply({
            title: 'Regimental Roster',
            description: this.seoDescription(),
            canonicalPath: '/roster',
            jsonLd: this.rosterJsonLd(),
        });
    }

    private seoDescription(): string {
        const roll =
            this.total > 0
                ? `All ${this.total} serving ${this.total === 1 ? 'member' : 'members'}`
                : 'Every serving member';
        return (
            `${roll} of the Lords Regiment, a Holdfast: Nations at War regiment — ` +
            `rank, decorations and service record for each.`
        );
    }

    /**
     * An `ItemList` of the members on THIS page, positioned by their absolute
     * index in the roster so page 2 does not restate positions 1–25. URLs are
     * absolute: a crawler reading the payload out of context has no base to
     * resolve a bare path against.
     */
    private rosterJsonLd(): unknown {
        if (this.members.length === 0) return null;
        const offset = (this.page - 1) * this.pageSize;
        return {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Lords Regiment roster',
            description: this.seoDescription(),
            numberOfItems: this.total,
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            itemListElement: this.members.map((member, index) => ({
                '@type': 'ListItem',
                position: offset + index + 1,
                url: this.absolute(member.canonicalPath),
                item: {
                    '@type': 'Person',
                    name: member.inGameName,
                    url: this.absolute(member.canonicalPath),
                    ...(member.rank ? { jobTitle: member.rank } : {}),
                    ...(member.avatarUrl ? { image: this.absolute(member.avatarUrl) } : {}),
                },
            })),
        };
    }

    private absolute(path: string): string {
        if (/^https?:\/\//i.test(path)) return path;
        const origin = this.document.location?.origin ?? '';
        return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
    }
}
