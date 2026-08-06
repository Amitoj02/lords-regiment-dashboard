/**
 * A like/view figure, rendered for a chip that has to stay four characters wide
 * (T-0311).
 *
 * ── WHY IT COMPACTS ONLY ABOVE A THOUSAND ───────────────────────────────────
 * The card's meta row shares one line with the submitter's name, which already
 * gets ellipsised at narrow widths. A count that grows with the number would
 * eat that name. But compacting EARLY is worse than not compacting at all: "640
 * views" is a fact a reader can hold, and "0.6k views" is the same fact made
 * vaguer for no gain in width. So the rule is exact below 1000, one decimal to
 * 9.9k, and whole thousands beyond — never more than four characters, never
 * losing precision it did not have to.
 *
 * Rounding is toward the nearest, not down: 1,950 reads as `2k`, not `1.9k`. A
 * counter that lags reality is the one thing a reader can actually catch it at.
 * The trailing `.0` is stripped so 2,000 is `2k` rather than `2.0k`.
 *
 * Negative and non-finite inputs cannot arise from the API (both counts are
 * `COUNT(*)`), so they are clamped rather than handled: the chip shows `0`
 * instead of `NaN` or `-3` if something upstream ever goes wrong.
 */
export function formatCount(value: number): string {
    if (!Number.isFinite(value) || value <= 0) {
        return '0';
    }
    if (value < 1000) {
        return String(Math.round(value));
    }
    if (value < 10000) {
        return `${(Math.round(value / 100) / 10).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return `${Math.round(value / 1000)}k`;
}
