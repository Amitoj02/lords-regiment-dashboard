import {
    INACTIVE_AFTER_DAYS,
    Member,
    deriveMemberStatus,
    statusTooltip,
    statusVariant,
} from './member.model';

const DAY = 86_400_000;
// A fixed "now" so the relative-date assertions are deterministic.
const NOW = Date.parse('2026-07-18T00:00:00.000Z');

function member(overrides: Partial<Member> = {}): Member {
    return {
        id: 'm1',
        discordTag: 'user#0001',
        inGameName: 'Jane Doe',
        rank: 'Private',
        rankImageUrl: null,
        role: 'Member',
        discordLinked: true,
        status: 'Active',
        // Recently seen by default → Active.
        lastSeen: new Date(NOW - 2 * DAY).toISOString(),
        suspendedUntil: null,
        bannedAt: null,
        ...overrides,
    };
}

describe('deriveMemberStatus (T-0184)', () => {
    it('Banned wins over every other signal', () => {
        const m = member({
            bannedAt: new Date(NOW - 1 * DAY).toISOString(),
            suspendedUntil: new Date(NOW + 10 * DAY).toISOString(),
            status: 'Pending',
            lastSeen: new Date(NOW - 90 * DAY).toISOString(),
        });
        expect(deriveMemberStatus(m, NOW)).toBe('Banned');
    });

    it('Suspended when suspendedUntil is in the future', () => {
        const m = member({ suspendedUntil: new Date(NOW + 3 * DAY).toISOString() });
        expect(deriveMemberStatus(m, NOW)).toBe('Suspended');
    });

    it('a past suspendedUntil does not suspend (falls through)', () => {
        const m = member({ suspendedUntil: new Date(NOW - 3 * DAY).toISOString() });
        expect(deriveMemberStatus(m, NOW)).toBe('Active');
    });

    it('Pending takes precedence over the inactivity check', () => {
        // An applicant with an old/absent lastSeen must read Pending, not Inactive.
        const m = member({ status: 'Pending', lastSeen: new Date(NOW - 90 * DAY).toISOString() });
        expect(deriveMemberStatus(m, NOW)).toBe('Pending');
    });

    it('Inactive after more than 21 days without a sign-in', () => {
        const m = member({ lastSeen: new Date(NOW - 22 * DAY).toISOString() });
        expect(deriveMemberStatus(m, NOW)).toBe('Inactive');
    });

    it('Active when the last sign-in is within 21 days', () => {
        const m = member({ lastSeen: new Date(NOW - 20 * DAY).toISOString() });
        expect(deriveMemberStatus(m, NOW)).toBe('Active');
    });

    it('an empty lastSeen never yields Inactive/NaN', () => {
        const m = member({ lastSeen: '' });
        expect(deriveMemberStatus(m, NOW)).toBe('Active');
    });

    it('INACTIVE_AFTER_DAYS is 21', () => {
        expect(INACTIVE_AFTER_DAYS).toBe(21);
    });
});

describe('statusVariant (T-0184)', () => {
    it('maps each derived status to its badge variant', () => {
        expect(statusVariant('Active')).toBe('laurel');
        expect(statusVariant('Pending')).toBe('brass');
        expect(statusVariant('Inactive')).toBe('parch');
        expect(statusVariant('Suspended')).toBe('ox');
        expect(statusVariant('Banned')).toBe('ox');
    });
});

describe('statusTooltip (T-0184)', () => {
    it('explains a ban with the ban date', () => {
        const m = member({ bannedAt: '2026-07-01T00:00:00.000Z' });
        expect(statusTooltip(m)).toContain('Banned on');
        expect(statusTooltip(m)).toContain('removed from the regiment');
    });

    it('explains a suspension with the until date', () => {
        // Anchored to the REAL clock, not the fixed NOW: statusTooltip re-derives
        // the status via deriveMemberStatus()'s `now = Date.now()` default, so a
        // NOW-relative date silently expires and the member reads back as Active.
        const m = member({ suspendedUntil: new Date(Date.now() + 5 * DAY).toISOString() });
        expect(statusTooltip(m)).toContain('Suspended until');
    });

    it('explains inactivity with the threshold', () => {
        const m = member({ lastSeen: new Date(Date.now() - 40 * DAY).toISOString() });
        expect(statusTooltip(m)).toContain('21 days');
    });

    it('explains a pending application', () => {
        const m = member({ status: 'Pending' });
        expect(statusTooltip(m)).toContain('awaiting review');
    });
});
