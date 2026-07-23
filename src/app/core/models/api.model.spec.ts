import { ApiApplication, mapApplication } from './api.model';

function apiApplication(overrides: Partial<ApiApplication> = {}): ApiApplication {
    return {
        id: 'a1',
        applicantName: 'Jane Doe',
        discordTag: 'jane#0001',
        inGameName: 'Jane',
        applicantType: 'Member',
        currentRegiment: '',
        howFound: 'A friend',
        preferredClasses: 'Line Infantry',
        skillsToImprove: 'Communication',
        interestConfirmed: true,
        representativeNote: null,
        status: 'pending',
        isReapplication: false,
        mutualEventsCount: 0,
        moderatorNote: null,
        declineReason: null,
        promotedMemberId: null,
        currentDisplayName: null,
        currentAvatarUrl: null,
        decidedByMemberId: null,
        submittedAt: '2026-07-18T00:00:00.000Z',
        decidedAt: null,
        createdAt: '2026-07-18T00:00:00.000Z',
        ...overrides,
    };
}

describe('mapApplication', () => {
    it('maps a present blocked flag through to the view model', () => {
        expect(mapApplication(apiApplication({ blocked: true })).blocked).toBe(true);
        expect(mapApplication(apiApplication({ blocked: false })).blocked).toBe(false);
    });

    it('defaults blocked to false when the field is absent', () => {
        expect(mapApplication(apiApplication()).blocked).toBe(false);
    });

    it('maps the live applicant identity + promoted member id (T-0222)', () => {
        const mapped = mapApplication(
            apiApplication({
                promotedMemberId: 'mem-42',
                currentDisplayName: 'RenamedRecruit',
                currentAvatarUrl: 'https://cdn/member.png',
            }),
        );
        expect(mapped.promotedMemberId).toBe('mem-42');
        expect(mapped.currentDisplayName).toBe('RenamedRecruit');
        expect(mapped.currentAvatarUrl).toBe('https://cdn/member.png');
    });

    it('passes through null live-identity fields for an unpromoted applicant (T-0222)', () => {
        const mapped = mapApplication(apiApplication());
        expect(mapped.promotedMemberId).toBeNull();
        expect(mapped.currentDisplayName).toBeNull();
        expect(mapped.currentAvatarUrl).toBeNull();
    });

    it('carries the deciding officer’s member id so the chip can link (T-0274)', () => {
        const mapped = mapApplication(
            apiApplication({
                status: 'approved',
                decidedByMemberId: 'mem-hale',
                decidedByName: 'Colonel Hale',
                decidedByAvatarUrl: 'https://cdn/hale.png',
            }),
        );
        expect(mapped.decidedByMemberId).toBe('mem-hale');
        expect(mapped.decidedByName).toBe('Colonel Hale');
        expect(mapped.decidedByAvatarUrl).toBe('https://cdn/hale.png');
    });

    it('nulls the officer id rather than dropping it when there is no decider (T-0274)', () => {
        // Explicit null, not undefined: the attribution chip tests `memberId`
        // directly to decide whether to render a link.
        expect(mapApplication(apiApplication()).decidedByMemberId).toBeNull();
    });
});
