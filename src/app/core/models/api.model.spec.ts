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
});
