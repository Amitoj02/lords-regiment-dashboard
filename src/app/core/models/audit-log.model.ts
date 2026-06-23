export type AuditSeverity = 'info' | 'warn' | 'err';

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
    discordSynced?: boolean;
}
