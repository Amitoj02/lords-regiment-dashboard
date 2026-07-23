export type ApplicationStatus = 'pending' | 'approved' | 'declined' | 'held';

/** Enlistment track chosen on the apply form (mirrors the backend enum). */
export type ApplicantType = 'Member' | 'Mercenary';

/**
 * View model for a recruitment application — the STAFF projection returned by
 * `GET /applications` and `GET /applications/:id`. The applicant's own view is
 * {@link ApplicantApplication}, a deliberately separate shape: a staff-only
 * field added here must never reach the applicant just because it was added.
 */
export interface Application {
    id: string;
    applicantName: string;
    discordTag: string;
    inGameName: string;
    applicantType: ApplicantType;
    currentRegiment: string;
    howFound: string;
    preferredClasses: string;
    skillsToImprove: string;
    interestConfirmed: boolean;
    representativeNote?: string;
    submittedAt: string;
    status: ApplicationStatus;
    isPreviousApplicant?: boolean;
    /**
     * Internal officer note. STAFF-ONLY — it is absent from the applicant
     * projection and is never rendered on the applicant's status page (T-0249).
     */
    moderatorNote?: string;
    /** Internal decline reason. STAFF-ONLY, exactly like {@link moderatorNote}. */
    declineReason?: string;
    decidedAt?: string;
    /**
     * The message the deciding officer wrote FOR the applicant — DM'd on Discord
     * and echoed on their status page (T-0247). The one piece of decision text
     * that deliberately crosses to the applicant.
     */
    userMessage?: string | null;
    /**
     * Who took the decision (T-0250). Null while pending, and also null when the
     * decider's member row was later removed, so render defensively. A HELD
     * application has a decider even though {@link decidedAt} is still null.
     */
    decidedByName?: string | null;
    decidedByAvatarUrl?: string | null;
    /**
     * The deciding officer's member id — the profile deep-link target for the
     * attribution chip (T-0274). Null exactly when {@link decidedByName} is:
     * the FK is ON DELETE SET NULL, so a removed officer leaves the decision
     * attributed to nobody rather than pointing at a profile that is gone.
     */
    decidedByMemberId?: string | null;
    /** Whether the applicant's Discord identity is blocked from applying (T-0128). */
    blocked?: boolean;
    /** Member id created on approval — drives the profile deep-link (T-0222/T-0223). */
    promotedMemberId?: string | null;
    /**
     * The applicant's current display name (reflecting post-approval renames):
     * the promoted member's name, else the linked Discord global name. When null,
     * consumers fall back to {@link applicantName} (the submit-time snapshot).
     */
    currentDisplayName?: string | null;
    /** The applicant's current avatar URL; when null the avatar falls back to initials. */
    currentAvatarUrl?: string | null;
}

/**
 * The APPLICANT's own view of their application (`POST /applications`,
 * `GET /applications/mine`, `PATCH /applications/mine`).
 *
 * Enumerated explicitly instead of derived from {@link Application}, because
 * the whole point of the split is that `moderatorNote` and `declineReason` do
 * not EXIST on this type: a future template physically cannot bind staff text
 * into the applicant's page (T-0249). {@link userMessage} is the only decision
 * text an applicant is ever shown.
 */
export interface ApplicantApplication {
    id: string;
    applicantName: string;
    discordTag: string;
    inGameName: string;
    applicantType: ApplicantType;
    currentRegiment: string;
    howFound: string;
    preferredClasses: string;
    skillsToImprove: string;
    interestConfirmed: boolean;
    representativeNote?: string;
    submittedAt: string;
    status: ApplicationStatus;
    isPreviousApplicant?: boolean;
    /**
     * The officer's message to the applicant; null when none was written.
     * Optional only so the staff {@link Application} stays structurally
     * assignable here — the API always sends the key.
     */
    userMessage: string | null;
    decidedAt?: string;
}

/**
 * The caller's own application view (GET /applications/mine): their current
 * application (or null if they have never applied) plus whether an officer has
 * permanently blocked them from applying.
 */
export interface MyApplication {
    application: ApplicantApplication | null;
    blocked: boolean;
}
