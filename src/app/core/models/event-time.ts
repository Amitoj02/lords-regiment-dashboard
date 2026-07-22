/**
 * Timezone conversion for events (T-0237 display, T-0251 authoring).
 *
 * ## Why this file exists
 * `mapEvent` used to split the ISO string literally — `'2026-07-21T01:57:00Z'`
 * became date `2026-07-21`, time `01:57` — which is the stored UTC instant, not
 * a time any human is at. Every events surface printed UTC while labelling it
 * with the event's timezone name.
 *
 * Display and authoring live together HERE on purpose. They are exact inverses,
 * and the moment they disagree every edit-save silently shifts the event by an
 * offset: the form prefills from one conversion and submits through the other.
 * Splitting them across two files is how that bug gets reintroduced.
 *
 * ## Why no library
 * The SPA carries no date dependency and adding one for this is not warranted.
 * `Intl.DateTimeFormat` with a `timeZone` is DST-correct and resolves the offset
 * PER DATE, which is the whole requirement — a hard-coded offset would be wrong
 * for half the year.
 */

/** Wall-clock parts as the form and the templates use them. */
export interface WallClock {
    /** `YYYY-MM-DD` */
    date: string;
    /** `HH:mm` (24-hour) */
    time: string;
}

/**
 * The offset of `timeZone` at a given instant, in milliseconds
 * (`local - UTC`; negative west of Greenwich).
 *
 * Works by formatting the instant IN the zone, reading the resulting wall-clock
 * fields back as if they were UTC, and taking the difference. This is the
 * standard Intl-only technique and is correct across DST because the offset is
 * derived from the formatter at that specific instant rather than assumed.
 */
function zoneOffsetMs(timeZone: string, at: Date): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(at);

    const field = (type: string): number =>
        Number(parts.find((part) => part.type === type)?.value ?? '0');

    // `hour12: false` can render midnight as hour 24; Date.UTC normalises it.
    const asUtc = Date.UTC(
        field('year'),
        field('month') - 1,
        field('day'),
        field('hour'),
        field('minute'),
        field('second'),
    );
    return asUtc - at.getTime();
}

/** True when the zone is one `Intl` actually understands. */
function isValidZone(timeZone: string | null | undefined): timeZone is string {
    if (!timeZone) {
        return false;
    }
    try {
        new Intl.DateTimeFormat('en-US', { timeZone });
        return true;
    } catch {
        return false;
    }
}

/**
 * Render an instant as wall-clock parts in `timeZone` (or the viewer's own zone
 * when omitted).
 *
 * Returns null for an unparseable instant so callers can fall back rather than
 * printing `NaN`. An unknown `timeZone` degrades to the viewer's zone, matching
 * the API's own "unknown zone resolves to a sane default" behaviour instead of
 * throwing on a page the user is trying to read.
 */
export function instantToWallClock(iso: string, timeZone?: string | null): WallClock | null {
    const at = new Date(iso);
    if (isNaN(at.getTime())) {
        return null;
    }
    const zone = isValidZone(timeZone)
        ? timeZone
        : Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Shift the instant by the zone offset, then read the UTC fields: that gives
    // the wall clock in `zone` without any string parsing.
    const shifted = new Date(at.getTime() + zoneOffsetMs(zone, at));
    const pad = (n: number): string => String(n).padStart(2, '0');
    return {
        date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
        time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
    };
}

/**
 * The inverse: a wall clock in `timeZone` back to an absolute instant.
 *
 * Used when AUTHORING an event, where the admin picks a time in the event's
 * chosen zone rather than their own. Returns an ISO instant string, or null when
 * the parts are incomplete/unparseable.
 *
 * The two-pass correction matters: the first pass guesses the offset at the
 * naive-as-UTC instant, which is the wrong side of a DST transition for times
 * near the boundary. Re-reading the offset at the corrected instant fixes it.
 * The guard on the second pass is what stops the correction oscillating for a
 * wall clock that does not exist at all (the hour skipped by a spring-forward).
 */
export function wallClockToInstant(
    date: string,
    time: string,
    timeZone: string | null | undefined,
): string | null {
    if (!date || !time) {
        return null;
    }
    const naive = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}Z`);
    if (isNaN(naive.getTime())) {
        return null;
    }
    const zone = isValidZone(timeZone)
        ? timeZone
        : Intl.DateTimeFormat().resolvedOptions().timeZone;

    const firstGuess = new Date(naive.getTime() - zoneOffsetMs(zone, naive));
    const corrected = new Date(naive.getTime() - zoneOffsetMs(zone, firstGuess));
    return corrected.toISOString();
}

/**
 * The viewer's own IANA zone, e.g. `Europe/Berlin`. Exposed so a template can
 * label a converted time honestly rather than implying it is the authored zone.
 */
export function viewerTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * A short zone label for the viewer's zone at a given instant, e.g. `GMT+2`.
 * Per-instant, so a summer event and a winter event label correctly.
 */
export function viewerZoneLabel(iso: string): string {
    const at = new Date(iso);
    if (isNaN(at.getTime())) {
        return '';
    }
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'short',
        hour: '2-digit',
    }).formatToParts(at);
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
}
