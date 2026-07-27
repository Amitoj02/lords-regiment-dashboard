/**
 * Backend response shapes (from lords-dashboard-backend) + mappers to the
 * frontend view models. Keeping the wire types here (rather than reshaping the
 * whole app) lets the existing components stay unchanged while the services swap
 * `of(stub)` for real HTTP. Field names mirror the NestJS DTOs exactly.
 */
import {
    ApplicantApplication,
    ApplicantType,
    Application,
    ApplicationStatus,
} from './application.model';
import { AuditLog, AuditSeverity, DiscordSyncStatus } from './audit-log.model';
import { instantToWallClock, viewerZoneLabel } from './event-time';
import { EventStatus, RegimentEvent, RsvpStatus } from './event.model';
import { GalleryItem, GalleryItemStatus, GalleryItemType } from './gallery.model';
import {
    Medal,
    Member,
    MemberMedalAward,
    MemberPermittedActions,
    MemberRole,
    MemberStatus,
    Platform,
    Rank,
    parsePermittedActions,
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
    imageUrl: string | null;
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
    rankImageUrl: string | null;
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
    /**
     * Which admin actions the CALLER may perform on THIS member, derived from
     * the same guard the endpoints enforce (CONTRACT §3, backend T-0176). The
     * API sends it on every member projection — list, detail and each admin
     * action's response — but it is declared OPTIONAL here on purpose: an older
     * API, a cached payload or a hand-built fixture must read as "nothing
     * permitted", which is exactly what {@link parsePermittedActions} returns
     * for an absent block. Never read this field directly; go through
     * {@link mapMember}, which normalises it and fails closed.
     */
    permittedActions?: MemberPermittedActions;
}

export interface ApiRank {
    id: string;
    name: string;
    imageUrl: string | null;
    precedence: number;
    discordRoleName: string | null;
    discordRoleId: string | null;
    linked: boolean;
    holdersCount: number;
    /**
     * The API resolves this rank BY NAME in its own logic
     * (lords-dashboard-backend:T-0190) — today, the entry rank every approved
     * applicant is enlisted onto. A rename or a delete comes back 403 for every
     * caller, the Owner included, so the UI locks those two controls instead of
     * offering them and catching the failure. Precedence, insignia and the
     * Discord role mapping are unaffected. Present on every rank projection.
     */
    isProtected: boolean;
    createdAt: string;
    updatedAt: string;
    /**
     * Handle for the bulk role re-sync this link/unlink just queued
     * (lords-dashboard-backend:T-0158). Present ONLY on the link/unlink
     * responses, and only when a run was actually enqueued — absent on every
     * list/read projection, and absent when the change affected no linked
     * holders. It is what the admin UI polls and cancels with.
     */
    relinkBatchId?: string | null;
    /**
     * Advisory attached to a link that SUCCEEDED
     * (lords-dashboard-backend:T-0189): the role carries privileged Discord
     * permissions. Present only on the link response, and only when there is
     * something to say — absent means the role is clean.
     */
    discordRoleWarning?: string | null;
}

export interface ApiMedal {
    id: string;
    title: string;
    glyph: string;
    imageUrl: string | null;
    description: string | null;
    precedence: number;
    discordRoleName: string | null;
    discordRoleId: string | null;
    linked: boolean;
    holdersCount: number;
    awardsCount: number;
    createdAt: string;
    updatedAt: string;
    /**
     * Handle for the bulk role re-sync this link/unlink just queued
     * (lords-dashboard-backend:T-0158). Present ONLY on the link/unlink
     * responses, and only when a run was actually enqueued — absent on every
     * list/read projection, and absent when the change affected no linked
     * holders. It is what the admin UI polls and cancels with.
     */
    relinkBatchId?: string | null;
    /**
     * Advisory attached to a link that SUCCEEDED
     * (lords-dashboard-backend:T-0189): the role carries privileged Discord
     * permissions. Present only on the link response, and only when there is
     * something to say — absent means the role is clean.
     */
    discordRoleWarning?: string | null;
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
    /** Live applicant display name — promoted member's name, else Discord global name (T-0129). */
    currentDisplayName: string | null;
    /** Live applicant avatar — promoted member's avatar, else Discord avatar (T-0129). */
    currentAvatarUrl: string | null;
    decidedByMemberId: string | null;
    /**
     * Who took the decision (lords-dashboard-backend:T-0155). Null while pending,
     * and null when the decider's member row was later removed (the FK is
     * ON DELETE SET NULL) — so render defensively rather than assuming a name.
     * A HELD application has a decider even though `decidedAt` is still null.
     */
    decidedByName?: string | null;
    decidedByAvatarUrl?: string | null;
    /**
     * The message written FOR THE APPLICANT on approve/decline/hold
     * (lords-dashboard-backend:T-0153). Staff see it here so a reviewer can tell
     * what the applicant was actually told; `moderatorNote` and `declineReason`
     * stay staff-only and never reach the applicant projection.
     */
    userMessage?: string | null;
    submittedAt: string;
    decidedAt: string | null;
    createdAt: string;
    /** Whether the applicant's Discord identity is blocked from applying (T-0128). */
    blocked?: boolean;
}

