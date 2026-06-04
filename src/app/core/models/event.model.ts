export type EventStatus = 'upcoming' | 'ongoing' | 'previous';
export type RsvpStatus = 'interested' | 'tentative' | 'declined' | 'neutral';

export interface RegimentEvent {
  id: string;
  title: string;
  description: string;
  serverName: string;
  serverPassword?: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  platforms: string[];
  status: EventStatus;
  recurring?: string;
  tags: string[];
  rsvpCounts: { interested: number; tentative: number; declined: number; neutral: number; };
  attendees?: string[];
  bannerUrl?: string;
  notifyBefore?: string[];
}
