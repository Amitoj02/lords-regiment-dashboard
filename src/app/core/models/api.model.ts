/**
 * Backend response shapes (from lords-dashboard-backend) + mappers to the
 * frontend view models. Keeping the wire types here (rather than reshaping the
 * whole app) lets the existing components stay unchanged while the services swap
 * `of(stub)` for real HTTP. Field names mirror the NestJS DTOs exactly.
 */
import { Application, ApplicantType, ApplicationStatus } from './application.model';
import { AuditLog, AuditSeverity } from './audit-log.model';
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
import { Notification, NotificationTone } from './notification.model';

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
    recurrenceRule?: string | null;
    notifyOffsets?: number[];
    isDraft?: boolean;
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
    return {
        id: e.id,
        title: e.title,
        description: e.description ?? '',
        serverName: e.serverName ?? '',
        // The password is never in this projection — only the reveal endpoint returns it.
        serverPassword: undefined,
        date: start.date,
        startTime: start.time,
        endTime: e.endsAt ? splitIsoDateTime(e.endsAt).time : '',
        timezone: e.timezone,
        platforms: e.platforms,
        status: e.status,
        recurring: e.recurrenceRule ?? (e.isRecurring ? 'recurring' : undefined),
        tags: e.tags,
        rsvpCounts: e.rsvpCounts,
        // attendeesCount is a tally, not a list; the attendee list is a separate endpoint.
        attendees: [],
        bannerUrl: e.bannerUrl ?? undefined,
        notifyBefore: (e.notifyOffsets ?? []).map(formatNotifyOffset),
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

/** Flattened `{ memberId, name }` reference (author + tagged members). */
export interface ApiGalleryMemberRef {
    memberId: string;
    name: string;
}

export interface ApiGalleryItem {
    id: string;
    title: string;
    caption: string | null;
    type: GalleryItemType;
    linkUrl: string | null;
    thumbnailUrl: string | null;
    status: GalleryItemStatus;
    eventId: string | null;
    declineReason: string | null;
    author: ApiGalleryMemberRef | null;
    files: ApiGalleryFile[];
    taggedMembers: ApiGalleryMemberRef[];
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
        submittedAt: g.submittedAt,
        status: g.status,
        likes: g.likesCount,
        // The backend has no free-form tags on gallery items.
        tags: [],
        linkedEvent: g.eventId ?? undefined,
        taggedMembers: (g.taggedMembers ?? []).map((m) => m.memberId),
        caption: g.caption ?? undefined,
        fileCount: g.files?.length,
    };
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
    discordSyncStatus: 'pending' | 'synced' | 'failed' | 'not_applicable' | null;
}

export function mapAuditLog(a: ApiAuditEntry): AuditLog {
    return {
        id: a.id,
        timestamp: a.occurredAt,
        actor: a.actorLabel ?? a.actorMemberId ?? 'System',
        action: a.action,
        detail: a.detail ?? '',
        severity: a.severity,
        targetUser: a.targetLabel ?? undefined,
        beforeState: a.before ? JSON.stringify(a.before) : undefined,
        afterState: a.after ? JSON.stringify(a.after) : undefined,
        requestId: a.requestId ?? undefined,
        discordSynced: a.discordSyncStatus === 'synced',
    };
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface ApiNotification {
    id: string;
    title: string;
    body: string;
    tone: NotificationTone;
    authorLabel: string | null;
    createdAt: string;
    read: boolean;
}

export function mapNotification(n: ApiNotification): Notification {
    return {
        id: n.id,
        title: n.title,
        body: n.body,
        tone: n.tone,
        author: n.authorLabel ?? 'Command',
        createdAt: n.createdAt,
        read: n.read,
    };
}
