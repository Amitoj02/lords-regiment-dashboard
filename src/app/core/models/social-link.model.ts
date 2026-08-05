/**
 * A member's linked accounts elsewhere (T-0289).
 *
 * ── HANDLES, NEVER URLs ─────────────────────────────────────────────────────
 * A member types `@noltplays`, not `https://…`. The API stores the bare handle
 * and BUILDS the URL itself from a per-platform template, so the `url` on the
 * wire always points at a host we chose. That is not a formatting preference:
 * a public profile is crawlable and un-moderated, and a free-text URL field on
 * one is an open redirect with a person's name attached to it. The regex below
 * is a mirror of the server's — it exists to give the member an error before
 * they hit Save, and the server revalidates everything it is sent.
 *
 * Discord is deliberately ABSENT from this set. It already exists as
 * `Member.discordTag`, it is signed-in-only (see `PublicMember`), and folding
 * it in here would publish it. The profile renders the Discord chip from the
 * enriched projection instead, which is what keeps it gated.
 */
export type SocialPlatform =
    'twitch' | 'youtube' | 'instagram' | 'tiktok' | 'x' | 'steam' | 'medal';

/** One linked account, as the API emits it on both member projections. */
export interface MemberSocialLink {
    platform: SocialPlatform;
    /** Human label for the platform — server-authored so both surfaces agree. */
    label: string;
    /** The bare handle, without the `@` sigil. */
    handle: string;
    /** Server-built absolute URL. Never member-authored. */
    url: string;
}

/** What the profile chip and the account editor need to know about a platform. */
export interface SocialPlatformSpec {
    platform: SocialPlatform;
    label: string;
    /** Mirrors the server's rule. `handle` is already normalised when tested. */
    pattern: RegExp;
    /** Shown in the account editor's placeholder, so the shape is obvious. */
    example: string;
    /** Where the handle ends up, for the editor's hint line. */
    urlHint: string;
}

/**
 * Display order, and the order the account editor lists its fields in. Kept in
 * one place so the chips on the profile and the rows in the editor cannot drift.
 */
export const SOCIAL_PLATFORMS: readonly SocialPlatformSpec[] = [
    {
        platform: 'twitch',
        label: 'Twitch',
        pattern: /^[A-Za-z0-9_]{4,25}$/,
        example: 'jamesonnolt',
        urlHint: 'twitch.tv/',
    },
    {
        platform: 'youtube',
        label: 'YouTube',
        pattern: /^[A-Za-z0-9._-]{3,30}$/,
        example: 'NoltPlays',
        urlHint: 'youtube.com/@',
    },
    {
        platform: 'instagram',
        label: 'Instagram',
        pattern: /^[A-Za-z0-9._]{1,30}$/,
        example: 'jameson.nolt',
        urlHint: 'instagram.com/',
    },
    {
        platform: 'tiktok',
        label: 'TikTok',
        pattern: /^[A-Za-z0-9._]{2,24}$/,
        example: 'noltplays',
        urlHint: 'tiktok.com/@',
    },
    {
        platform: 'x',
        label: 'X',
        pattern: /^[A-Za-z0-9_]{1,15}$/,
        example: 'noltplays',
        urlHint: 'x.com/',
    },
    {
        // Steam takes either a vanity id or a 17-digit steamID64; the server
        // routes the two to /id/ and /profiles/ respectively.
        platform: 'steam',
        label: 'Steam',
        pattern: /^(?:[A-Za-z0-9_-]{2,32}|\d{17})$/,
        example: 'jamesonnolt',
        urlHint: 'steamcommunity.com/id/',
    },
    {
        platform: 'medal',
        label: 'Medal.tv',
        pattern: /^[A-Za-z0-9_-]{2,32}$/,
        example: 'panda',
        urlHint: 'medal.tv/u/',
    },
] as const;

const SPEC_BY_PLATFORM = new Map<SocialPlatform, SocialPlatformSpec>(
    SOCIAL_PLATFORMS.map((spec) => [spec.platform, spec]),
);

/** The spec for a platform, or undefined for a key this build does not know. */
export function socialPlatformSpec(platform: string): SocialPlatformSpec | undefined {
    return SPEC_BY_PLATFORM.get(platform as SocialPlatform);
}

/**
 * Normalise a typed handle the same way the server does — trim ONCE, drop ONE
 * leading `@`, drop ONE trailing `/`. Members paste `@name`, `name/` and
 * ` name ` interchangeably and all three mean the same account.
 *
 * The single trim is load-bearing and matches `normalizeSocialHandle` in the
 * API's `src/members/social-platforms.ts`. `'@ panda'` therefore normalises to
 * `' panda'` and FAILS validation, here and there: a space after the sigil is a
 * typo, not a paste artefact, and quietly repairing it would be this client
 * accepting a handle the server is about to reject.
 */
export function normalizeSocialHandle(raw: string): string {
    let handle = raw.trim();
    if (handle.startsWith('@')) {
        handle = handle.slice(1);
    }
    if (handle.endsWith('/')) {
        handle = handle.slice(0, -1);
    }
    return handle;
}

/** Whether a NORMALISED handle satisfies its platform's rule. */
export function isValidSocialHandle(platform: string, handle: string): boolean {
    const spec = socialPlatformSpec(platform);
    return !!spec && spec.pattern.test(handle);
}