/**
 * The APPLICANT's own view of their application
 * (lords-dashboard-backend:T-0154). Deliberately a separate interface rather
 * than a `Partial<ApiApplication>`: the point of the split is that a staff field
 * cannot leak here by default, so the shape is enumerated explicitly and has to
 * be widened on purpose.
 *
 * Returned by `POST /api/applications`, `GET /api/applications/mine` and
 * `PATCH /api/applications/mine`. It carries NO `moderatorNote`, NO
 * `declineReason` and no decision attribution — `userMessage` is the only
 * decision text an applicant is ever shown.
 */
export interface ApiApplicantApplication {
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
    /** The officer's message to the applicant; null when none was written. */
    userMessage: string | null;
    submittedAt: string;
    decidedAt: string | null;
    createdAt: string;
}

/**
 * Admin-authored presentation for the landing and sign-in pages
 * (lords-dashboard-backend:T-0147). Rides on the ANONYMOUS regiment profile
 * because both consuming pages are logged-out surfaces.
 *
 * EVERY field is nullable and null means "unset — render the shipped default".
 * Note `0` is a MEANINGFUL overlay density (a fully transparent scrim), so
 * consumers must branch on `== null`, never on truthiness.
 */
export interface RegimentPresentation {
    heroBannerUrl: string | null;
    loginBannerUrl: string | null;
    charterQuote: string | null;
    charterQuoteAttribution: string | null;
    loginQuote: string | null;
    loginQuoteAttribution: string | null;
    heroOverlayDensity: number | null;
    loginOverlayDensity: number | null;
}

/** The three admin-editable legal documents (lords-dashboard-backend:T-0149). */
export type RegimentDocumentSlug = 'terms' | 'privacy' | 'guidelines';

/**
 * One legal document from `GET /api/regiment/documents` (anonymous).
 * `body` is MARKDOWN, never HTML, and is null when the document has never been
 * edited — in which case the page renders its shipped fallback copy. A blank
 * legal page must never ship, so callers branch on falsiness here.
 */
export interface ApiRegimentDocument {
    slug: RegimentDocumentSlug;
    body: string | null;
    updatedAt: string | null;
}

/** The staff view of a document, adding who last saved it. */
export interface ApiAdminRegimentDocument extends ApiRegimentDocument {
    updatedByName: string | null;
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
    /**
     * Whether the Mercenary applicant track is open (T-0229). Mirrored onto the
     * PUBLIC profile because an Applicant cannot read GET /settings, and the
     * apply form needs it to decide whether to offer the Mercenary card.
     * Optional: an API that omits it is treated permissively (both tracks open).
     */
    allowMercenaries?: boolean;
    /**
     * Admin-authored landing/sign-in presentation
     * (lords-dashboard-backend:T-0147). Optional so a SPA deployed ahead of the
     * API degrades to the shipped copy instead of erroring.
     */
    presentation?: RegimentPresentation;
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
        imageUrl: m.imageUrl,
        detail: m.detail,
        awardedAt: m.awardedAt,
    };
}

