/**
 * The strings a public page puts in its `<title>` and `<meta description>`
 * (T-0293).
 *
 * ── WHY THEY LIVE IN ONE FILE INSTEAD OF IN THE COMPONENTS ──────────────────
 * Every one of these has a twin in the API's `src/seo/seo.service.ts`, and the
 * two must produce the same characters for the same URL. A crawler is served
 * the API's shell first and then renders THIS page on a second pass; one URL
 * with two different descriptions is the disagreement that makes dynamic
 * rendering read as cloaking, and it is a single short string where a diff is
 * unambiguous rather than prose where whitespace differs harmlessly.
 *
 * Scattered across six components those strings drifted — the roster and the
 * calendar each hardcoded `'Lords Regiment'` while the shell read the editable
 * regiment name, so a rename would have desynced them silently. Collected here,
 * the whole contract with the backend is one file a reviewer can diff.
 *
 * ⚠️ CHANGING ANY FUNCTION HERE IS A COUPLED DEPLOY. Its counterpart in
 * `lords-dashboard-backend/src/seo/seo.service.ts` (or `gallery-share.service.ts`
 * for the gallery) has to change in the same release, or the two surfaces
 * disagree for as long as the versions are split.
 */

/** The fallback used everywhere the live regiment name has not arrived yet. */
export const DEFAULT_REGIMENT_NAME = 'Lords Regiment';

/** Where an event's own description is cut. `EVENT_DESCRIPTION_LIMIT` there. */
const EVENT_DESCRIPTION_LIMIT = 200;

/** The landing page, when the regiment has not written a mission statement. */
export const DEFAULT_MISSION =
    'Roster, events and gallery for a Holdfast: Nations at War regiment.';

/** `SeoService.renderRoster` */
export function rosterDescription(regimentName: string, total: number): string {
    return (
        `Every serving member of ${regimentName}, a Holdfast: Nations at War regiment — ` +
        `${total} members with their rank and decorations.`
    );
}

/**
 * `SeoService.describeEvents`.
 *
 * ── WHY THIS TAKES A SECOND ARGUMENT NOW (T-0297) ───────────────────────────
 * It was one frozen sentence, so a link to the calendar unfurled with the same
 * words in January and in June. The whole reason somebody pastes `/events` into
 * a channel is to say "look what is coming up", and the card answered a
 * different question. Naming the next muster is what makes this a live document
 * instead of a slogan.
 *
 * `next.date` arrives already formatted, exactly as `eventDescription` takes
 * `fallbackDate` and for the same reason: it has to be the date in the EVENT's
 * own timezone, which only the caller can compute from `startsAt` + `timezone`.
 * A browser-local date could never match the server-rendered one.
 */
export function eventsDescription(
    regimentName: string,
    next?: { title: string; date: string } | null,
): string {
    const lead = next ? ` Next up: ${next.title} on ${next.date}.` : '';
    return (
        `Line battles, drills and campaign nights run by ${regimentName}, a Holdfast: ` +
        `Nations at War regiment — what is running now, what is scheduled next, and ` +
        `what has just been fought.${lead}`
    );
}

/** `GalleryShareService.renderIndex` */
export function galleryDescription(regimentName: string, total: number): string {
    return (
        `Photographs, clips and dispatches from the campaigns of ${regimentName}, ` +
        `a Holdfast: Nations at War regiment — ${total} ` +
        `${total === 1 ? 'entry' : 'entries'} submitted by its members.`
    );
}

/**
 * `SeoService.describeEvent`.
 *
 * The fallback names the date in the EVENT's timezone, never the reader's.
 * A browser-local date could not match a server-rendered one, and the component
 * this replaced used exactly that — `event.date`, already converted to whoever
 * happened to be looking.
 */
export function eventDescription(
    event: { title: string; description?: string | null; startsAt?: string | null },
    regimentName: string,
    fallbackDate: string,
): string {
    const text = (event.description || '').replace(/\s+/g, ' ').trim();
    if (!text) {
        return `${event.title} — a ${regimentName} operation on ${fallbackDate}.`;
    }
    return text.length > EVENT_DESCRIPTION_LIMIT
        ? `${text.slice(0, EVENT_DESCRIPTION_LIMIT - 1).trimEnd()}…`
        : text;
}

/**
 * A date+time in a named zone: "12 September 2026 at 20:00 BST".
 *
 * The components are spelled out rather than using `dateStyle`/`timeStyle`
 * because Intl throws if either shorthand is combined with `timeZoneName` — and
 * the zone name is not optional, since without it "20:00" is a claim about a
 * timezone the reader cannot see and will assume is their own. Identical to
 * `SeoService.dateTimeIn` in the API.
 */
export function eventDateTime(iso: string, timezone: string): string {
    try {
        return formatIn(iso, timezone);
    } catch {
        return formatIn(iso, 'UTC');
    }
}

/** The date alone, in the event's zone — the `eventDescription` fallback. */
export function eventDate(iso: string, timezone: string): string {
    try {
        return new Date(iso).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: timezone,
        });
    } catch {
        return new Date(iso).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
        });
    }
}

function formatIn(iso: string, timezone: string): string {
    return new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
        timeZoneName: 'short',
    });
}
