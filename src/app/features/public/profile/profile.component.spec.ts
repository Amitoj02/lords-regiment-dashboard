import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { MembersService, ServiceRecordEntry } from '../../../core/services/members.service';
import { PublicMembersService } from '../../../core/services/public-members.service';
import { RegimentService } from '../../../core/services/regiment.service';
import { SeoService, SeoTags } from '../../../core/services/seo.service';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { Member } from '../../../core/models/member.model';
import { PublicMember, PublicMemberMedal } from '../../../core/models/public-member.model';
import { RegimentEvent } from '../../../core/models/event.model';
import { MedalComponent } from '../../../shared/components/medal/medal.component';

/** Member ids are 12-char base62 short ids, and the route accepts them raw. */
const SHORT_ID = 'abc123456789';

function publicMember(overrides: Partial<PublicMember> = {}): PublicMember {
    return {
        id: SHORT_ID,
        username: 'panda',
        inGameName: 'Jameson Nolt',
        role: 'Member',
        rank: 'Sergeant',
        rankImageUrl: null,
        rankPrecedence: 4,
        avatarUrl: null,
        bannerUrl: null,
        joinedAt: '2026-01-04T00:00:00.000Z',
        eventsAttended: 7,
        medals: [],
        canonicalPath: '/u/@panda',
        ...overrides,
    };
}

/** The signed-in-only projection of the SAME member. */
function enrichedMember(overrides: Partial<Member> = {}): Member {
    return {
        id: SHORT_ID,
        discordTag: 'nolt#0001',
        inGameName: 'Jameson Nolt',
        rank: 'Sergeant',
        role: 'Member',
        discordLinked: true,
        status: 'Active',
        lastSeen: '2026-07-01T12:00:00',
        ...overrides,
    };
}

function attendedEvent(): RegimentEvent {
    return {
        id: 'e1',
        title: 'Line Battle vs 84e',
        date: '2026-06-14',
        startTime: '20:00',
        status: 'previous',
    } as RegimentEvent;
}

function entry(type: string, id = type): ServiceRecordEntry {
    return {
        id,
        occurredAt: '2026-06-01T12:00:00',
        type,
        event: `Event for ${type}`,
        note: null,
    };
}

function currentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
    return {
        id: SHORT_ID,
        inGameName: 'Jameson Nolt',
        username: 'panda',
        rank: 'Sergeant',
        role: 'Member',
        discordTag: 'nolt#0001',
        discordLinked: true,
        avatarUrl: null,
        isMember: true,
        capabilities: [],
        // The gate is off in these specs, so the session behaves exactly as it
        // did before T-0261 (CONTRACT §1 — the API never omits these four).
        guildMember: true,
        discordInviteUrl: null,
        guildGateEnabled: false,
        guildGateExempt: false,
        ...overrides,
    };
}

interface MembersSpy {
    getById: jasmine.Spy;
    getEvents: jasmine.Spy;
    getRsvps: jasmine.Spy;
    getServiceRecord: jasmine.Spy;
}

interface Harness {
    fixture: ComponentFixture<ProfileComponent>;
    component: ProfileComponent;
    members: MembersSpy;
    publicMembers: { getProfile: jasmine.Spy; getGallery: jasmine.Spy };
    router: { url: string; navigate: jasmine.Spy };
    seo: { apply: jasmine.Spy; reset: jasmine.Spy };
    el: HTMLElement;
    /** The tags handed to SeoService by the most recent apply(). */
    tags(): SeoTags;
}

interface SetupOptions {
    /** The `/u/:handle` segment. `null` = the `/me` route, which has no param. */
    handle?: string | null;
    url?: string;
    member?: PublicMember;
    /** Thrown by the PUBLIC profile fetch instead of a member. */
    failWith?: HttpErrorResponse;
    /** Thrown by the AUTHENTICATED enrichment fetch (a 403 is the real case). */
    enrichmentFails?: boolean;
    user?: CurrentUser | null;
    serviceRecord?: ServiceRecordEntry[];
    events?: RegimentEvent[];
    /** Declare MedalComponent for real — the honours panel is measured, not read. */
    realMedals?: boolean;
}

