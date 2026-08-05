export type EventStatus = 'upcoming' | 'ongoing' | 'previous';
export type RsvpStatus = 'interested' | 'tentative' | 'declined' | 'neutral';

/** Recurrence cadence of a recurring template (mirrors the backend enum). */
export type RecurrenceCadence = 'daily' | 'weekly' | 'monthly';

export interface RegimentEvent {
    id: string;
    title: string;
    description: string;
    /**
     * The bound server name, or null when the event has none — on EVERY
     * projection, public included (lords-dashboard-backend:T-0298). This used to
     * read null for an anonymous caller even when a server WAS bound, which is
     * why templates were told to branch on `hasServerName`; they can branch on
     * this directly now. `hasServerName` survives to distinguish "nothing bound"
     * from "bound to an empty string".
     */
    serverName: string | null;
    serverRegion?: string;
    serverPassword?: string;
    /**
     * VIEWER-LOCAL wall-clock date (`YYYY-MM-DD`) of `startsAt`. Display only —
     * authoring must go back through `startsAt` + `timezone` (see event-time.ts).
     */
    date: string;
    /** End date; may differ from `date` for multi-day events. Falls back to `date`. */
    endDate?: string;
    /** VIEWER-LOCAL `HH:mm` of `startsAt`. */
    startTime: string;
    /** VIEWER-LOCAL `HH:mm` of `endsAt`; '' when the event is open-ended. */
    endTime: string;
    /**
     * The absolute start instant exactly as the API sent it (UTC ISO). The
     * authoring form re-derives its wall clock from THIS in the event's own zone;
     * `date`/`startTime` above are already converted to the viewer's zone and
     * would silently rewrite the event if fed back into a save (T-0251).
     */
    startsAt?: string;
    /** The absolute end instant, or null for an open-ended event. */
    endsAt?: string | null;
    /**
     * Short label for the zone `date`/`startTime` are rendered in, e.g. `GMT+2`.
     * Resolved per-instant so a summer and a winter event label differently. A
     * converted time without this reads as if it were the authored zone.
     */
    zoneLabel?: string;
    /** The zone the event was AUTHORED in — not the zone `date`/`startTime` are in. */
    timezone: string;
    platforms: string[];
    status: EventStatus;
    /** Structured recurring cadence; undefined for one-off events. */
    recurrenceCadence?: RecurrenceCadence;
    /** Whether a recurring template is still generating occurrences. */
    recurrenceActive?: boolean;
    /** True when this event IS a recurring template. */
    isRecurring?: boolean;
    /** On a generated occurrence, the id of its template (member projection only). */
    recurrenceTemplateId?: string | null;
    tags: string[];
    rsvpCounts: { interested: number; tentative: number; declined: number; neutral: number };
    attendees?: string[];
    attendeesCount?: number;
    bannerUrl?: string;
    /** Storage key of a freshly-uploaded banner (write-only; sent to the API). */
    bannerKey?: string;
    notifyBefore?: string[];
    /**
     * Discord role pinged when the event is ANNOUNCED (member projection only).
     * Pinged exactly once, at announcement — never on the pre-event reminder and
     * never when the announcement's RSVP list is re-rendered. `''`/null clears it.
     */
    announceRoleId?: string | null;
    /** The signed-in member's own RSVP to this event (member projection only). */
    myRsvp?: RsvpStatus | null;
    /**
     * Presence flags — set on EVERY projection, public included (T-0151/T-0236).
     * They say only WHETHER a binding exists, which is what an anonymous page
     * needs to decide between a "password protected" note and showing nothing.
     */
    hasServerName?: boolean;
    hasServerPassword?: boolean;
    /** Whether the event is archived (member projection only). */
    isArchived?: boolean;
}
