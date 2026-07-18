export type MemberStatus = 'Active' | 'Inactive' | 'Pending';
export type MemberRole = 'Owner' | 'Admin' | 'Moderator' | 'Member' | 'Mercenary' | 'Applicant';
export type Platform = 'steam' | 'xbox' | 'ps';
export type MedalRibbon = 'blue' | 'red' | 'gold' | 'green' | 'tricolor';

export interface Medal {
    /** Catalogue id (from the backend). Optional so legacy stub data still types. */
    id?: string;
    letter: string;
    ribbon: MedalRibbon;
    title: string;
    description: string;
    holders?: number;
    /** Total awards (repeatable medals may exceed `holders`). */
    awards?: number;
    /** Display order in the cabinet (lower = shown first). */
    precedence?: number;
    discordLinked?: boolean;
    /** Discord role id linked to this medal (drives the role picker preselect). */
    discordRoleId?: string | null;
    /** Linked Discord role NAME (offline-safe fallback when the roles list is empty). */
    discordRole?: string;
}

export interface Rank {
    /** Rank id (from the backend). Optional so legacy stub data still types. */
    id?: string;
    name: string;
    chevrons: number;
    holders: number;
    discordRole: string;
    discordLinked: boolean;
    order: number;
    /** Discord role id linked to this rank (drives the role picker preselect). */
    discordRoleId?: string | null;
}

/** A single medal award held by a member (medals are repeatable). */
export interface MemberMedalAward {
    /** The award (member_medal) id — used to identify a specific award. */
    id: string;
    medalId: string;
    title: string;
    glyph: string;
    ribbon: MedalRibbon;
    detail?: string | null;
    awardedAt: string;
}

export interface Member {
    id: string;
    discordTag: string;
    /** In-game name — the sole display identity (the separate display name was dropped). */
    inGameName: string;
    rank: string;
    /** Rank id (from the backend), needed to change a member's rank. */
    rankId?: string;
    chevrons: number;
    medals: MedalRibbon[];
    /** Full medal awards (populated on the detail view; drives the admin modal). */
    medalAwards?: MemberMedalAward[];
    role: MemberRole;
    discordLinked: boolean;
    status: MemberStatus;
    lastSeen: string;
    joinedAt?: string;
    eventsAttended?: number;
    suspendedUntil?: string | null;
    bannedAt?: string | null;
    /** Custom or Discord-fallback avatar URL (null → initials tile). */
    avatarUrl?: string | null;
    /** Profile banner URL (null → default banner). */
    bannerUrl?: string | null;
    /** Write-only: storage key of a freshly-uploaded avatar (sent on self-edit). */
    avatarKey?: string;
    /** Write-only: storage key of a freshly-uploaded banner (sent on self-edit). */
    bannerKey?: string;
}

// ── Roster status derivation (client-side, T-0184) ───────────────────────────
// The raw `status` field only distinguishes Active/Inactive/Pending. The roster
// pill surfaces a richer, derived status from the moderation fields already on
// the member (bannedAt / suspendedUntil / lastSeen), with no backend change.

/** The roster status shown on the pill, derived from the raw member fields. */
export type DerivedMemberStatus = 'Active' | 'Inactive' | 'Pending' | 'Suspended' | 'Banned';

/** No sign-in for this many days flips a member to Inactive (client-side only). */
export const INACTIVE_AFTER_DAYS = 21;

/**
 * Derive a member's roster status. Precedence (first match wins): Banned
 * (`bannedAt` set) → Suspended (`suspendedUntil` in the future) → Pending
 * (application awaiting review) → Inactive (no sign-in for >21 days) → Active.
 * The Pending check precedes the inactivity check so an applicant with no/old
 * `lastSeen` is never mislabelled Inactive; the inactivity branch is guarded on a
 * truthy `lastSeen` so an empty string (from a null `lastSeenAt`) can't yield NaN.
 */
export function deriveMemberStatus(m: Member, now = Date.now()): DerivedMemberStatus {
    if (m.bannedAt) {
        return 'Banned';
    }
    if (m.suspendedUntil && new Date(m.suspendedUntil).getTime() > now) {
        return 'Suspended';
    }
    if (m.status === 'Pending') {
        return 'Pending';
    }
    if (m.lastSeen && (now - new Date(m.lastSeen).getTime()) / 86_400_000 > INACTIVE_AFTER_DAYS) {
        return 'Inactive';
    }
    return 'Active';
}

/** The badge variant colour for a derived status (Suspended + Banned share ox). */
export function statusVariant(status: DerivedMemberStatus): string {
    switch (status) {
        case 'Active':
            return 'laurel';
        case 'Pending':
            return 'brass';
        case 'Inactive':
            return 'parch';
        case 'Suspended':
        case 'Banned':
            return 'ox';
    }
}

/** A human-readable explanation of a derived status for the pill's hover tooltip. */
export function statusTooltip(m: Member): string {
    const fmt = (iso: string): string =>
        new Date(iso).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    switch (deriveMemberStatus(m)) {
        case 'Banned':
            return m.bannedAt
                ? `Banned on ${fmt(m.bannedAt)} — removed from the regiment.`
                : 'Banned — removed from the regiment.';
        case 'Suspended':
            return m.suspendedUntil
                ? `Suspended until ${fmt(m.suspendedUntil)} — access temporarily restricted.`
                : 'Suspended — access temporarily restricted.';
        case 'Inactive':
            return `Inactive — no sign-in in over ${INACTIVE_AFTER_DAYS} days.`;
        case 'Pending':
            return 'Pending — application awaiting review.';
        case 'Active':
            return `Active — signed in within the last ${INACTIVE_AFTER_DAYS} days.`;
    }
}
