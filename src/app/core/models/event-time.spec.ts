import { instantToWallClock, wallClockToInstant } from './event-time';

/**
 * These tests all pin an EXPLICIT timezone rather than the viewer's, so they are
 * machine-independent: a suite that only passes on a UTC CI box would hide
 * exactly the class of bug this file exists to fix.
 */
describe('event-time', () => {
    describe('instantToWallClock', () => {
        it('renders a stored UTC instant in the requested zone', () => {
            // The bug this replaces: the old mapper split the string literally and
            // printed 01:57 while labelling it America/New_York.
            expect(instantToWallClock('2026-07-21T01:57:00Z', 'America/New_York')).toEqual({
                date: '2026-07-20',
                time: '21:57',
            });
        });

        it('resolves the offset PER DATE, not once', () => {
            // Same wall clock, opposite sides of the DST boundary: EDT (-4) in July,
            // EST (-5) in January. A hard-coded offset gets one of these wrong.
            expect(instantToWallClock('2026-07-21T01:57:00Z', 'America/New_York')?.time).toBe(
                '21:57',
            );
            expect(instantToWallClock('2026-01-21T02:57:00Z', 'America/New_York')?.time).toBe(
                '21:57',
            );
        });

        it('rolls the LOCAL DATE back across midnight, not just the time', () => {
            // An event can legitimately fall on a different calendar day for the
            // viewer than the one in the stored instant.
            expect(instantToWallClock('2026-07-21T01:57:00Z', 'America/New_York')?.date).toBe(
                '2026-07-20',
            );
            // ...and forward, going the other way.
            expect(instantToWallClock('2026-07-20T22:00:00Z', 'Asia/Tokyo')).toEqual({
                date: '2026-07-21',
                time: '07:00',
            });
        });

        it('handles a half-hour offset zone', () => {
            expect(instantToWallClock('2026-07-20T12:00:00Z', 'Asia/Kolkata')?.time).toBe('17:30');
        });

        it('returns null for an unparseable instant so callers can fall back', () => {
            expect(instantToWallClock('not-a-date', 'UTC')).toBeNull();
        });

        it('degrades to the viewer zone for an unknown timezone rather than throwing', () => {
            // A page the user is trying to read must not blow up on bad config.
            expect(() => instantToWallClock('2026-07-20T12:00:00Z', 'Mars/Olympus')).not.toThrow();
            expect(instantToWallClock('2026-07-20T12:00:00Z', 'Mars/Olympus')).not.toBeNull();
        });
    });

    describe('wallClockToInstant', () => {
        it('anchors a naive wall clock in the chosen zone', () => {
            expect(wallClockToInstant('2026-07-20', '21:57', 'America/New_York')).toBe(
                '2026-07-21T01:57:00.000Z',
            );
        });

        it('uses the offset in force on that date (EST vs EDT)', () => {
            expect(wallClockToInstant('2026-01-20', '21:57', 'America/New_York')).toBe(
                '2026-01-21T02:57:00.000Z',
            );
        });

        it('is correct for a time just after a spring-forward transition', () => {
            // 2026-03-08 02:00 EST -> 03:00 EDT. 03:30 exists and is EDT (-4).
            expect(wallClockToInstant('2026-03-08', '03:30', 'America/New_York')).toBe(
                '2026-03-08T07:30:00.000Z',
            );
        });

        it('is correct for a time just before a spring-forward transition', () => {
            // 01:30 on the same day is still EST (-5).
            expect(wallClockToInstant('2026-03-08', '01:30', 'America/New_York')).toBe(
                '2026-03-08T06:30:00.000Z',
            );
        });

        it('accepts HH:mm and HH:mm:ss alike', () => {
            expect(wallClockToInstant('2026-07-20', '21:57:00', 'America/New_York')).toBe(
                '2026-07-21T01:57:00.000Z',
            );
        });

        it('returns null for missing parts', () => {
            expect(wallClockToInstant('', '21:57', 'UTC')).toBeNull();
            expect(wallClockToInstant('2026-07-20', '', 'UTC')).toBeNull();
        });
    });

    describe('the two directions are exact inverses', () => {
        // This is the invariant that keeps an edit-save from drifting: the form
        // prefills through instantToWallClock and submits through
        // wallClockToInstant. If they ever disagree, every save shifts the event.
        const zones = [
            'UTC',
            'America/New_York',
            'Europe/Berlin',
            'Asia/Kolkata',
            'Pacific/Auckland',
        ];
        const instants = [
            '2026-07-21T01:57:00.000Z',
            '2026-01-21T02:57:00.000Z',
            '2026-03-08T07:30:00.000Z',
            '2026-11-01T05:00:00.000Z',
        ];

        for (const zone of zones) {
            for (const instant of instants) {
                it(`round-trips ${instant} through ${zone}`, () => {
                    const wall = instantToWallClock(instant, zone);
                    expect(wall).not.toBeNull();
                    expect(wallClockToInstant(wall!.date, wall!.time, zone)).toBe(instant);
                });
            }
        }
    });
});