export function mapMember(m: ApiMember): Member {
    // Normalised at the wire boundary so every reader fails closed the same way:
    // a missing or malformed block leaves `permittedActions` OFF the member
    // entirely, which the UI reads as "nothing permitted" (T-0266).
    const permittedActions = parsePermittedActions(m.permittedActions);
    return {
        id: m.id,
        discordTag: m.discordTag ?? '',
        inGameName: m.inGameName ?? '',
        rank: m.rank ?? '',
        rankId: m.rankId,
        rankImageUrl: m.rankImageUrl,
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
        ...(permittedActions ? { permittedActions } : {}),
    };
}

export function mapRank(r: ApiRank): Rank {
    return {
        id: r.id,
        name: r.name,
        imageUrl: r.imageUrl,
        holders: r.holdersCount,
        discordRole: r.discordRoleName ?? '',
        discordRoleId: r.discordRoleId,
        discordLinked: r.linked,
        order: r.precedence,
        // `=== true`, so an API that does not send the field leaves the ladder
        // fully editable rather than freezing every row — the failure mode is a
        // control that offers a rename the server then refuses with a legible
        // 403, not an admin locked out of their own ladder.
        isProtected: r.isProtected === true,
    };
}

export function mapMedal(m: ApiMedal): Medal {
    return {
        id: m.id,
        letter: m.glyph,
        imageUrl: m.imageUrl,
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
        // The applicant-facing message + decision attribution (T-0247/T-0250).
        // Left nullable rather than collapsed to undefined: the staff console
        // re-fills its message box from `userMessage`, and null is the honest
        // "nothing stored" for an application nobody has decided yet.
        userMessage: a.userMessage ?? null,
        decidedByName: a.decidedByName ?? null,
        decidedByAvatarUrl: a.decidedByAvatarUrl ?? null,
        // The officer's member id is what makes the attribution clickable rather
        // than inert text (T-0274); dropping it here is how the chip loses its
        // profile link even though the API sends the id on every decision.
        decidedByMemberId: a.decidedByMemberId ?? null,
        blocked: a.blocked ?? false,
        // Live applicant identity + profile deep-link target (T-0222).
        promotedMemberId: a.promotedMemberId,
        currentDisplayName: a.currentDisplayName,
        currentAvatarUrl: a.currentAvatarUrl,
    };
}

/**
 * Map the APPLICANT's own projection. Separate from {@link mapApplication} on
 * purpose: it takes the narrow wire type and returns the narrow view model, so
 * neither end can quietly acquire a staff-only field (T-0249).
 */
export function mapApplicantApplication(a: ApiApplicantApplication): ApplicantApplication {
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
        userMessage: a.userMessage,
        decidedAt: a.decidedAt ?? undefined,
    };
}

/** Wire shape of GET /applications/mine — the APPLICANT projection (T-0154). */
export interface ApiMyApplication {
    application: ApiApplicantApplication | null;
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
    /**
     * PRESENCE FLAGS — present on EVERY projection, public included
     * (lords-dashboard-backend:T-0151). They carry no binding detail, only
     * whether one exists, which is exactly what an anonymous page needs to
     * decide between "Password protected — sign in to reveal" and showing
     * nothing at all. Before this, the public feed omitted the server fields
     * entirely, so the page could not tell a password-protected event from a
     * plain one and badged every event identically.
     */
    hasServerName: boolean;
    hasServerPassword: boolean;
    // Member-view-only fields (omitted entirely for public callers). `serverName`
    // is `null` — never `''` — when unset, so templates can branch on it.
    serverName?: string | null;
    serverRegion?: string | null;
    recurrenceRule?: string | null;
    recurrenceCadence?: 'daily' | 'weekly' | 'monthly' | null;
    recurrenceActive?: boolean;
    recurrenceTemplateId?: string | null;
    notifyOffsets?: number[];
    isArchived?: boolean;
    myRsvp?: ApiRsvp | null;
}

/**
 * ISO 8601 sliced literally — the LAST-RESORT fallback for an instant `Intl`
 * cannot parse. This used to be how every event was rendered, which meant every
 * surface printed the stored UTC instant while labelling it with the event's
 * timezone (T-0237). Real conversion now goes through `instantToWallClock`; this
 * only stops an unparseable date rendering as `NaN`.
 */
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

