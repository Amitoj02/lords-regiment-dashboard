import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../models/api.model';

/** Bot gateway connection lifecycle (mirrors the backend BotConnectionStatus). */
export type BotConnectionStatus = 'idle' | 'checking' | 'connected' | 'error';

/** Live bot connection + authority snapshot (GET /discord/connection). */
export interface DiscordConnection {
    connected: boolean;
    connectionStatus: BotConnectionStatus;
    botVersion: string | null;
    totalRoles: number | null;
    botRolePosition: number | null;
    membersVisible: number | null;
    lastHeartbeatAt: string | null;
    lastFullSyncAt: string | null;
}

/**
 * Lean STAFF bot status + live metrics (GET /discord/status). Readable by
 * Owner/Admin/Moderator; omits the sensitive authority/config fields.
 */
export interface BotStatus {
    connected: boolean;
    connectionStatus: BotConnectionStatus;
    botVersion: string | null;
    membersVisible: number | null;
    totalRoles: number | null;
    wsPing: number | null;
    uptimeMs: number | null;
    memoryBytes: number | null;
    cpu: number | null;
    readyAt: string | null;
    lastHeartbeatAt: string | null;
    lastFullSyncAt: string | null;
}

/** A guild role, for the role pickers (join role, Ban role). */
export interface DiscordRole {
    id: string;
    name: string;
    position: number;
}

/** A guild text channel, for the channel pickers. */
export interface DiscordChannel {
    id: string;
    name: string;
}

/**
 * verify-connection response: the connection snapshot plus the guild's roles and
 * text channels, so the Settings pickers populate from a single call.
 */
export interface DiscordVerifyConnection extends DiscordConnection {
    roles: DiscordRole[];
    channels: DiscordChannel[];
}

/** The regiment's Discord bot configuration (GET /discord/settings). */
export interface DiscordBotSettings {
    botEnabled: boolean;
    announcementChannelId: string | null;
    welcomeChannelId: string | null;
    welcomeMessage: string | null;
    /** Per-purpose routed channels (admin-picked). */
    enlistmentChannelId: string | null;
    enlistmentChannelName: string | null;
    auditLogChannelId: string | null;
    auditLogChannelName: string | null;
    eventAnnouncementChannelId: string | null;
    eventAnnouncementChannelName: string | null;
    joinRoleId: string | null;
    joinRoleName: string;
    /** Role applied on an app-side ban (required before applyBanRoleOnBan). */
    banRoleId: string | null;
    banRoleName: string | null;
    syncRolesOnChange: boolean;
    /** SENSITIVE: when true, an app ban strips managed roles and applies the Ban role. */
    applyBanRoleOnBan: boolean;
}

/** Partial update of the bot configuration (PATCH /discord/settings). */
export type UpdateDiscordSettingsPayload = Partial<DiscordBotSettings>;

/** One recorded bot operation — a drained sync job's outcome (GET /discord/operations). */
export interface BotOperation {
    id: string;
    occurredAt: string;
    operation: string;
    success: boolean;
    /** True while an admin has not yet resolved a failed op. */
    resolvable: boolean;
}

@Injectable({ providedIn: 'root' })
export class DiscordService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/discord`;

    getConnection(): Observable<DiscordConnection> {
        return this.http.get<DiscordConnection>(`${this.base}/connection`);
    }

    /** STAFF-readable bot status + live metrics for the dashboard widget (T-0081). */
    getStatus(): Observable<BotStatus> {
        return this.http.get<BotStatus>(`${this.base}/status`);
    }

    /** Re-probe the gateway; returns the snapshot plus the guild roles + channels. */
    verifyConnection(): Observable<DiscordVerifyConnection> {
        return this.http.post<DiscordVerifyConnection>(`${this.base}/verify-connection`, {});
    }

    /**
     * The guild's roles (GET /discord/roles). Gated on edit_ranks_medals, so the
     * Ranks & Medals role picker can populate without needing manage_settings.
     */
    getRoles(): Observable<DiscordRole[]> {
        return this.http
            .get<DiscordRole[]>(`${this.base}/roles`)
            .pipe(
                map((roles) =>
                    roles.map((r) => ({ id: r.id, name: r.name, position: r.position })),
                ),
            );
    }

    getSettings(): Observable<DiscordBotSettings> {
        return this.http.get<DiscordBotSettings>(`${this.base}/settings`);
    }

    updateSettings(changes: UpdateDiscordSettingsPayload): Observable<DiscordBotSettings> {
        return this.http.patch<DiscordBotSettings>(`${this.base}/settings`, changes);
    }

    /** Enqueue a full role resync; resolves to the number of jobs enqueued. */
    resync(): Observable<number> {
        return this.http
            .post<{ enqueued: number }>(`${this.base}/resync`, {})
            .pipe(map((res) => res.enqueued));
    }

    /** Cross-post an announcement to Discord (ManageNotifications). */
    announce(content: string, channelId?: string): Observable<boolean> {
        return this.http
            .post<{ enqueued: boolean }>(`${this.base}/announce`, { content, channelId })
            .pipe(map((res) => res.enqueued));
    }

    /** Recent bot operations (first page; the backend caps `limit` at 100). */
    getOperations(): Observable<BotOperation[]> {
        return this.http
            .get<PaginatedResponse<BotOperation>>(`${this.base}/operations?limit=100`)
            .pipe(map((res) => res.data));
    }

    resolveOperation(id: string): Observable<BotOperation> {
        return this.http.post<BotOperation>(`${this.base}/operations/${id}/resolve`, {});
    }

    /** Bind (or rebind) the regiment to a Discord guild. */
    bind(
        discordServerId: string,
        discordServerName?: string,
    ): Observable<{ discordServerId: string | null; discordServerName: string | null }> {
        return this.http.post<{
            discordServerId: string | null;
            discordServerName: string | null;
        }>(`${this.base}/bind`, { discordServerId, discordServerName });
    }
}
