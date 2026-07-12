export type AuditSeverity = 'info' | 'warn' | 'err';

export type DiscordSyncStatus = 'pending' | 'synced' | 'failed' | 'not_applicable';

export interface AuditLog {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    detail: string;
    severity: AuditSeverity;
    targetUser?: string;
    beforeState?: string;
    afterState?: string;
    requestId?: string;
    discordSyncStatus?: DiscordSyncStatus | null;
}
