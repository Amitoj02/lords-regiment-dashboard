import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RosterComponent, SEARCH_DEBOUNCE_MS } from './roster.component';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { MembersService } from '../../../core/services/members.service';
import {
    PUBLIC_ROSTER_PAGE_SIZE,
    PublicMembersService,
    PublicRosterPage,
    PublicRosterQuery,
} from '../../../core/services/public-members.service';
import { SeoService } from '../../../core/services/seo.service';
import { Member, MemberPermittedActions } from '../../../core/models/member.model';
import { PublicMember } from '../../../core/models/public-member.model';

function allPermitted(): MemberPermittedActions {
    return {
        changeRole: true,
        changeRank: true,
        awardMedal: true,
        removeMedal: true,
        suspend: true,
        unsuspend: true,
        ban: true,
        unban: true,
        deriveFromDiscord: true,
    };
}

/**
 * Nothing permitted — a caller holding neither capability. NOT what a peer, a
 * superior or the caller's OWN row looks like any more: see
 * {@link ranksMedalsOnly}.
 */
function nonePermitted(): MemberPermittedActions {
    return {
        changeRole: false,
        changeRank: false,
        awardMedal: false,
        removeMedal: false,
        suspend: false,
        unsuspend: false,
        ban: false,
        unban: false,
        deriveFromDiscord: false,
    };
}

/**
 * A peer, a superior, the regiment owner or the caller's OWN row, for a caller
 * holding both capabilities: the moderation half refused, the rank/medal half
 * permitted (backend T-0211).
 */
function ranksMedalsOnly(): MemberPermittedActions {
    return {
        ...allPermitted(),
        changeRole: false,
        suspend: false,
        unsuspend: false,
        ban: false,
        unban: false,
    };
}

/** A row of the ANONYMOUS projection — what the table body is built from. */
function publicMember(overrides: Partial<PublicMember> = {}): PublicMember {
    return {
        id: 'm1',
        username: 'nolt',
        inGameName: 'Jameson Nolt',
        role: 'Member',
        rank: 'Sergeant',
        rankImageUrl: null,
        rankPrecedence: 5,
        avatarUrl: null,
        bannerUrl: null,
        joinedAt: '2025-03-04T00:00:00.000Z',
        eventsAttended: 12,
        bio: null,
        socialLinks: [],
        medals: [],
        canonicalPath: '/u/@nolt',
        ...overrides,
    };
}

/** The AUTHENTICATED record behind a row — the signed-in-only enrichment. */
function member(overrides: Partial<Member> = {}): Member {
    return {
        id: 'm1',
        discordTag: 'nolt#0001',
        inGameName: 'Jameson Nolt',
        rank: 'Sergeant',
        rankId: 'rank-sgt',
        role: 'Member',
        discordLinked: true,
        status: 'Active',
        lastSeen: new Date().toISOString(),
        permittedActions: allPermitted(),
        ...overrides,
    };
}

function page(
    members: PublicMember[],
    overrides: Partial<PublicRosterPage> = {},
): PublicRosterPage {
    return {
        members,
        total: members.length,
        page: 1,
        limit: PUBLIC_ROSTER_PAGE_SIZE,
        hasPrev: false,
        hasNext: false,
        ...overrides,
    };
}

function currentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
    return {
        id: 'admin-1',
        inGameName: 'Admin One',
        username: null,
        rank: 'Captain',
        role: 'Admin',
        discordTag: 'admin#0001',
        discordLinked: true,
        avatarUrl: null,
        isMember: true,
        capabilities: ['manage_roles', 'edit_ranks_medals'],
        // The gate is off in these specs, so the session behaves exactly as it
        // did before T-0261 (CONTRACT §1 — the API never omits these four).
        guildMember: true,
        discordInviteUrl: null,
        guildGateEnabled: false,
        guildGateExempt: false,
        ...overrides,
    };
}

interface SetupOptions {
    /** The public pages the API answers with, in request order. */
    pages?: PublicRosterPage[];
    /** Null = an anonymous visitor, which must never touch MembersService. */
    session?: CurrentUser | null;
    /** The authenticated roster folded in for a signed-in viewer. */
    enrichment?: Member[];
    /** Make the enrichment call blow up, to prove the page survives it. */
    enrichmentFails?: boolean;
}

