import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { MembersService, ServiceRecordEntry } from '../../../core/services/members.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { AuthService, CurrentUser } from '../../../core/services/auth.service';
import { DEFAULT_STORAGE_POLICY, StorageService } from '../../../core/services/storage.service';
import { Member, MemberMedalAward } from '../../../core/models/member.model';
import { MedalComponent } from '../../../shared/components/medal/medal.component';

function member(overrides: Partial<Member> = {}): Member {
    return {
        id: 'm1',
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

function entry(type: string, id = type): ServiceRecordEntry {
    return {
        id,
        occurredAt: '2026-06-01T12:00:00',
        type,
        event: `Event for ${type}`,
        note: null,
    };
}

function currentUser(): CurrentUser {
    return {
        id: 'm1',
        inGameName: 'Jameson Nolt',
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
    };
}

describe('ProfileComponent service record (T-0253)', () => {
    let fixture: ComponentFixture<ProfileComponent>;
    let component: ProfileComponent;

    function setup(record: ServiceRecordEntry[] = []): void {
        const members = {
            getById: () => of(member()),
            getEvents: () => of([]),
            getRsvps: () => of([]),
            getServiceRecord: () => of(record),
        } as unknown as MembersService;
        const auth = {
            isAdmin: () => false,
            currentUser: signal<CurrentUser | null>(currentUser()),
            loadCurrentUser: () => of(currentUser()),
        } as unknown as AuthService;
        const storage = {
            getPolicy: () => of(DEFAULT_STORAGE_POLICY),
        } as unknown as StorageService;

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            declarations: [ProfileComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(convertToParamMap({ id: 'm1' })) },
                },
                { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
                { provide: Location, useValue: { back: () => undefined } },
                { provide: MembersService, useValue: members },
                { provide: GalleryService, useValue: { getAll: () => of([]) } },
                { provide: AuthService, useValue: auth },
                { provide: StorageService, useValue: storage },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(ProfileComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('gives a demotion its own class, distinct from a promotion', () => {
        setup();
        expect(component.serviceEntryClass('demotion')).toBe('is-demotion');
        expect(component.serviceEntryClass('promotion')).not.toBe('is-demotion');
    });

    it('leaves promotion on the rank class', () => {
        setup();
        expect(component.serviceEntryClass('promotion')).toBe('is-rank');
        expect(component.serviceEntryClass('rank')).toBe('is-rank');
    });

    it('renders an unrecognised type neutrally, never as a promotion', () => {
        // The old `default: return ''` inherited .timeline-dot's brass, which is
        // exactly .is-rank — an unknown type silently claimed a promotion.
        setup();
        const unknown = component.serviceEntryClass('conscription');
        expect(unknown).toBe('is-neutral');
        expect(unknown).not.toBe(component.serviceEntryClass('promotion'));
        expect(unknown).not.toBe('');
    });

    it('renders enlistment neutrally (the API writes it on approval)', () => {
        setup();
        expect(component.serviceEntryClass('enlistment')).toBe('is-neutral');
    });

    it('keeps the existing role / award / suspension classes', () => {
        setup();
        expect(component.serviceEntryClass('role')).toBe('is-role');
        expect(component.serviceEntryClass('award')).toBe('is-medal');
        expect(component.serviceEntryClass('medal')).toBe('is-medal');
        expect(component.serviceEntryClass('suspension')).toBe('is-suspension');
        expect(component.serviceEntryClass('ban')).toBe('is-suspension');
    });

    it('applies the type class to the tag as well as the dot', () => {
        setup([entry('demotion'), entry('enlistment')]);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
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
    let fixture: ComponentFixture<ProfileComponent>;

    function award(overrides: Partial<MemberMedalAward> = {}): MemberMedalAward {
        return {
            id: 'a1',
            medalId: 'md1',
            title: 'Marksman',
            glyph: 'M',
            imageUrl: null,
            description: 'Top 5% accuracy across three or more events.',
            detail: 'Derived from their existing Discord roles',
            awardedAt: '2026-01-01T00:00:00.000Z',
            ...overrides,
        };
    }

    /** MedalComponent is declared for real here — the panel's alignment is
     *  measured against the 64px tile it renders, so a stub would prove nothing. */
    function setup(medalAwards: MemberMedalAward[]): void {
        const members = {
            getById: () => of(member({ medalAwards })),
            getEvents: () => of([]),
            getRsvps: () => of([]),
            getServiceRecord: () => of([]),
        } as unknown as MembersService;
        const auth = {
            isAdmin: () => false,
            currentUser: signal<CurrentUser | null>(currentUser()),
            loadCurrentUser: () => of(currentUser()),
        } as unknown as AuthService;
        const storage = {
            getPolicy: () => of(DEFAULT_STORAGE_POLICY),
        } as unknown as StorageService;

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            declarations: [ProfileComponent, MedalComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(convertToParamMap({ id: 'm1' })) },
                },
                { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
                { provide: Location, useValue: { back: () => undefined } },
                { provide: MembersService, useValue: members },
                { provide: GalleryService, useValue: { getAll: () => of([]) } },
                { provide: AuthService, useValue: auth },
                { provide: StorageService, useValue: storage },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(ProfileComponent);
        fixture.detectChanges();
    }

    function el(): HTMLElement {
        return fixture.nativeElement as HTMLElement;
    }

    it('shows what the medal is FOR, not why this award was handed over', () => {
        // Two texts compete for the same slot. The per-award citation answers a
        // question the viewer did not ask ("why did they get it") and, for the
        // Discord-derived awards that dominate the live roster, it is the same
        // useless sentence on every medal. The catalogue description answers the
        // one they did: what does earning this take.
        setup([award()]);
        const desc = el().querySelector('.medal-desc') as HTMLElement;
        expect(desc.textContent!.trim()).toBe('Top 5% accuracy across three or more events.');
        expect(desc.textContent).not.toContain('Derived from their existing Discord roles');
    });

    it('omits the description line entirely when the catalogue has none', () => {
        // An admin can save a medal with a blank description; an empty
        // `.medal-desc` would leave the title floating off-centre in a two-line
        // box, which is the very thing this panel was fixed for.
        setup([award({ description: null })]);
        expect(el().querySelector('.medal-desc')).toBeNull();
        expect(el().querySelector('.medal-title')!.textContent!.trim()).toBe('Marksman');
    });

    it('renders the awards in the order the API delivered them', () => {
        // The API sorts by medal precedence (backend T-0212) and this view adds
        // no sort of its own. Feeding it a deliberately non-alphabetical,
        // non-chronological order pins that: any client-side sort creeping in
        // later reorders these three and fails here.
        setup([
            award({ id: 'a1', medalId: 'md1', title: 'Zulu Cross', awardedAt: '2026-03-01' }),
            award({ id: 'a2', medalId: 'md2', title: 'Alpha Star', awardedAt: '2026-01-01' }),
            award({ id: 'a3', medalId: 'md3', title: 'Mike Ribbon', awardedAt: '2026-02-01' }),
        ]);
        const titles = Array.from(el().querySelectorAll('.medal-title')).map((t) =>
            t.textContent!.trim(),
        );
        expect(titles).toEqual(['Zulu Cross', 'Alpha Star', 'Mike Ribbon']);
    });

    it('centres the title block against the medal tile rather than hanging it off the top', () => {
        // The regression this replaces: `.medal-item { align-items: flex-start }`
        // pinned a ~30px text block to the top of a 64px ribbon, so every entry
        // read as top-aligned. Measured, not asserted from the stylesheet text —
        // a rule can be present and still be overridden.
        setup([award()]);
        const item = el().querySelector('.medal-item') as HTMLElement;
        const tile = item.querySelector('.hf-medal') as HTMLElement;
        const info = item.querySelector('.medal-info') as HTMLElement;

        const tileBox = tile.getBoundingClientRect();
        const infoBox = info.getBoundingClientRect();
        // The tile has to be the taller of the two, or "centred" is vacuous.
        expect(tileBox.height).toBeGreaterThan(infoBox.height);

        const tileMid = tileBox.top + tileBox.height / 2;
        const infoMid = infoBox.top + infoBox.height / 2;
        expect(Math.abs(tileMid - infoMid)).toBeLessThan(1.5);
    });
});
