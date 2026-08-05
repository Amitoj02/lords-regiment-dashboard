import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MembersService } from './members.service';
import { ApiMember, ApiMemberMedal } from '../models/api.model';
import { Member } from '../models/member.model';

/** The permitted-actions block as the API sends it (CONTRACT §3, backend T-0176). */
const PERMITTED_ALL = {
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

function apiMember(overrides: Partial<ApiMember> = {}): ApiMember {
    return {
        id: 'm1',
        inGameName: 'Jameson Nolt',
        role: 'Member',
        status: 'Active',
        rank: 'Sergeant',
        rankId: 'r1',
        rankImageUrl: null,
        rankPrecedence: 5,
        discordTag: 'nolt#0001',
        discordLinked: true,
        publicProfile: true,
        avatarUrl: null,
        bannerUrl: null,
        bio: null,
        socialLinks: [],
        standing: null,
        joinedAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-07-01T00:00:00Z',
        eventsAttended: 3,
        suspendedUntil: null,
        bannedAt: null,
        medals: [],
        ...overrides,
    };
}

/**
 * Attach the permitted-actions block. Typed `unknown` (and cast back) because
 * several specs below deliberately send a MALFORMED block, which the interface
 * cannot express — the point is that the mapper normalises it rather than
 * trusting the wire.
 */
function withPermissions(raw: ApiMember, permittedActions: unknown): ApiMember {
    return { ...raw, permittedActions } as ApiMember;
}

describe('MembersService permittedActions (T-0266)', () => {
    let service: MembersService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
        });
        service = TestBed.inject(MembersService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('carries the block through the list projection', () => {
        let result: Member[] | undefined;
        service.getAll().subscribe((rows) => (result = rows));
        httpMock.expectOne('/api/members?limit=100').flush({
            data: [withPermissions(apiMember(), PERMITTED_ALL)],
            meta: { page: 1, limit: 100, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        });

        expect(result?.[0].permittedActions).toEqual(PERMITTED_ALL);
    });

    it('carries the block through the detail projection', () => {
        let result: Member | undefined;
        service.getById('m1').subscribe((m) => (result = m));
        httpMock
            .expectOne('/api/members/m1')
            .flush(withPermissions(apiMember(), { ...PERMITTED_ALL, ban: false }));

        expect(result?.permittedActions?.ban).toBe(false);
        expect(result?.permittedActions?.suspend).toBe(true);
    });

    it('carries the refreshed block back from an admin action', () => {
        // The modal re-gates itself off the member each action returns, so the
        // block has to survive the write endpoints too.
        let result: Member | undefined;
        service.changeRole('m1', 'Moderator').subscribe((m) => (result = m));
        httpMock
            .expectOne('/api/members/m1/role')
            .flush(withPermissions(apiMember({ role: 'Moderator' }), PERMITTED_ALL));

        expect(result?.role).toBe('Moderator');
        expect(result?.permittedActions).toEqual(PERMITTED_ALL);
    });

    it('leaves permittedActions undefined when the API omits the block', () => {
        // Fail closed: the UI reads "absent" as "nothing permitted", so the mapper
        // must not invent a block of any kind.
        let result: Member | undefined;
        service.getById('m1').subscribe((m) => (result = m));
        httpMock.expectOne('/api/members/m1').flush(apiMember());

        expect(result?.permittedActions).toBeUndefined();
    });

    it('reads any non-true flag as a denial', () => {
        let result: Member | undefined;
        service.getById('m1').subscribe((m) => (result = m));
        httpMock.expectOne('/api/members/m1').flush(
            withPermissions(apiMember(), {
                changeRole: 'yes',
                changeRank: 1,
                awardMedal: null,
                suspend: true,
            }),
        );

        expect(result?.permittedActions).toEqual({
            changeRole: false,
            changeRank: false,
            awardMedal: false,
            removeMedal: false,
            suspend: true,
            unsuspend: false,
            ban: false,
            unban: false,
            deriveFromDiscord: false,
        });
    });

    it('ignores a non-object block rather than trusting it', () => {
        let result: Member | undefined;
        service.getById('m1').subscribe((m) => (result = m));
        httpMock.expectOne('/api/members/m1').flush(withPermissions(apiMember(), true));

        expect(result?.permittedActions).toBeUndefined();
    });
});

describe('MembersService medal awards (T-0286)', () => {
    let service: MembersService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
        });
        service = TestBed.inject(MembersService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    function wireAward(over: Partial<ApiMemberMedal> = {}): ApiMemberMedal {
        return {
            id: 'a1',
            medalId: 'md1',
            title: 'Marksman',
            glyph: 'M',
            imageUrl: null,
            description: 'Top 5% accuracy across three or more events.',
            detail: 'Derived from their existing Discord roles',
            awardedAt: '2026-01-01T00:00:00Z',
            ...over,
        };
    }

    it('carries the catalogue description across the wire boundary', () => {
        // `mapMedalAward` is a whitelist copy, so a field the backend adds is
        // dropped silently — with no type error — unless the mapper is taught
        // about it. That silence is the whole reason this test exists.
        let result: Member | undefined;
        service.getById('m1').subscribe((m) => (result = m));
        httpMock.expectOne('/api/members/m1').flush(apiMember({ medals: [wireAward()] }));

        const awarded = result?.medalAwards?.[0];
        expect(awarded?.description).toBe('Top 5% accuracy across three or more events.');
        // The citation survives too — they are two fields, not a rename.
        expect(awarded?.detail).toBe('Derived from their existing Discord roles');
    });

    it('keeps a missing description null instead of undefined', () => {
        let result: Member | undefined;
        service.getById('m1').subscribe((m) => (result = m));
        httpMock
            .expectOne('/api/members/m1')
            .flush(apiMember({ medals: [wireAward({ description: null })] }));

        expect(result?.medalAwards?.[0].description).toBeNull();
    });

    it('preserves the order the API sent, medal for medal', () => {
        // Ordering is the server's job (backend T-0212 sorts by medal
        // precedence). The mapper must not reorder, dedupe or collapse repeats.
        let result: Member | undefined;
        service.getById('m1').subscribe((m) => (result = m));
        httpMock.expectOne('/api/members/m1').flush(
            apiMember({
                medals: [
                    wireAward({ id: 'a1', medalId: 'md-senior' }),
                    wireAward({ id: 'a2', medalId: 'md-senior' }),
                    wireAward({ id: 'a3', medalId: 'md-junior' }),
                ],
            }),
        );

        expect(result?.medalAwards?.map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
        expect(result?.medalAwards?.map((a) => a.medalId)).toEqual([
            'md-senior',
            'md-senior',
            'md-junior',
        ]);
    });
});
