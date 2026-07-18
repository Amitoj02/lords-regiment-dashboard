/**
 * Backend response shapes (from lords-dashboard-backend) + mappers to the
 * frontend view models. Keeping the wire types here (rather than reshaping the
 * whole app) lets the existing components stay unchanged while the services swap
 * `of(stub)` for real HTTP. Field names mirror the NestJS DTOs exactly.
 */
import { ApplicantType, Application, ApplicationStatus } from './application.model';
import { AuditLog, AuditSeverity, DiscordSyncStatus } from './audit-log.model';
import { EventStatus, RegimentEvent, RsvpStatus } from './event.model';
import { GalleryItem, GalleryItemStatus, GalleryItemType } from './gallery.model';
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
    inGameName: string;
    role: MemberRole;
    status: MemberStatus;
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
    applicantType: ApplicantType;
    currentRegiment: string;
    howFound: string;
    preferredClasses: string;
    skillsToImprove: string;
    interestConfirmed: boolean;
    representativeNote: string | null;
    status: ApplicationStatus;
    isReapplication: boolean;
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
    missionStatement: string | null;
    accentTone: string;
    crestUrl: string | null;
    bannerUrl: string | null;
    establishedYear: number | null;
    /** Full establishment date (YYYY-MM-DD). */
    establishedAt: string | null;
    discordInviteUrl: string | null;
    discordServerName: string | null;
    setupComplete: boolean;
    memberCount: number;
}

export interface RegimentStats {
    totalMembers: number;
    /** Enrolled members excluding Mercenaries (the landing "members" count). */
    enrolledExcludingMercenaries: number;
    activeMembers: number;
    membersByRole: Record<MemberRole, number>;
    totalEvents: number;
    upcomingEvents: number;
    previousEvents: number;
    establishedYear: number | null;
    /** Full establishment date (YYYY-MM-DD). */
    establishedAt: string | null;
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
        joinedAt: m.joinedAt ?? undefined,
        eventsAttended: m.eventsAttended,
        suspendedUntil: m.suspendedUntil,
        bannedAt: m.bannedAt,
        avatarUrl: m.avatarUrl,
        bannerUrl: m.bannerUrl,
    };
}

export function mapRank(r: ApiRank): Rank {
    return {
        id: r.id,
        name: r.name,
        chevrons: r.chevrons,
        holders: r.holdersCount,
        discordRole: r.discordRoleName ?? '',
        discordRoleId: r.discordRoleId,
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
        precedence: m.precedence,
        discordRoleId: m.discordRoleId,
        discordRole: m.discordRoleName ?? '',
        discordLinked: m.linked,
    };
}

export function mapApplication(a: ApiApplication): Application {
    return {
        id: a.id,
        applicantName: a.applicantName,
        discordTag: a.discordTag ?? '',
        inGameName: a.inGameName,
        applicantType: a.applicantType,
        currentRegiment: a.currentRegiment,
        howFound: a.howFound,
        preferredClasses: a.preferredClasses,
        skillsToImprove: a.skillsToImprove,
        interestConfirmed: a.interestConfirmed,
        representativeNote: a.representativeNote ?? undefined,
        submittedAt: a.submittedAt,
        status: a.status,
        isPreviousApplicant: a.isReapplication,
        moderatorNote: a.moderatorNote ?? undefined,
        declineReason: a.declineReason ?? undefined,
        decidedAt: a.decidedAt ?? undefined,
    };
}

/** Wire shape of GET /applications/mine. */
export interface ApiMyApplication {
    application: ApiApplication | null;
    blocked: boolean;
}

// ── Events ───────────────────────────────────────────────────────────────────

/** The caller's own RSVP to an event (member view only). */
export interface ApiRsvp {
    status: RsvpStatus;
    reminderOffsetMinutes: number | null;
}

/**
 * Backend EventDto. The same shape serves the public and member views: the
 * member-only fields (server binding, draft flags, notify offsets, myRsvp) are
 * simply absent for public callers. The server password is NEVER here — it is
 * only returned by the dedicated reveal endpoint.
 */
export interface ApiEvent {
    id: string;
    title: string;
    description: string | null;
    bannerUrl: string | null;
    startsAt: string;
    endsAt: string | null;
    timezone: string;
    status: EventStatus;
    isRecurring: boolean;
    expectedAttendance: number | null;
    attendanceGoal: number | null;
    outcome: string | null;
    twitchUrl: string | null;
    platforms: Platform[];
    tags: string[];
    rsvpCounts: { interested: number; tentative: number; declined: number; neutral: number };
    attendeesCount: number;
    // Member-view-only fields (omitted entirely for public callers).
    serverName?: string | null;
    serverRegion?: string | null;
    /** Whether a server password is set (member view only). The password itself is never sent. */
    hasServerPassword?: boolean;
    recurrenceRule?: string | null;
    recurrenceCadence?: 'daily' | 'weekly' | 'monthly' | null;
    recurrenceActive?: boolean;
    recurrenceTemplateId?: string | null;
    notifyOffsets?: number[];
    isArchived?: boolean;
    myRsvp?: ApiRsvp | null;
}

/** ISO 8601 → wall-clock parts (no tz conversion; events carry their own timezone). */
function splitIsoDateTime(iso: string): { date: string; time: string } {
    const [date, rest = ''] = iso.split('T');
    return { date, time: rest.slice(0, 5) };
}