function setup(options: SetupOptions = {}): Harness {
    const member = options.member ?? publicMember();
    const user = options.user ?? null;
    // Bound to a local so the narrowing survives into the throwError closure.
    const failWith = options.failWith;

    const publicMembers = {
        getProfile: jasmine
            .createSpy('getProfile')
            .and.returnValue(failWith ? throwError(() => failWith) : of(member)),
        getGallery: jasmine.createSpy('getGallery').and.returnValue(of([])),
    };

    const members: MembersSpy = {
        getById: jasmine
            .createSpy('getById')
            .and.returnValue(
                options.enrichmentFails
                    ? throwError(() => new HttpErrorResponse({ status: 403 }))
                    : of(enrichedMember()),
            ),
        getEvents: jasmine.createSpy('getEvents').and.returnValue(of(options.events ?? [])),
        getRsvps: jasmine.createSpy('getRsvps').and.returnValue(of([])),
        getServiceRecord: jasmine
            .createSpy('getServiceRecord')
            .and.returnValue(of(options.serviceRecord ?? [])),
    };

    const auth = {
        currentUser: signal<CurrentUser | null>(user),
        isAuthenticated: () => user !== null,
        isMember: () => user?.isMember ?? false,
        hasCapability: (capability: string) => user?.capabilities.includes(capability) ?? false,
        stashReturnUrl: () => undefined,
    } as unknown as AuthService;

    const router = {
        url: options.url ?? member.canonicalPath,
        navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
    };

    const seo = { apply: jasmine.createSpy('apply'), reset: jasmine.createSpy('reset') };

    // `handle: null` models /me: the route matrix has no :handle at all there.
    const params = options.handle === null ? {} : { handle: options.handle ?? '@panda' };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        imports: [CommonModule, FormsModule],
        declarations: options.realMedals ? [ProfileComponent, MedalComponent] : [ProfileComponent],
        providers: [
            { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(params)) } },
            { provide: Router, useValue: router },
            { provide: PublicMembersService, useValue: publicMembers },
            { provide: MembersService, useValue: members },
            {
                provide: RegimentService,
                useValue: { getProfile: () => of({ name: 'Lords Regiment' }) },
            },
            { provide: SeoService, useValue: seo },
            { provide: AuthService, useValue: auth },
        ],
        schemas: [NO_ERRORS_SCHEMA],
    });

    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return {
        fixture,
        component: fixture.componentInstance,
        members,
        publicMembers,
        router,
        seo,
        el: fixture.nativeElement as HTMLElement,
        tags: () => seo.apply.calls.mostRecent().args[0] as SeoTags,
    };
}

function labels(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll('.particulars-label')).map((l) =>
        (l.textContent ?? '').trim(),
    );
}

