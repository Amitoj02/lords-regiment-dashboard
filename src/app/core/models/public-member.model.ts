/**
 * The ANONYMOUS member projection (T-0287). Mirrors the backend's
 * `PublicMemberDto` exactly — see lords-dashboard-backend
 * `src/members/dto/public-member.dto.ts`.
 *
 * ── WHY THIS IS ITS OWN TYPE AND NOT `Partial<Member>` ──────────────────────
 * Because the difference is a security boundary, not a convenience. `Member`
 * carries `discordTag`, `status`, `lastSeen`, `suspendedUntil`, `bannedAt` and
 * `permittedActions`; none of those exist on the wire here, and typing the
 * public roster as an optional-everything `Member` would let a template read
 * `member.lastSeen` and silently render an empty cell instead of failing to
 * compile. A distinct type makes "is this field public?" a question the
 * compiler answers.
 */
export interface PublicMemberMedal {
    id: string;
    medalId: string;
    title: string;
    glyph: string;
    imageUrl: string | null;
    /** The medal's CATALOGUE criteria — public. Never the per-award citation. */
    description: string | null;
    awardedAt: string;
}

export interface PublicMember {
    id: string;
    /** Vanity handle without the `@` sigil, or null when unclaimed. */
    username: string | null;
    inGameName: string;
    /** Never `Applicant` — applicants have no public profile at all. */
    role: string;
    rank: string | null;
    rankImageUrl: string | null;
    /** Lower sorts higher. The public roster's sort key. */
    rankPrecedence: number | null;
    /**
     * A path on THIS origin, or null when the member has no avatar anywhere.
     * Never the upstream Discord CDN URL — that embeds their Discord snowflake.
     */
    avatarUrl: string | null;
    bannerUrl: string | null;
    joinedAt: string | null;
    eventsAttended: number;
    medals: PublicMemberMedal[];
    /** `/u/@handle` when a handle is set, `/u/<shortId>` otherwise. */
    canonicalPath: string;
}

/** Display name preferring the handle, matching what the crawler shell renders. */
export function publicDisplayName(member: PublicMember): string {
    return member.inGameName;
}

/** The `@handle` label, or null. */
export function publicHandle(member: PublicMember): string | null {
    return member.username ? `@${member.username}` : null;
}
