export type EventStatus = 'upcoming' | 'ongoing' | 'previous';
export type RsvpStatus = 'interested' | 'tentative' | 'declined' | 'neutral';

/** Recurrence cadence of a recurring template (mirrors the backend enum). */
export type RecurrenceCadence = 'daily' | 'weekly' | 'monthly';

export interface RegimentEvent {
    id: string;
    title: string;
    description: string;
    serverName: string;
    serverRegion?: string;
    serverPassword?: string;
    date: string;
    /** End date; may differ from `date` for multi-day events. Falls back to `date`. */
    endDate?: string;
    startTime: string;
    endTime: string;
    timezone: string;
    platforms: string[];
    status: EventStatus;
    /** Structured recurring cadence; undefined for one-off events. */
    recurrenceCadence?: RecurrenceCadence;
    /** Whether a recurring template is still generating occurrences. */
    recurrenceActive?: boolean;
    tags: string[];
    rsvpCounts: { interested: number; tentative: number; declined: number; neutral: number };
    attendees?: string[];
    attendeesCount?: number;
    bannerUrl?: string;
    /** Storage key of a freshly-uploaded banner (write-only; sent to the API). */
    bannerKey?: string;
    notifyBefore?: string[];
    /** The signed-in member's own RSVP to this event (member projection only). */
    myRsvp?: RsvpStatus | null;
}
