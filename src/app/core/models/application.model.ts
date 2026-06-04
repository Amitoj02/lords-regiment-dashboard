export type ApplicationStatus = 'pending' | 'approved' | 'declined' | 'held';
export type ApplicantType = 'Applicant' | 'Mercenary';

export interface Application {
  id: string;
  applicantName: string;
  discordTag: string;
  inGameName: string;
  platform: string;
  applicantType: ApplicantType;
  source: string;
  submittedAt: string;
  status: ApplicationStatus;
  whyJoin?: string;
  howFound?: string;
  priorExperience?: string;
  timezone?: string;
  isPreviousApplicant?: boolean;
  moderatorNote?: string;
  discordDmMessage?: string;
}
