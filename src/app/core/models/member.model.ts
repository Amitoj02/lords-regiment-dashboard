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
    name: string;
    discordTag: string;
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
    platform?: Platform;
    timezone?: string;
    joinedAt?: string;
    eventsAttended?: number;
    attendanceRate?: number;
    suspendedUntil?: string | null;
    bannedAt?: string | null;
}
