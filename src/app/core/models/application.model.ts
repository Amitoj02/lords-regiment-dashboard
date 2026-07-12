export type ApplicationStatus = 'pending' | 'approved' | 'declined' | 'held';

/** View model for a recruitment application (mirrors the reshaped API contract). */
export interface Application {
    id: string;
    applicantName: string;
    discordTag: string;
    inGameName: string;
    currentRegiment: string;
    howFound: string;
    preferredClasses: string;
    skillsToImprove: string;
    interestConfirmed: boolean;
    representativeNote?: string;
    submittedAt: string;
    status: ApplicationStatus;
    isPreviousApplicant?: boolean;
    moderatorNote?: string;
    discordDmMessage?: string;
}
