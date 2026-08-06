import { formatCount } from './format-count';

describe('formatCount (T-0311)', () => {
    it('leaves anything under a thousand exact', () => {
        // The rule that matters: 640 is a fact a reader can hold, and "0.6k" is
        // the same fact made vaguer for no gain in width.
        expect(formatCount(0)).toBe('0');
        expect(formatCount(1)).toBe('1');
        expect(formatCount(47)).toBe('47');
        expect(formatCount(640)).toBe('640');
        expect(formatCount(999)).toBe('999');
    });

    it('compacts to one decimal from a thousand up', () => {
        expect(formatCount(1000)).toBe('1k');
        expect(formatCount(1247)).toBe('1.2k');
        expect(formatCount(4830)).toBe('4.8k');
        expect(formatCount(9949)).toBe('9.9k');
    });

    it('drops a trailing .0 rather than showing 2.0k', () => {
        expect(formatCount(2000)).toBe('2k');
        expect(formatCount(1960)).toBe('2k');
    });

    it('rounds to nearest, not down — a lagging counter is the catchable bug', () => {
        expect(formatCount(1950)).toBe('2k');
        expect(formatCount(1940)).toBe('1.9k');
    });

    it('drops the decimal past ten thousand, so it never exceeds four characters', () => {
        expect(formatCount(10000)).toBe('10k');
        expect(formatCount(12500)).toBe('13k');
        expect(formatCount(999_400)).toBe('999k');
        for (const n of [0, 47, 999, 1000, 9949, 10_000, 999_400]) {
            expect(formatCount(n).length).toBeLessThanOrEqual(4);
        }
    });

    it('clamps the values the API cannot produce, rather than rendering NaN', () => {
        expect(formatCount(-3)).toBe('0');
        expect(formatCount(Number.NaN)).toBe('0');
        expect(formatCount(Number.POSITIVE_INFINITY)).toBe('0');
    });
});
