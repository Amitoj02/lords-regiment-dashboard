/**
 * Backend response shapes (from lords-dashboard-backend) + mappers to the
 * frontend view models. Keeping the wire types here (rather than reshaping the
 * whole app) lets the existing components stay unchanged while the services swap
 * `of(stub)` for real HTTP. Field names mirror the NestJS DTOs exactly.
 */
import {
    Application,
    ApplicantType,
    ApplicationStatus,
} from './application.model';
import {
    Medal,
    MedalRibbon,
    Member,
    MemberMedalAward,
    MemberRole,
    MemberStatus,
    Platform,
    Rank,
} from './member.model';

/** Standard paginated envelope (matches PaginatedResponseDto). */
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface ApiMemberMedal {
    id: string;
    medalId: string;
    title: string;
    glyph: string;
    ribbon: MedalRibbon;
    detail: string | null;
    awardedAt: string;
}

export interface ApiMember {
    id: string;
    name: string;
    inGameName: string | null;
    role: MemberRole;
    status: MemberStatus;
    platform: Platform | null;
    timezone: string | null;
    rank: string | null;
    rankId: string;
    chevrons: number;
    rankPrecedence: number | null;
    discordTag: string | null;
    discordLinked: boolean;
    publicProfile: boolean;
    avatarUrl: string | null;
    bannerUrl: string | null;
    standing: string | null;
    joinedAt: string | null;
    lastSeenAt: string | null;
    eventsAttended: number;
    attendanceRate: number;
    suspendedUntil: string | null;
    bannedAt: string | null;
    medals: ApiMemberMedal[];
}

export interface ApiRank {
    id: string;
    name: string;
    chevrons: number;
    precedence: number;
    discordRoleName: string | null;
    discordRoleId: string | null;
    linked: boolean;
    holdersCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface ApiMedal {
    id: string;
    title: string;
    glyph: string;
    ribbon: MedalRibbon;
    description: string | null;
    precedence: number;
    discordRoleName: string | null;
    discordRoleId: string | null;
    linked: boolean;
    holdersCount: number;
    awardsCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface ApiApplication {
    id: string;
    applicantName: string;
    discordTag: string | null;
    inGameName: string;
    platform: Platform;
    applicantType: ApplicantType;
    timezone: string | null;
    whyJoin: string;
    howFound: string;
    priorExperience: string | null;
    status: ApplicationStatus;
    isReapplication: boolean;
    ageConfirmed: boolean;
    mutualEventsCount: number;
    moderatorNote: string | null;
    declineReason: string | null;
    promotedMemberId: string | null;
    decidedByMemberId: string | null;
    submittedAt: string;
    decidedAt: string | null;
    createdAt: string;
}

export interface RegimentProfile {
    id: string;
    name: string;
    shortTag: string;
    missionStatement: string | null;
    accentTone: string;
    crestUrl: string | null;
    bannerUrl: string | null;
    establishedYear: number | null;
    discordInviteUrl: string | null;
    discordServerName: string | null;
    setupComplete: boolean;
    memberCount: number;
}

export interface RegimentStats {
    totalMembers: number;
    activeMembers: number;
    membersByRole: Record<MemberRole, number>;
    totalEvents: number;
    upcomingEvents: number;
    previousEvents: number;
    establishedYear: number | null;
}

// ── Mappers: backend DTO → frontend view model ───────────────────────────────

export function mapMedalAward(m: ApiMemberMedal): MemberMedalAward {
    return {
        id: m.id,
        medalId: m.medalId,
        title: m.title,
        glyph: m.glyph,
        ribbon: m.ribbon,
        detail: m.detail,
        awardedAt: m.awardedAt,
    };
}

export function mapMember(m: ApiMember): Member {
    return {
        id: m.id,
        name: m.name,
        discordTag: m.discordTag ?? '',
        inGameName: m.inGameName ?? '',
        rank: m.rank ?? '',
        rankId: m.rankId,
        chevrons: m.chevrons,
        medals: (m.medals ?? []).map((x) => x.ribbon),
        medalAwards: (m.medals ?? []).map(mapMedalAward),
        role: m.role,
        discordLinked: m.discordLinked,
        status: m.status,
        lastSeen: m.lastSeenAt ?? '',
        platform: m.platform ?? undefined,
        timezone: m.timezone ?? undefined,
        joinedAt: m.joinedAt ?? undefined,
        eventsAttended: m.eventsAttended,
        attendanceRate: m.attendanceRate,
        suspendedUntil: m.suspendedUntil,
        bannedAt: m.bannedAt,
    };
}

export function mapRank(r: ApiRank): Rank {
    return {
        id: r.id,
        name: r.name,
        chevrons: r.chevrons,
        holders: r.holdersCount,
        discordRole: r.discordRoleName ?? '',
        discordLinked: r.linked,
        order: r.precedence,
    };
}

export function mapMedal(m: ApiMedal): Medal {
    return {
        id: m.id,
        letter: m.glyph,
        ribbon: m.ribbon,
        title: m.title,
        description: m.description ?? '',
        holders: m.holdersCount,
        awards: m.awardsCount,
        discordLinked: m.linked,
    };
}

export function mapApplication(a: ApiApplication): Application {
    return {
        id: a.id,
        applicantName: a.applicantName,
        discordTag: a.discordTag ?? '',
        inGameName: a.inGameName,
        platform: a.platform,
        applicantType: a.applicantType,
        source: a.howFound ?? '',
        submittedAt: a.submittedAt,
        status: a.status,
        whyJoin: a.whyJoin,
        howFound: a.howFound,
        priorExperience: a.priorExperience ?? undefined,
        timezone: a.timezone ?? undefined,
        isPreviousApplicant: a.isReapplication,
        moderatorNote: a.moderatorNote ?? undefined,
    };
}
