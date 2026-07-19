export type ApplicationStatus = 'pending' | 'approved' | 'declined' | 'held';

/** Enlistment track chosen on the apply form (mirrors the backend enum). */
export type ApplicantType = 'Member' | 'Mercenary';

/** View model for a recruitment application (mirrors the reshaped API contract). */
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
    /** Officer note shown to the applicant when the application is on hold. */
    moderatorNote?: string;
    /** Officer reason shown to the applicant when the application is declined. */
    declineReason?: string;
    decidedAt?: string;
    discordDmMessage?: string;
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
 * The caller's own application view (GET /applications/mine): their current
 * application (or null if they have never applied) plus whether an officer has
 * permanently blocked them from applying.
 */
export interface MyApplication {
    application: Application | null;
    blocked: boolean;
}