describe('ProfileComponent as an anonymous visitor (T-0287)', () => {
    it('makes no authenticated call at all', () => {
        // The whole point of the public projection. A 401 fired from a page a
        // signed-out reader can open drops whatever session state exists and,
        // before the interceptor was scoped to /app, ejected the reader to a
        // sign-in form they never asked for.
        const { members, publicMembers } = setup();
        expect(publicMembers.getProfile).toHaveBeenCalledWith('@panda');
        expect(publicMembers.getGallery).toHaveBeenCalled();
        expect(members.getById).not.toHaveBeenCalled();
        expect(members.getEvents).not.toHaveBeenCalled();
        expect(members.getRsvps).not.toHaveBeenCalled();
        expect(members.getServiceRecord).not.toHaveBeenCalled();
    });

    it('renders the public body — name, rank and handle', () => {
        const { el } = setup();
        expect(el.querySelector('.profile-name')!.textContent!.trim()).toBe('Jameson Nolt');
        expect(el.querySelector('.profile-rank')!.textContent!.trim()).toBe('Sergeant');
        expect(el.querySelector('.profile-handle')!.textContent!.trim()).toBe('@panda');
    });

    it('shows no Last Access row and no Discord tag', () => {
        const { el } = setup();
        expect(labels(el).some((l) => l.startsWith('Last Access'))).toBeFalse();
        expect(el.querySelector('.profile-discord')).toBeNull();
    });

    it('still renders the Event History and RSVP tabs, with a lock on them', () => {
        // Hiding them outright would show a crawler a different set of controls
        // than a member sees. A visibly locked tab says the same thing to both.
        const { el } = setup();
        const tabs = Array.from(el.querySelectorAll('.hf-tab')).map((t) => t.textContent!.trim());
        expect(tabs.length).toBe(3);
        expect(tabs[1]).toContain('Event History');
        expect(tabs[2]).toContain('RSVPs');
        expect(el.querySelectorAll('.tab-lock').length).toBe(2);
    });

    it('shows the sign-in panel instead of event rows when a locked tab is selected', () => {
        const { component, fixture, el } = setup({ events: [attendedEvent()] });
        component.setTab('events');
        fixture.detectChanges();
        expect(el.querySelector('.profile-locked')).not.toBeNull();
        expect(el.querySelector('.event-history-row')).toBeNull();
        expect(el.textContent).not.toContain('Line Battle vs 84e');
    });

    it('never opens the Service Record or the admin actions', () => {
        const { component, el } = setup();
        expect(component.canViewPrivate).toBeFalse();
        expect(component.canAdminAct).toBeFalse();
        expect(el.querySelector('.profile-service-record')).toBeNull();
    });

    it('declares itself to crawlers as a ProfilePage, canonical to the handle URL', () => {
        const { tags } = setup();
        expect(tags().title).toBe('Jameson Nolt (@panda)');
        expect(tags().canonicalPath).toBe('/u/@panda');
        expect(tags().type).toBe('profile');
        // The same sentence the crawler shell emits (backend renderProfile).
        expect(tags().description).toContain('Sergeant in Lords Regiment');
        expect(tags().description).toContain('0 decorations');
        expect(tags().description).toContain('7 events attended');
        const jsonLd = tags().jsonLd as { '@type': string; mainEntity: Record<string, unknown> };
        expect(jsonLd['@type']).toBe('ProfilePage');
        expect(jsonLd.mainEntity['@type']).toBe('Person');
        expect(jsonLd.mainEntity['alternateName']).toBe('@panda');
        expect(jsonLd.mainEntity['jobTitle']).toBe('Sergeant');
        expect(jsonLd.mainEntity['memberOf']).toEqual(
            jasmine.objectContaining({ '@type': 'Organization', name: 'Lords Regiment' }),
        );
    });
});

