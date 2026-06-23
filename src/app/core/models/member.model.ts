export type MemberStatus = 'Active' | 'Inactive' | 'Pending';
export type MemberRole = 'Owner' | 'Admin' | 'Moderator' | 'Member' | 'Mercenary' | 'Applicant';
export type Platform = 'steam' | 'xbox' | 'ps';
export type MedalRibbon = 'blue' | 'red' | 'gold' | 'green' | 'tricolor';

export interface Medal {
    letter: string;
    ribbon: MedalRibbon;
    title: string;
    description: string;
    holders?: number;
    discordLinked?: boolean;
}

export interface Rank {
    name: string;
    chevrons: number;
    holders: number;
    discordRole: string;
    discordLinked: boolean;
    order: number;
}

export interface Member {
    id: string;
    name: string;
    discordTag: string;
    inGameName: string;
    rank: string;
    chevrons: number;
    medals: MedalRibbon[];
    role: MemberRole;
    discordLinked: boolean;
    status: MemberStatus;
    lastSeen: string;
    platform?: Platform;
    timezone?: string;
    joinedAt?: string;
    eventsAttended?: number;
    attendanceRate?: number;
}