describe('RosterComponent — the public roster (T-0287)', () => {
    let fixture: ComponentFixture<RosterComponent>;
    let component: RosterComponent;
    let getRoster: jasmine.Spy<(query?: PublicRosterQuery) => unknown>;
    let getAll: jasmine.Spy;
    let navigateByUrl: jasmine.Spy;
    let seoApply: jasmine.Spy;

    function setup(options: SetupOptions = {}): HTMLElement {
        const pages = options.pages ?? [page([publicMember()])];
        const session = options.session === undefined ? null : options.session;
        let call = 0;

        getRoster = jasmine
            .createSpy('getRoster')
            // Each request consumes the next scripted page and then repeats the
            // last one, so a test only has to script the pages it asserts on.
            .and.callFake(() => of(pages[Math.min(call++, pages.length - 1)]));
        getAll = jasmine
            .createSpy('getAll')
            .and.returnValue(
                options.enrichmentFails
                    ? throwError(() => new Error('401'))
                    : of(options.enrichment ?? []),
            );
        navigateByUrl = jasmine.createSpy('navigateByUrl').and.resolveTo(true);
        seoApply = jasmine.createSpy('apply');

        const user = signal<CurrentUser | null>(session);
        const auth = {
            currentUser: user,
            isAuthenticated: () => user() !== null,
            // The signed-in-only columns are gated on ENROLMENT (T-0287): their
            // data comes from an endpoint an Applicant cannot call.
            isMember: () => user()?.isMember ?? false,
            isOwnerOrAdmin: () => user()?.role === 'Owner' || user()?.role === 'Admin',
            hasCapability: (capability: string) =>
                user()?.capabilities?.includes(capability) ?? false,
        } as unknown as AuthService;

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            declarations: [RosterComponent],
            providers: [
                { provide: PublicMembersService, useValue: { getRoster } },
                { provide: MembersService, useValue: { getAll } },
                { provide: AuthService, useValue: auth },
                { provide: SeoService, useValue: { apply: seoApply, reset: () => undefined } },
                { provide: Router, useValue: { navigateByUrl } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(RosterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    function headers(el: HTMLElement): string[] {
        return Array.from(el.querySelectorAll('thead th')).map(
            (th) => th.textContent?.trim() ?? '',
        );
    }

    function rows(el: HTMLElement): HTMLTableRowElement[] {
        return Array.from(el.querySelectorAll<HTMLTableRowElement>('tbody tr.roster-row'));
    }

    function actionButtons(el: HTMLElement): HTMLButtonElement[] {
        return Array.from(el.querySelectorAll<HTMLButtonElement>('.col-actions button'));
    }

    function buttonLabelled(el: HTMLElement, text: string): HTMLButtonElement {
        const match = Array.from(el.querySelectorAll('button')).find((b) =>
            (b.textContent ?? '').includes(text),
        );
        if (!match) throw new Error(`No button containing "${text}"`);
        return match as HTMLButtonElement;
    }

    function lastQuery(): PublicRosterQuery {
        return getRoster.calls.mostRecent().args[0] as PublicRosterQuery;
    }

    // ── The anonymous page ───────────────────────────────────────────────────

    describe('anonymous visitor', () => {
        it('renders the roster from the PUBLIC service and never calls the authenticated one', () => {
            const el = setup({ pages: [page([publicMember({ inGameName: 'Jameson Nolt' })])] });

            expect(getRoster).toHaveBeenCalledTimes(1);
            // A 401 from a public page ejects the visitor to /login through the
            // JWT interceptor, so this must not merely be tolerated — it must not
            // happen at all.
            expect(getAll).not.toHaveBeenCalled();
            expect(rows(el).length).toBe(1);
            expect(el.textContent).toContain('Jameson Nolt');
        });

        it('shows no signed-in-only columns', () => {
            const el = setup();
            expect(headers(el)).toEqual([
                'Member',
                'Rank',
                'Medals',
                'Role',
                'Joined',
                'Events',
                '',
            ]);
            expect(headers(el)).not.toContain('Last Seen');
            expect(headers(el)).not.toContain('Status');
        });

        it('gives every row a real anchor to the member’s canonical path', () => {
            // These links ARE the crawlable graph into /u/:handle. A click handler
            // on the <tr> is invisible to a search engine.
            const el = setup({
                pages: [
                    page([
                        publicMember({ id: 'm1', canonicalPath: '/u/@nolt' }),
                        publicMember({
                            id: 'm2',
                            username: null,
                            canonicalPath: '/u/abcdef123456',
                        }),
                    ]),
                ],
            });

            const links = Array.from(
                el.querySelectorAll<HTMLAnchorElement>('td.col-member a.roster-member-link'),
            );
            expect(links.length).toBe(2);
            // No anchor may be nested inside another (the row itself is not a link).
            expect(el.querySelectorAll('a a').length).toBe(0);
        });

        it('offers no rank filter, because the public API keys that filter on a rank id', () => {
            const el = setup();
            expect(el.querySelector('.roster-filter-rank')).toBeNull();
            expect(component.rankOptions).toEqual([]);
        });

        it('shows no admin action button on any row', () => {
            const el = setup({ pages: [page([publicMember(), publicMember({ id: 'm2' })])] });
            expect(actionButtons(el).length).toBe(0);
        });

        it('offers no ledger export', () => {
            const el = setup();
            expect(component.canExport).toBeFalse();
            expect(el.textContent).not.toContain('Export this page');
        });

        it('applies roster SEO tags with the member count and an ItemList', () => {
            setup({ pages: [page([publicMember()], { total: 42 })] });

            const tags = seoApply.calls.mostRecent().args[0];
            expect(tags.title).toBe('Regimental Roster');
            expect(tags.canonicalPath).toBe('/roster');
            expect(tags.description).toContain('42');
            expect(tags.jsonLd['@type']).toBe('ItemList');
            expect(tags.jsonLd.numberOfItems).toBe(42);
            expect(tags.jsonLd.itemListElement[0].position).toBe(1);
            expect(tags.jsonLd.itemListElement[0].url).toContain('/u/@nolt');
        });
    });

    // ── The signed-in page ───────────────────────────────────────────────────

    describe('signed-in viewer', () => {
        it('folds the authenticated roster in and shows Status and Last Seen', () => {
            const el = setup({
                session: currentUser(),
                enrichment: [member({ id: 'm1', lastSeen: new Date().toISOString() })],
            });

            expect(getAll).toHaveBeenCalledTimes(1);
            expect(headers(el)).toContain('Status');
            expect(headers(el)).toContain('Last Seen');
            expect(el.textContent).toContain('Today');
            expect(el.textContent).toContain('Active');
        });

        it('shows the Discord tag under the name, which the public projection has no field for', () => {
            const el = setup({
                session: currentUser(),
                enrichment: [member({ id: 'm1', discordTag: 'nolt#0001' })],
            });
            expect(el.querySelector('.roster-member-tag')?.textContent?.trim()).toBe('nolt#0001');
        });

        it('degrades to the public view when the authenticated call fails', () => {
            // A session that expired mid-browse must cost the extras, not the page.
            const el = setup({ session: currentUser(), enrichmentFails: true });

            expect(rows(el).length).toBe(1);
            expect(el.textContent).toContain('Jameson Nolt');
            // The column is still there (the viewer has a session); it just has
            // nothing to put in it.
            expect(headers(el)).toContain('Last Seen');
            expect(component.enriched(publicMember())).toBeNull();
        });

        it('builds the rank filter from the authenticated roster, in ladder order', () => {
            const el = setup({
                session: currentUser(),
                enrichment: [
                    member({ id: 'm0', rank: 'Captain', rankId: 'rank-cpt' }),
                    member({ id: 'm1', rank: 'Sergeant', rankId: 'rank-sgt' }),
                    member({ id: 'm2', rank: 'Sergeant', rankId: 'rank-sgt' }),
                ],
            });

            expect(component.rankOptions).toEqual([
                { id: 'rank-cpt', name: 'Captain' },
                { id: 'rank-sgt', name: 'Sergeant' },
            ]);
            expect(el.querySelector('.roster-filter-rank')).not.toBeNull();
        });

        // Two cases, two specs: `setup()` configures the TestBed, which can only
        // happen once per test, so calling it twice in one `it` never ran the
        // second assertion against a real second component.
        it('offers the ledger export to an Owner/Admin', () => {
            const el = setup({ session: currentUser({ role: 'Admin' }) });
            expect(el.textContent).toContain('Export this page');
        });

        it('withholds the ledger export from a Moderator', () => {
            const el = setup({ session: currentUser({ role: 'Moderator' }) });
            expect(el.textContent).not.toContain('Export this page');
        });
    });

    // ── Server-side paging ───────────────────────────────────────────────────

    describe('pagination', () => {
        it('asks for page 1 on load', () => {
            setup();
            expect(lastQuery().page).toBe(1);
            expect(lastQuery().limit).toBe(PUBLIC_ROSTER_PAGE_SIZE);
        });

        it('asks the server for the next page when Next is pressed', () => {
            const el = setup({
                pages: [
                    page([publicMember()], { total: 60, page: 1, hasNext: true }),
                    page([publicMember({ id: 'm26' })], {
                        total: 60,
                        page: 2,
                        hasPrev: true,
                        hasNext: true,
                    }),
                ],
            });

            buttonLabelled(el, 'Next').click();
            fixture.detectChanges();

            expect(getRoster).toHaveBeenCalledTimes(2);
            expect(lastQuery().page).toBe(2);
            expect(component.page).toBe(2);
        });

        it('asks the server for the previous page when Prev is pressed', () => {
            const el = setup({
                pages: [
                    page([publicMember()], { total: 60, page: 2, hasPrev: true, hasNext: true }),
                    page([publicMember()], { total: 60, page: 1, hasNext: true }),
                ],
            });

            buttonLabelled(el, 'Prev').click();
            fixture.detectChanges();

            expect(lastQuery().page).toBe(1);
        });

        it('reports a real position and range rather than the old decorative bar', () => {
            const el = setup({
                pages: [
                    page(
                        Array.from({ length: PUBLIC_ROSTER_PAGE_SIZE }, (_, i) =>
                            publicMember({ id: `m${i}` }),
                        ),
                        { total: 60, page: 2, hasPrev: true, hasNext: true },
                    ),
                ],
            });

            expect(component.firstShown).toBe(26);
            expect(component.lastShown).toBe(50);
            expect(component.totalPages).toBe(3);
            expect(el.textContent).toContain('Showing 26–50 of 60 members');
            expect(el.textContent).toContain('Page 2 of 3');
        });

        it('does not re-request a page it is already on', () => {
            setup({ pages: [page([publicMember()], { total: 10, page: 1 })] });
            component.goToPage(1);
            expect(getRoster).toHaveBeenCalledTimes(1);
        });
    });

    // ── Server-side filtering ────────────────────────────────────────────────

    describe('filters', () => {
        it('debounces the search box into a single server query', fakeAsync(() => {
            setup();
            getRoster.calls.reset();

            component.onSearchInput('no');
            tick(100);
            component.onSearchInput('nol');
            tick(100);
            component.onSearchInput('nolt');
            // Still inside the window: nothing has been asked yet.
            expect(getRoster).not.toHaveBeenCalled();

            tick(SEARCH_DEBOUNCE_MS);
            expect(getRoster).toHaveBeenCalledTimes(1);
            expect(lastQuery().search).toBe('nolt');
            // A new term always restarts at page 1, or the reader lands on an
            // empty tail of a much shorter result set.
            expect(lastQuery().page).toBe(1);
        }));

        it('does not re-query when the box settles back on the applied term', fakeAsync(() => {
            setup();
            component.onSearchInput('nolt');
            tick(SEARCH_DEBOUNCE_MS);
            getRoster.calls.reset();

            component.onSearchInput('nolty');
            component.onSearchInput('nolt');
            tick(SEARCH_DEBOUNCE_MS);

            expect(getRoster).not.toHaveBeenCalled();
        }));

        it('sends the rank filter to the server immediately', () => {
            setup({ session: currentUser(), enrichment: [member()] });
            getRoster.calls.reset();

            component.filterRankId = 'rank-sgt';
            component.onRankChange();

            expect(getRoster).toHaveBeenCalledTimes(1);
            expect(lastQuery().rankId).toBe('rank-sgt');
        });

        it('clears both filters in one request', fakeAsync(() => {
            setup();
            component.searchQuery = 'nolt';
            component.onSearchInput('nolt');
            tick(SEARCH_DEBOUNCE_MS);
            getRoster.calls.reset();

            component.clearFilters();
            // The pending keystroke collapses onto the term we just applied
            // instead of firing a second, identical fetch.
            tick(SEARCH_DEBOUNCE_MS);

            expect(getRoster).toHaveBeenCalledTimes(1);
            expect(lastQuery().search).toBeUndefined();
            expect(lastQuery().rankId).toBeUndefined();
        }));
    });

    // ── States ───────────────────────────────────────────────────────────────

    describe('loading, error and empty states', () => {
        it('distinguishes an empty roster from an empty filter result', () => {
            const el = setup({ pages: [page([], { total: 0 })] });
            expect(el.textContent).toContain('The roll is empty');

            component.searchQuery = 'zzz';
            fixture.detectChanges();
            expect(el.textContent).toContain('No members match');
        });

        // The two error states are deliberately different, and this is the one
        // with NOTHING already on screen: the full-panel message with a retry.
        // It has to start from an empty roster, because a failure that arrives
        // on top of rows takes the other branch (the test below).
        it('shows a distinct, retryable error state when the FIRST fetch fails', () => {
            const el = setup({ pages: [page([], { total: 0 })] });
            getRoster.and.returnValue(throwError(() => new Error('boom')));

            component.retry();
            fixture.detectChanges();

            expect(component.error).toBeTrue();
            expect(el.textContent).toContain('The roster could not be loaded');
            expect(el.querySelector('tbody')).toBeNull();
        });

        it('keeps the rows on screen when a REFRESH fails', () => {
            const el = setup({ pages: [page([publicMember()], { total: 10, hasNext: true })] });
            getRoster.and.returnValue(throwError(() => new Error('boom')));

            component.retry();
            fixture.detectChanges();

            expect(rows(el).length).toBe(1);
            expect(el.textContent).toContain('The roster did not refresh');
        });
    });

    // ── Row navigation ───────────────────────────────────────────────────────

    describe('row navigation', () => {
        it('navigates to the canonical path on a plain row click', () => {
            const el = setup();
            rows(el)[0].dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
            expect(navigateByUrl).toHaveBeenCalledWith('/u/@nolt');
        });

        it('leaves a modified click to the anchor, so ⌘-click still opens a tab', () => {
            const el = setup();
            rows(el)[0].dispatchEvent(
                new MouseEvent('click', { bubbles: true, button: 0, metaKey: true }),
            );
            expect(navigateByUrl).not.toHaveBeenCalled();
        });

        it('does not double-navigate when the anchor itself is clicked', () => {
            const el = setup();
            const link = el.querySelector<HTMLAnchorElement>('a.roster-member-link')!;
            // routerLink is stubbed out by NO_ERRORS_SCHEMA here; what matters is
            // that the row handler stands down and lets the link do the work.
            link.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
            expect(navigateByUrl).not.toHaveBeenCalled();
        });
    });

    // ── Admin actions (T-0266), now gated on the ENRICHED row ────────────────

    describe('row actions', () => {
        function withEnrichment(rowsIn: Member[], me: CurrentUser = currentUser()): HTMLElement {
            return setup({
                session: me,
                enrichment: rowsIn,
                pages: [
                    page(rowsIn.map((m) => publicMember({ id: m.id, inGameName: m.inGameName }))),
                ],
            });
        }

        it('shows the row action button only where an action is permitted', () => {
            const el = withEnrichment([
                member({ id: 'm1', inGameName: 'Jameson Nolt' }),
                member({
                    id: 'admin-1',
                    inGameName: 'Admin One',
                    permittedActions: nonePermitted(),
                }),
            ]);

            const buttons = actionButtons(el);
            expect(buttons.length).toBe(1);
            expect(buttons[0].getAttribute('aria-label')).toBe('Member actions for Jameson Nolt');
        });

        it('shows it on a row where only the rank and medal half is permitted', () => {
            const el = withEnrichment([
                member({
                    id: 'adm-2',
                    inGameName: 'Nolt',
                    role: 'Admin',
                    permittedActions: ranksMedalsOnly(),
                }),
            ]);
            expect(actionButtons(el).length).toBe(1);
        });

        it('⚠️ shows it on the caller’s OWN row, for the rank and medal actions', () => {
            // Your own row used to be untouchable. Since backend T-0211 it carries
            // the four rank/medal flags — you may record your own promotion — so
            // the `···` belongs there too. Suspend and Ban stay dead in the dialog.
            const el = withEnrichment([
                member({ id: 'admin-1', role: 'Admin', permittedActions: ranksMedalsOnly() }),
            ]);
            expect(actionButtons(el).length).toBe(1);
        });

        it('hides it on a row the API permits nothing on', () => {
            const el = withEnrichment([
                member({ id: 'm9', role: 'Member', permittedActions: nonePermitted() }),
            ]);
            expect(actionButtons(el).length).toBe(0);
        });

        it('shows no action button at all to a caller with no capabilities', () => {
            const el = withEnrichment(
                [member()],
                currentUser({ role: 'Member', capabilities: [] }),
            );
            expect(actionButtons(el).length).toBe(0);
        });

        it('treats a member with no permittedActions block as untouchable', () => {
            // Fail closed: an older projection must not re-open the `···`.
            const el = withEnrichment([member({ permittedActions: undefined })]);
            expect(actionButtons(el).length).toBe(0);
            expect(component.canActOn(publicMember())).toBeFalse();
        });

        it('refuses to open the modal for a member nothing is permitted on', () => {
            withEnrichment([member({ id: 'm1', permittedActions: nonePermitted() })]);
            component.openActions(publicMember({ id: 'm1' }));
            expect(component.selectedMember).toBeNull();
        });

        it('opens the modal with the ENRICHED record, which is what the modal edits', () => {
            const enriched = member({ id: 'm1' });
            withEnrichment([enriched]);
            component.openActions(publicMember({ id: 'm1' }));
            expect(component.selectedMember).toEqual(enriched);
        });

        it('reflects a rank change from the modal on the public row without a refetch', () => {
            const el = withEnrichment([member({ id: 'm1' })]);
            getRoster.calls.reset();

            component.onMemberUpdated(
                member({ id: 'm1', rank: 'Colour Sergeant', rankId: 'rank-csgt' }),
            );
            fixture.detectChanges();

            expect(getRoster).not.toHaveBeenCalled();
            expect(component.members[0].rank).toBe('Colour Sergeant');
            expect(el.querySelector('.roster-rank-label')?.textContent?.trim()).toBe(
                'Colour Sergeant',
            );
        });
    });

    // ── Cell formatting ──────────────────────────────────────────────────────

    describe('last-seen column', () => {
        it('renders "Never" for a member the API has no lastSeenAt for', () => {
            // mapMember turns a null lastSeenAt into '', and `new Date('')` is an
            // Invalid Date — which used to reach the column as the literal text
            // "Invalid Date" for every member between approval and first sign-in.
            setup();
            expect(component.formatLastSeen('')).toBe('Never');
        });

        it('renders "Never" rather than "Invalid Date" for an unparseable value', () => {
            setup();
            expect(component.formatLastSeen('not-a-date')).toBe('Never');
        });

        it('still formats a real timestamp', () => {
            setup();
            expect(component.formatLastSeen(new Date().toISOString())).toBe('Today');
        });
    });

    describe('joined column', () => {
        it('renders an em dash for a member with no joining date', () => {
            setup();
            expect(component.formatJoined(null)).toBe('—');
            expect(component.formatJoined('not-a-date')).toBe('—');
        });

        it('renders month and year', () => {
            setup();
            expect(component.formatJoined('2025-03-04T00:00:00.000Z')).toMatch(/^\w{3} 2025$/);
        });
    });
});
