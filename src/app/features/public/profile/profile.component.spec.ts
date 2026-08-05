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
import { MemberSocialLink } from '../../../core/models/social-link.model';
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
        bio: null,
        socialLinks: [],
        medals: [],
        canonicalPath: '/u/@panda',
        ...overrides,
    };
}

/** One public linked account, as the API emits it (T-0289). */
function socialLink(overrides: Partial<MemberSocialLink> = {}): MemberSocialLink {
    return {
        platform: 'twitch',
        label: 'Twitch',
        handle: 'jamesonnolt',
        url: 'https://www.twitch.tv/jamesonnolt',
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

function upcomingEvent(): RegimentEvent {
    return {
        id: 'e2',
        title: 'Line Battle vs 1erRAC',
        date: '2026-08-09',
        startTime: '20:00',
        status: 'upcoming',
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
    rsvps?: RegimentEvent[];
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
        getRsvps: jasmine.createSpy('getRsvps').and.returnValue(of(options.rsvps ?? [])),
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
        expect(el.querySelector('.dossier-name')!.textContent!.trim()).toBe('Jameson Nolt');
        expect(el.querySelector('.dossier-rank-name')!.textContent!.trim()).toBe('Sergeant');
        expect(el.querySelector('.dossier-handle')!.textContent!.trim()).toBe('@panda');
    });

    it('shows no Last Access row and no Discord tag anywhere on the page', () => {
        const { component, el } = setup();
        expect(labels(el).some((l) => l.startsWith('Last Access'))).toBeFalse();
        expect(labels(el).some((l) => l.startsWith('Discord'))).toBeFalse();
        // The chip row is fed from the same enriched projection, so a guest is
        // not merely not-shown the tag — there is no tag to show.
        expect(component.discordTag).toBeNull();
    });

    it('says WHICH particulars are behind the sign-in rather than just omitting them', () => {
        // A shorter list with nothing said about it reads as "this member has no
        // history", which is a different and wrong claim.
        const { el } = setup();
        expect(el.querySelector('.dossier-gated')!.textContent).toContain('need a sign-in');
    });

    it('still renders the Activity segment, with a lock on it', () => {
        // Hiding it outright would show a crawler a different set of controls
        // than a member sees. A visibly locked segment says the same to both.
        const { el } = setup();
        const tabs = Array.from(el.querySelectorAll('.profile-segment')).map((t) =>
            t.textContent!.trim(),
        );
        expect(tabs.length).toBe(2);
        expect(tabs[0]).toContain('Gallery');
        expect(tabs[1]).toContain('Activity');
        expect(el.querySelectorAll('.tab-lock').length).toBe(1);
    });

    it('shows the sign-in panel instead of event rows when Activity is selected', () => {
        const { component, fixture, el } = setup({ events: [attendedEvent()] });
        component.setTab('activity');
        fixture.detectChanges();
        expect(el.querySelector('.profile-locked')).not.toBeNull();
        expect(el.querySelector('.event-history-row')).toBeNull();
        expect(el.textContent).not.toContain('Line Battle vs 84e');
    });

    it('never opens the Service Record or the admin actions', () => {
        const { component, el } = setup();
        expect(component.canViewPrivate).toBeFalse();
        expect(component.canAdminAct).toBeFalse();
        // Not locked — absent. There is nothing behind a sign-in to promise a
        // stranger here, so offering a padlock would be a lie.
        expect(component.visibleTabs).not.toContain('record');
        expect(el.querySelector('.timeline')).toBeNull();
    });

    it("publishes the bio and the linked accounts — they are the member's own", () => {
        const { component, el } = setup({
            member: publicMember({
                bio: 'Runs the Tuesday drill.',
                socialLinks: [socialLink()],
            }),
        });
        expect(el.querySelector('.dossier-bio')!.textContent!.trim()).toBe(
            'Runs the Tuesday drill.',
        );
        expect(component.socialLinks.length).toBe(1);
        expect(el.querySelector('.dossier-elsewhere')).not.toBeNull();
    });

    it('draws no bio paragraph and no Elsewhere row when there is nothing in them', () => {
        // An empty section is a section the reader has to decide to ignore.
        const { el } = setup();
        expect(el.querySelector('.dossier-bio')).toBeNull();
        expect(el.querySelector('.dossier-elsewhere')).toBeNull();
    });

    it('treats a whitespace-only bio as no bio', () => {
        const { component } = setup({ member: publicMember({ bio: '   \n ' }) });
        expect(component.bio).toBeNull();
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
        const { component, members, el } = setup({ user: currentUser({ id: 'someone-else' }) });
        expect(members.getById).toHaveBeenCalledWith(SHORT_ID);
        expect(members.getEvents).toHaveBeenCalledWith(SHORT_ID);
        expect(members.getRsvps).toHaveBeenCalledWith(SHORT_ID);
        expect(component.discordTag).toBe('nolt#0001');
        expect(labels(el).some((l) => l.startsWith('Discord'))).toBeTrue();
        expect(labels(el).some((l) => l.startsWith('Last Access'))).toBeTrue();
        expect(el.querySelector('.dossier-gated')).toBeNull();
    });

    it('unlocks Activity', () => {
        const { component, fixture, el } = setup({
            user: currentUser({ id: 'someone-else' }),
            events: [attendedEvent()],
        });
        component.setTab('activity');
        fixture.detectChanges();
        expect(el.querySelector('.profile-locked')).toBeNull();
        expect(el.querySelector('.event-title')!.textContent!.trim()).toBe('Line Battle vs 84e');
    });

    it('merges RSVPs and attendances into one list, newest first', () => {
        const { component } = setup({
            user: currentUser({ id: 'someone-else' }),
            events: [attendedEvent()],
            rsvps: [upcomingEvent()],
        });
        expect(component.activity.map((e) => e.id)).toEqual(['e2', 'e1']);
        expect(component.activity.map((e) => e.status)).toEqual(['Going', 'Attended']);
    });

    it('lists an event you RSVPd to AND attended once, as attended', () => {
        // Two rows for one battle — a promise and then the fact — reads as two
        // battles.
        const { component } = setup({
            user: currentUser({ id: 'someone-else' }),
            events: [attendedEvent()],
            rsvps: [attendedEvent()],
        });
        expect(component.activity.length).toBe(1);
        expect(component.activity[0].status).toBe('Attended');
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
        const { component, el } = setup({
            user: currentUser({ id: 'someone-else' }),
            enrichmentFails: true,
        });
        expect(el.querySelector('.dossier-name')).not.toBeNull();
        expect(component.discordTag).toBeNull();
        expect(labels(el).some((l) => l.startsWith('Discord'))).toBeFalse();
        expect(labels(el).some((l) => l.startsWith('Last Access'))).toBeFalse();
    });

    it('offers its own profile an edit link to /account, not an inline editor', () => {
        // The editor moved to /account with the rest of a member's settings.
        const { el } = setup({ user: currentUser() });
        const edit = el.querySelector('.dossier-actions a') as HTMLAnchorElement;
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
        const { component, fixture, el } = setup({
            user: currentUser(),
            serviceRecord: [entry('demotion'), entry('enlistment')],
        });
        // The record is a SEGMENT now, not a panel stacked under whichever tab
        // happened to be open (T-0289).
        component.setTab('record');
        fixture.detectChanges();
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
        const desc = el.querySelector('.honour-desc') as HTMLElement;
        expect(desc.textContent!.trim()).toBe('Top 5% accuracy across three or more events.');
    });

    it('dates each award', () => {
        // Shape, not an exact date: DatePipe renders in the VIEWER's zone, so
        // pinning "Jan 1, 2026" would fail the suite anywhere west of UTC.
        const el = withMedals([award()]);
        expect(el.querySelector('.honour-date')!.textContent!.trim()).toMatch(
            /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/,
        );
    });

    it('omits the description line entirely when the catalogue has none', () => {
        // An admin can save a medal with a blank description; an empty
        // `.medal-desc` would leave the title floating off-centre in a two-line
        // box, which is the very thing this panel was fixed for.
        const el = withMedals([award({ description: null })]);
        expect(el.querySelector('.honour-desc')).toBeNull();
        expect(el.querySelector('.honour-title')!.textContent!.trim()).toBe('Marksman');
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
        const titles = Array.from(el.querySelectorAll('.honour-title')).map((t) =>
            t.textContent!.trim(),
        );
        expect(titles).toEqual(['Zulu Cross', 'Alpha Star', 'Mike Ribbon']);
    });

    it('centres the medal against the title block rather than hanging one off the top', () => {
        // The regression this guards: `align-items: flex-start` on the row pinned
        // the ribbon to the top of a two-line text block, so every entry read as
        // top-aligned. Measured, not asserted from the stylesheet text — a rule
        // can be present and still be overridden.
        //
        // The redesign (T-0289) flipped which side is taller: the medal is now a
        // 30px `md` tile beside a title-and-criteria block, where it used to be a
        // 64px `lg` tile beside two short lines. The assertion is therefore on
        // the two mid-lines coinciding, which holds whichever is taller and is
        // exactly what `align-items: center` buys.
        const el = withMedals([award({ description: 'Marksmanship.' })]);
        const item = el.querySelector('.honour-row') as HTMLElement;
        const tile = item.querySelector('.hf-medal') as HTMLElement;
        const info = item.querySelector('.honour-body') as HTMLElement;

        const tileBox = tile.getBoundingClientRect();
        const infoBox = info.getBoundingClientRect();
        // Both boxes must actually have been laid out, or the mid-line test below
        // passes vacuously on two zero-height rects stacked at the same origin.
        expect(tileBox.height).toBeGreaterThan(0);
        expect(infoBox.height).toBeGreaterThan(0);

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