/** A notify-before lead time in minutes → the frontend's label form (60 → '1h', 15 → '15m'). */
export function formatNotifyOffset(minutes: number): string {
    return minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m`;
}

/** A frontend notify-before label → minutes ('1h' → 60, '30m' → 30). */
export function parseNotifyOffset(label: string): number {
    const match = /^(\d+)\s*([hm])$/.exec(label.trim());
    if (!match) return 0;
    const value = Number(match[1]);
    return match[2] === 'h' ? value * 60 : value;
}

export function mapEvent(e: ApiEvent): RegimentEvent {
    const start = splitIsoDateTime(e.startsAt);
    const end = e.endsAt ? splitIsoDateTime(e.endsAt) : null;
    return {
        id: e.id,
        title: e.title,
        description: e.description ?? '',
        serverName: e.serverName ?? '',
        serverRegion: e.serverRegion ?? undefined,
        // The password is never in this projection — only the reveal endpoint returns it.
        serverPassword: undefined,
        date: start.date,
        endDate: end?.date,
        startTime: start.time,
        endTime: end?.time ?? '',
        timezone: e.timezone,
        platforms: e.platforms,
        status: e.status,
        recurrenceCadence: e.recurrenceCadence ?? undefined,
        recurrenceActive: e.recurrenceActive,
        isRecurring: e.isRecurring,
        recurrenceTemplateId: e.recurrenceTemplateId ?? undefined,
        tags: e.tags,
        rsvpCounts: e.rsvpCounts,
        // attendeesCount is a tally, not a list; the attendee list is a separate endpoint.
        attendees: [],
        attendeesCount: e.attendeesCount,
        bannerUrl: e.bannerUrl ?? undefined,
        notifyBefore: (e.notifyOffsets ?? []).map(formatNotifyOffset),
        myRsvp: e.myRsvp ? e.myRsvp.status : e.myRsvp === null ? null : undefined,
        hasServerPassword: e.hasServerPassword,
        isArchived: e.isArchived,
    };
}

// ── Gallery ──────────────────────────────────────────────────────────────────

export interface ApiGalleryFile {
    id: string;
    fileName: string;
    url: string | null;
    mediaType: 'image' | 'video';
    sizeBytes: string | null;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
    caption: string | null;
    thumbnailColor: string | null;
}

/** Flattened `{ memberId, name, avatarUrl }` reference (author + tagged members). */
export interface ApiGalleryMemberRef {
    memberId: string;
    name: string;
    /** Author avatar (custom, else linked Discord avatar), or null. */
    avatarUrl?: string | null;
}

export interface ApiGalleryItem {
    id: string;
    title: string;
    caption: string | null;
    type: GalleryItemType;
    linkUrl: string | null;
    thumbnailUrl: string | null;
    status: GalleryItemStatus;
    declineReason: string | null;
    author: ApiGalleryMemberRef | null;
    files: ApiGalleryFile[];
    tags: string[];
    likesCount: number;
    /** Present only for authenticated callers. */
    liked?: boolean;
    submittedAt: string;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export function mapGalleryItem(g: ApiGalleryItem): GalleryItem {
    return {
        id: g.id,
        title: g.title,
        type: g.type,
        thumbnailUrl: g.thumbnailUrl ?? '',
        mediaUrl: g.files?.[0]?.url ?? g.linkUrl ?? undefined,
        submittedBy: g.author?.name ?? '',
        submittedByMemberId: g.author?.memberId,
        submittedByAvatarUrl: g.author?.avatarUrl ?? null,
        submittedAt: g.submittedAt,
        status: g.status,
        likes: g.likesCount,
        tags: g.tags ?? [],
        declineReason: g.declineReason,
        caption: g.caption ?? undefined,
        fileCount: g.files?.length,
    };
}

/** Lean pending-submission summary for the dashboard panel (T-0094/T-0127). */
export interface ApiGallerySubmissionSummary {
    id: string;
    title: string;
    submitterUsername: string | null;
}

// ── Audit ────────────────────────────────────────────────────────────────────

export interface ApiAuditEntry {
    id: string;
    occurredAt: string;
    action: string;
    severity: AuditSeverity;
    actorType: string;
    actorMemberId: string | null;
    actorLabel: string | null;
    targetType: string | null;
    targetId: string | null;
    targetMemberId: string | null;
    targetLabel: string | null;
    detail: string | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    requestId: string | null;
    discordSyncStatus: DiscordSyncStatus | null;
}

export function mapAuditLog(a: ApiAuditEntry): AuditLog {
    return {
        id: a.id,
        timestamp: a.occurredAt,
        actor: a.actorLabel ?? a.actorMemberId ?? 'System',
        actorMemberId: a.actorMemberId,
        action: a.action,
        detail: a.detail ?? '',
        severity: a.severity,
        targetUser: a.targetLabel ?? undefined,
        targetMemberId: a.targetMemberId,
        beforeState: a.before ? JSON.stringify(a.before) : undefined,
        afterState: a.after ? JSON.stringify(a.after) : undefined,
        requestId: a.requestId ?? undefined,
        discordSyncStatus: a.discordSyncStatus ?? null,
    };
}
