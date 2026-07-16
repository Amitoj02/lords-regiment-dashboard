export type AuditSeverity = 'info' | 'warn' | 'err';

export type DiscordSyncStatus = 'pending' | 'synced' | 'failed' | 'not_applicable';

export interface AuditLog {
    id: string;
    timestamp: string;
    actor: string;
    /** Member id of the actor, when a roster member (drives "View profile" / "All by"). */
    actorMemberId?: string | null;
    action: string;
    detail: string;
    severity: AuditSeverity;
    targetUser?: string;
    /** Member id of the target, when a roster member (drives "View profile"). */
    targetMemberId?: string | null;
    beforeState?: string;
    afterState?: string;
    requestId?: string;
    discordSyncStatus?: DiscordSyncStatus | null;
}
