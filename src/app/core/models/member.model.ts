export type MemberStatus = 'Active' | 'Inactive' | 'Pending';
export type MemberRole = 'Owner' | 'Admin' | 'Moderator' | 'Member' | 'Mercenary' | 'Applicant';
export type Platform = 'steam' | 'xbox' | 'ps';

export interface Medal {
    /** Catalogue id (from the backend). Optional so legacy stub data still types. */
    id?: string;
    /** Short glyph/letter — the fallback label shown when no image is uploaded. */
    letter: string;
    /** Public URL of the uploaded medal image (null → letter fallback tile). */
    imageUrl?: string | null;
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
    /** Public URL of the uploaded rank insignia image (null → initials fallback tile). */
    imageUrl?: string | null;
    holders: number;
    discordRole: string;
    discordLinked: boolean;
    order: number;
    /** Discord role id linked to this rank (drives the role picker preselect). */
    discordRoleId?: string | null;
    /**
     * The API depends on this rank's NAME, so it cannot be renamed or deleted —
     * only those two. Optional so legacy stub data still types; read it through
     * {@link mapRank}, which normalises an absent field to `false`.
     */
    isProtected?: boolean;
}

/** A single medal award held by a member (medals are repeatable). */
export interface MemberMedalAward {
    /** The award (member_medal) id — used to identify a specific award. */
    id: string;
    medalId: string;
    title: string;
    /** Short glyph — the fallback label when the medal has no image. */
    glyph: string;
    /** Public URL of the medal image (null → glyph fallback tile). */
    imageUrl?: string | null;
    detail?: string | null;
    awardedAt: string;
}

/**
 * Which admin actions the CALLER may perform on THIS member, computed by the
 * server from the same guard the endpoints enforce (backend T-0176). The API
 * never reports a permitted flag where the endpoint would 403, so the UI gates
 * on these instead of re-deriving a role hierarchy client-side — a re-derived
 * rule is a rule that can drift.
 */
export interface MemberPermittedActions {
    changeRole: boolean;
    changeRank: boolean;
    awardMedal: boolean;
    removeMedal: boolean;
    suspend: boolean;
    unsuspend: boolean;
    ban: boolean;
    unban: boolean;
}

/** The permitted-action flags, in one place so every read fails closed the same way. */
const PERMITTED_ACTION_KEYS: readonly (keyof MemberPermittedActions)[] = [
    'changeRole',
    'changeRank',
    'awardMedal',
    'removeMedal',
    'suspend',
    'unsuspend',
    'ban',
    'unban',
];

/**
 * Normalise the raw `permittedActions` block off the wire. Returns `undefined`
 * when the member arrived without one — callers must read that as "nothing
 * permitted", never as "everything permitted" (an older projection, a cached
 * response or a hand-built fixture must not re-open actions the API rejects).
 * Within a present block anything that is not literally `true` is a denial.
 */
export function parsePermittedActions(raw: unknown): MemberPermittedActions | undefined {
    if (!raw || typeof raw !== 'object') {
        return undefined;
    }
    const src = raw as Record<string, unknown>;
    const parsed = {} as MemberPermittedActions;
    for (const key of PERMITTED_ACTION_KEYS) {
        parsed[key] = src[key] === true;
    }
    return parsed;
}

/** True when the server permits at least one admin action on this member. */
export function hasAnyPermittedAction(m: Member | null | undefined): boolean {
    const actions = m?.permittedActions;
    return !!actions && PERMITTED_ACTION_KEYS.some((key) => actions[key]);
}

/**
 * The single gate for the admin-action modal's trigger. Both mount points — the
 * roster row's `···` and the profile header's "Admin Actions" — call this, so
 * they cannot drift apart (they used to disagree: capabilities vs `isAdmin()`).
 * `hasCapability` is `AuthService.hasCapability`; pass it as an arrow so `this`
 * stays bound.
 */
export function canOpenAdminActions(
    m: Member | null | undefined,
    hasCapability: (capability: string) => boolean,
): boolean {
    if (!hasAnyPermittedAction(m)) {
        return false;
    }
    return hasCapability('edit_ranks_medals') || hasCapability('manage_roles');
}

/**
 * Roles the role dropdown can offer, most senior first. `Owner` is absent on
 * purpose — ownership moves through its own flow, never this control.
 *
 * This is display order plus the caller's own-tier cut (see
 * {@link assignableRolesFor}); it is NOT a client-side copy of the server's
 * hierarchy rule. Whether the caller may touch a given member's role at all
 * comes from `permittedActions.changeRole`.
 */
export const ASSIGNABLE_ROLES: readonly MemberRole[] = [
    'Admin',
    'Moderator',
    'Member',
    'Mercenary',
    'Applicant',
];

/**
 * The roles `callerRole` may hand out: their own tier and everything below it,
 * so an Admin holding `manage_roles` may appoint another Admin and a Moderator
 * another Moderator — but a Moderator can still never mint an Admin (T-0283,
 * mirroring the server's `canGrantRole`). An unknown or absent role offers
 * nothing (fail closed); the Owner may assign the whole list.
 *
 * The peer entry only ever appears against a target the caller may act on at
 * all — `permittedActions.changeRole` is the separate, server-computed gate, and
 * it stays false for a peer. So this widens who you can PROMOTE, never who you
 * can moderate: the Admin you just appointed is immediately out of your reach.
 */
export function assignableRolesFor(callerRole: MemberRole | null | undefined): MemberRole[] {
    if (callerRole === 'Owner') {
        return [...ASSIGNABLE_ROLES];
    }
    const own = ASSIGNABLE_ROLES.indexOf(callerRole as MemberRole);
    if (own === -1) {
        return [];
    }
    return ASSIGNABLE_ROLES.slice(own);
}

export interface Member {
    id: string;
    discordTag: string;
    /** In-game name — the sole display identity (the separate display name was dropped). */
    inGameName: string;
    rank: string;
    /** Rank id (from the backend), needed to change a member's rank. */
    rankId?: string;
    /** Public URL of the member's rank insignia image (null → initials fallback). */
    rankImageUrl?: string | null;
    /** Full medal awards (populated on list + detail; drives roster/profile/dashboard). */
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
    /**
     * Server-computed admin actions the caller may perform on this member.
     * Optional so existing fixtures still type — but absent means NOTHING is
     * permitted, so always read it through {@link hasAnyPermittedAction} or an
     * explicit flag check, never with an "assume allowed" fallback.
     */
    permittedActions?: MemberPermittedActions;
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
