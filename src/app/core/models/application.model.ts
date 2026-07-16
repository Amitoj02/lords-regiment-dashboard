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
