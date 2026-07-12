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

/** The regiment's Discord bot configuration (GET /discord/settings). */
export interface DiscordBotSettings {
    botEnabled: boolean;
    announcementChannelId: string | null;
    welcomeChannelId: string | null;
    welcomeMessage: string | null;
    joinRoleId: string | null;
    joinRoleName: string;
    syncRolesOnChange: boolean;
    /** SENSITIVE: when true, an app ban also kicks the member from Discord. */
    kickOnBan: boolean;
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

    /** Re-probe the gateway and refresh the connection snapshot. */
    verifyConnection(): Observable<DiscordConnection> {
        return this.http.post<DiscordConnection>(`${this.base}/verify-connection`, {});
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