describe('ProfileComponent canonical URL (T-0287)', () => {
    it('rewrites a short-id URL to the handle URL, replacing history', () => {
        // Two live URLs for one page compete to be indexed as the same page, and
        // the header would show @panda above a URL that never mentions it.
        const { router } = setup({ handle: SHORT_ID, url: `/u/${SHORT_ID}` });
        expect(router.navigate).toHaveBeenCalledWith(['/u/@panda'], { replaceUrl: true });
    });

    it('leaves the URL alone when it is already canonical', () => {
        const { router } = setup({ handle: '@panda', url: '/u/@panda' });
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('keeps a handle-less member on their short-id URL', () => {
        const member = publicMember({ username: null, canonicalPath: `/u/${SHORT_ID}` });
        const { router } = setup({ handle: SHORT_ID, url: `/u/${SHORT_ID}`, member });
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('resolves /me from the session without rewriting the URL', () => {
        // /me carries no :handle to be wrong about, is authGuard-only and so is
        // never crawled, and rel=canonical already points at the vanity URL.
        const { router, component, publicMembers } = setup({
            handle: null,
            url: '/me',
            user: currentUser(),
        });
        expect(publicMembers.getProfile).toHaveBeenCalledWith('@panda');
        expect(component.member).not.toBeNull();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('resolves /me by short id for a member who has claimed no handle', () => {
        const { publicMembers } = setup({
            handle: null,
            url: '/me',
            member: publicMember({ username: null, canonicalPath: `/u/${SHORT_ID}` }),
            user: currentUser({ username: null }),
        });
        expect(publicMembers.getProfile).toHaveBeenCalledWith(SHORT_ID);
    });
});

describe('ProfileComponent as a signed-in member (T-0287)', () => {
    it('enriches the page with the authenticated projection', () => {
        const { members, el } = setup({ user: currentUser({ id: 'someone-else' }) });
        expect(members.getById).toHaveBeenCalledWith(SHORT_ID);
        expect(members.getEvents).toHaveBeenCalledWith(SHORT_ID);
        expect(members.getRsvps).toHaveBeenCalledWith(SHORT_ID);
        expect(el.querySelector('.profile-discord')!.textContent!.trim()).toBe('nolt#0001');
        expect(labels(el).some((l) => l.startsWith('Last Access'))).toBeTrue();
    });

    it('unlocks the Event History tab', () => {
        const { component, fixture, el } = setup({
            user: currentUser({ id: 'someone-else' }),
            events: [attendedEvent()],
        });
        component.setTab('events');
        fixture.detectChanges();
        expect(el.querySelector('.profile-locked')).toBeNull();
        expect(el.querySelector('.event-title')!.textContent!.trim()).toBe('Line Battle vs 84e');
    });

    it('reads its own service record without holding view_audit_log', () => {
        const { members, component } = setup({ user: currentUser() });
        expect(component.isOwnProfile).toBeTrue();
        expect(component.canViewPrivate).toBeTrue();
        expect(members.getServiceRecord).toHaveBeenCalledWith(SHORT_ID);
    });

    it("does not read another member's service record without view_audit_log", () => {
        const { members, component } = setup({ user: currentUser({ id: 'someone-else' }) });
        expect(component.canViewPrivate).toBeFalse();
        expect(members.getServiceRecord).not.toHaveBeenCalled();
    });

    it('opens the service record for a viewer holding view_audit_log', () => {
        const { members, component } = setup({
            user: currentUser({ id: 'someone-else', capabilities: ['view_audit_log'] }),
        });
        expect(component.canViewPrivate).toBeTrue();
        expect(members.getServiceRecord).toHaveBeenCalledWith(SHORT_ID);
    });

    it('falls back to the public page when the enrichment is refused', () => {
        // A signed-in applicant holds no view_members_directory, so GET
        // /members/:id 403s. The right answer to that is the page they would
        // have seen anyway — not an error, and certainly not a blank Last Access.
        const { el } = setup({ user: currentUser({ id: 'someone-else' }), enrichmentFails: true });
        expect(el.querySelector('.profile-name')).not.toBeNull();
        expect(el.querySelector('.profile-discord')).toBeNull();
        expect(labels(el).some((l) => l.startsWith('Last Access'))).toBeFalse();
    });

    it('offers its own profile an edit link to /account, not an inline editor', () => {
        // The editor moved to /account with the rest of a member's settings.
        const { el } = setup({ user: currentUser() });
        const edit = el.querySelector('.profile-actions a') as HTMLAnchorElement;
        expect(edit.getAttribute('routerLink')).toBe('/account');
        expect(el.querySelector('.profile-edit-modal')).toBeNull();
    });
});

describe('ProfileComponent when there is no member (T-0287)', () => {
    it('says the profile does not exist on a 404, and asks not to be indexed', () => {
        const { el, tags } = setup({ failWith: new HttpErrorResponse({ status: 404 }) });
        expect(el.querySelector('.profile-error-title')!.textContent!.trim()).toBe(
            'Member not found',
        );
        expect(el.querySelector('.profile-error a[routerLink="/roster"]')).not.toBeNull();
        expect(tags().noIndex).toBeTrue();
    });

    it('says the account is gone on a 410', () => {
        // The one status the API distinguishes: the member deleted their account.
        const { el } = setup({ failWith: new HttpErrorResponse({ status: 410 }) });
        expect(el.querySelector('.profile-error-title')!.textContent!.trim()).toBe(
            'No longer with the regiment',
        );
    });

    it('does not claim a member is missing when the request merely failed', () => {
        const { el } = setup({ failWith: new HttpErrorResponse({ status: 500 }) });
        expect(el.querySelector('.profile-error-title')!.textContent!.trim()).toBe(
            'Profile unavailable',
        );
    });
});

describe('ProfileComponent service record (T-0253)', () => {
    it('gives a demotion its own class, distinct from a promotion', () => {
        const { component } = setup({ user: currentUser() });
        expect(component.serviceEntryClass('demotion')).toBe('is-demotion');
        expect(component.serviceEntryClass('promotion')).not.toBe('is-demotion');
    });

    it('leaves promotion on the rank class', () => {
        const { component } = setup({ user: currentUser() });
        expect(component.serviceEntryClass('promotion')).toBe('is-rank');
        expect(component.serviceEntryClass('rank')).toBe('is-rank');
    });

    it('renders an unrecognised type neutrally, never as a promotion', () => {
        // The old `default: return ''` inherited .timeline-dot's brass, which is
        // exactly .is-rank — an unknown type silently claimed a promotion.
        const { component } = setup({ user: currentUser() });
        const unknown = component.serviceEntryClass('conscription');
        expect(unknown).toBe('is-neutral');
        expect(unknown).not.toBe(component.serviceEntryClass('promotion'));
        expect(unknown).not.toBe('');
    });

    it('renders enlistment neutrally (the API writes it on approval)', () => {
        const { component } = setup({ user: currentUser() });
        expect(component.serviceEntryClass('enlistment')).toBe('is-neutral');
    });

    it('keeps the existing role / award / suspension classes', () => {
        const { component } = setup({ user: currentUser() });
        expect(component.serviceEntryClass('role')).toBe('is-role');
        expect(component.serviceEntryClass('award')).toBe('is-medal');
        expect(component.serviceEntryClass('medal')).toBe('is-medal');
        expect(component.serviceEntryClass('suspension')).toBe('is-suspension');
        expect(component.serviceEntryClass('ban')).toBe('is-suspension');
    });

    it('applies the type class to the tag as well as the dot', () => {
        const { el } = setup({
            user: currentUser(),
            serviceRecord: [entry('demotion'), entry('enlistment')],
        });
        const tags = el.querySelectorAll('.timeline-type');
        const dots = el.querySelectorAll('.timeline-dot');
        expect(tags.length).toBe(2);
        expect(tags[0].classList).toContain('is-demotion');
        expect(dots[0].classList).toContain('is-demotion');
        expect(tags[1].classList).toContain('is-neutral');
        expect(dots[1].classList).toContain('is-neutral');
    });
});

describe('ProfileComponent Honours & Decorations (T-0286)', () => {
    function award(overrides: Partial<PublicMemberMedal> = {}): PublicMemberMedal {
        return {
            id: 'a1',
            medalId: 'md1',
            title: 'Marksman',
            glyph: 'M',
            imageUrl: null,
            description: 'Top 5% accuracy across three or more events.',
            awardedAt: '2026-01-01T00:00:00.000Z',
            ...overrides,
        };
    }

    /** MedalComponent is declared for real here — the panel's alignment is
     *  measured against the 64px tile it renders, so a stub would prove nothing. */
    function withMedals(medals: PublicMemberMedal[]): HTMLElement {
        return setup({ member: publicMember({ medals }), realMedals: true }).el;
    }

    it('shows what the medal is FOR — the per-award citation is not even public', () => {
        // Two texts competed for this slot. The per-award citation answers a
        // question the viewer did not ask ("why did they get it") and, for the
        // Discord-derived awards that dominate the live roster, it is the same
        // useless sentence on every medal. The public projection drops it
        // outright (backend PublicMemberMedalDto), so the catalogue criteria —
        // what earning it takes — is the only thing that can appear here.
        const el = withMedals([award()]);
        const desc = el.querySelector('.medal-desc') as HTMLElement;
        expect(desc.textContent!.trim()).toBe('Top 5% accuracy across three or more events.');
    });

    it('dates each award', () => {
        // Shape, not an exact date: DatePipe renders in the VIEWER's zone, so
        // pinning "Jan 1, 2026" would fail the suite anywhere west of UTC.
        const el = withMedals([award()]);
        expect(el.querySelector('.medal-date')!.textContent!.trim()).toMatch(
            /^Awarded [A-Z][a-z]{2} \d{1,2}, \d{4}$/,
        );
    });

    it('omits the description line entirely when the catalogue has none', () => {
        // An admin can save a medal with a blank description; an empty
        // `.medal-desc` would leave the title floating off-centre in a two-line
        // box, which is the very thing this panel was fixed for.
        const el = withMedals([award({ description: null })]);
        expect(el.querySelector('.medal-desc')).toBeNull();
        expect(el.querySelector('.medal-title')!.textContent!.trim()).toBe('Marksman');
    });

    it('renders the awards in the order the API delivered them', () => {
        // The API sorts by medal precedence (backend T-0212) and this view adds
        // no sort of its own. Feeding it a deliberately non-alphabetical,
        // non-chronological order pins that: any client-side sort creeping in
        // later reorders these three and fails here.
        const el = withMedals([
            award({ id: 'a1', medalId: 'md1', title: 'Zulu Cross', awardedAt: '2026-03-01' }),
            award({ id: 'a2', medalId: 'md2', title: 'Alpha Star', awardedAt: '2026-01-01' }),
            award({ id: 'a3', medalId: 'md3', title: 'Mike Ribbon', awardedAt: '2026-02-01' }),
        ]);
        const titles = Array.from(el.querySelectorAll('.medal-title')).map((t) =>
            t.textContent!.trim(),
        );
        expect(titles).toEqual(['Zulu Cross', 'Alpha Star', 'Mike Ribbon']);
    });

    it('centres the title block against the medal tile rather than hanging it off the top', () => {
        // The regression this replaces: `.medal-item { align-items: flex-start }`
        // pinned a ~30px text block to the top of a 64px ribbon, so every entry
        // read as top-aligned. Measured, not asserted from the stylesheet text —
        // a rule can be present and still be overridden. The description is kept
        // to one short line so the text block stays comfortably shorter than the
        // tile; a block as tall as the tile makes "centred" indistinguishable
        // from "top-aligned" and the assertion vacuous.
        const el = withMedals([award({ description: 'Marksmanship.' })]);
        const item = el.querySelector('.medal-item') as HTMLElement;
        const tile = item.querySelector('.hf-medal') as HTMLElement;
        const info = item.querySelector('.medal-info') as HTMLElement;

        const tileBox = tile.getBoundingClientRect();
        const infoBox = info.getBoundingClientRect();
        expect(tileBox.height).toBeGreaterThan(infoBox.height);

        const tileMid = tileBox.top + tileBox.height / 2;
        const infoMid = infoBox.top + infoBox.height / 2;
        expect(Math.abs(tileMid - infoMid)).toBeLessThan(1.5);
    });

    it('lists the decorations in the JSON-LD award array', () => {
        const { tags } = setup({ member: publicMember({ medals: [award()] }) });
        const jsonLd = tags().jsonLd as { mainEntity: { award: string[] } };
        expect(jsonLd.mainEntity.award).toEqual(['Marksman']);
    });
});