/**
 * Derive an event's live status from its start/end instants (T-0204). Both
 * `startsAt`/`endsAt` are UTC ISO strings (backend `.toISOString()`), so
 * `new Date(...)` yields absolute instants and the comparison is timezone-safe.
 * Returns null for unparseable dates so the caller can fall back to the backend
 * `status` (which lags up to the 60s scheduler tick). An open-ended event (no
 * `endsAt`) that has started stays `ongoing` — it never auto-concludes here.
 */
export function deriveEventStatus(
    startsAt: string,
    endsAt: string | null,
    now: Date = new Date(),
): EventStatus | null {
    const start = new Date(startsAt);
    if (isNaN(start.getTime())) {
        return null;
    }
    if (now < start) {
        return 'upcoming';
    }
    const end = endsAt ? new Date(endsAt) : null;
    if (end && !isNaN(end.getTime())) {
        return now < end ? 'ongoing' : 'previous';
    }
    // Started, open-ended → ongoing.
    return 'ongoing';
}

export function mapEvent(e: ApiEvent): RegimentEvent {
    // DISPLAY converts to the VIEWER's own zone — note there is NO zone argument
    // (T-0237). Every surface therefore renders the same instant identically, and
    // a cross-midnight or DST-straddling event gets the LOCAL date and the offset
    // in force on that date. AUTHORING is the exact inverse and passes the
    // event's zone explicitly; see event-time.ts and EventsService.toBody.
    const start = instantToWallClock(e.startsAt) ?? splitIsoDateTime(e.startsAt);
    const end = e.endsAt ? (instantToWallClock(e.endsAt) ?? splitIsoDateTime(e.endsAt)) : null;
    return {
        id: e.id,
        title: e.title,
        description: e.description ?? '',
        // Kept NULL rather than coerced to '' so templates can tell "no server"
        // from "server redacted" and drop the field entirely (T-0236).
        serverName: e.serverName ?? null,
        serverRegion: e.serverRegion ?? undefined,
        // The password is never in this projection — only the reveal endpoint returns it.
        serverPassword: undefined,
        date: start.date,
        endDate: end?.date,
        startTime: start.time,
        endTime: end?.time ?? '',
        // The raw instants ride along so the authoring form can re-derive the
        // wall clock in the EVENT's zone instead of the viewer's (T-0251).
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        // Label the converted time honestly — otherwise a viewer-local time is
        // indistinguishable from one printed in the authored zone.
        zoneLabel: viewerZoneLabel(e.startsAt),
        timezone: e.timezone,
        platforms: e.platforms,
        // Derive Ongoing/Upcoming/Concluded client-side for instantaneous accuracy
        // (avoids the ~60s backend scheduler lag); fall back to the backend status
        // only when the dates are unparseable.
        status: deriveEventStatus(e.startsAt, e.endsAt) ?? e.status,
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
        hasServerName: e.hasServerName,
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
    /**
     * The officer who approved it. The API sends this key ONLY to callers
     * holding `moderate_gallery` — it is absent, not null, for everyone else
     * (including the public feed), so its mere presence is the server's answer
     * about whether this caller may see the attribution.
     */
    approvedBy?: ApiGalleryMemberRef | null;
    createdAt: string;
    updatedAt: string;
}

export function mapGalleryItem(g: ApiGalleryItem): GalleryItem {
    return {
        id: g.id,
        title: g.title,
        type: g.type,
        // The API persists an uploaded clip's poster frame here, so this is real
        // data, not a legacy column. '' is the "no poster" sentinel (GalleryItem
        // types it as a plain string): consumers must test it for TRUTHINESS —
        // a `??` fallback never fires against '' and silently drops the poster,
        // which is what left uploaded videos thumbnail-less on iOS (T-0242).
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
        approvedAt: g.approvedAt,
        approvedBy: g.approvedBy ?? null,
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
    actorAvatarUrl: string | null;
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
        actorAvatarUrl: a.actorAvatarUrl ?? null,
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
