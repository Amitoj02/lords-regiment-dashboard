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

/** Which catalogue a bulk role re-link belongs to (mirrors backend RoleRelinkSubject). */
export type RoleRelinkSubject = 'rank' | 'medal';

/**
 * Lifecycle of one bulk re-link run (mirrors backend RoleRelinkBatchState).
 * `partial` and `cancelled` are both operator stops and NEITHER is rolled back —
 * they differ only in whether anything had already been applied.
 */
export type RoleRelinkBatchState = 'running' | 'completed' | 'partial' | 'cancelled';

/**
 * Why a run's failures happened, split by the CLASS of Discord error, so a role
 * hierarchy problem is diagnosable from the progress poll alone.
 */
export interface RoleRelinkFailures {
    /** Permanent on the first attempt (deleted role, bot below the target role). */
    permanent: number;
    /** Failed after burning every retry attempt. */
    exhausted: number;
    /** Failed at least once and still in retry backoff. */
    retrying: number;
    /** A few distinct error messages, enough to identify the cause. */
    samples: string[];
}

/** Live progress — or the terminal summary — of one bulk re-link batch. */
export interface RoleRelinkProgress {
    batchId: string;
    state: RoleRelinkBatchState;
    subject: RoleRelinkSubject;
    subjectLabel: string | null;
    /** The role being stripped from holders. */
    outgoingRoleId: string | null;
    /** The role being applied to holders. */
    incomingRoleId: string | null;
    /** More pages of members are still being fanned out, so `total` is still growing. */
    expanding: boolean;
    total: number;
    applied: number;
    pending: number;
    failed: number;
    /** Per-member jobs dropped by a cancel (never applied). */
    cancelled: number;
    failures: RoleRelinkFailures;
    startedAt: string;
    finishedAt: string | null;
}

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

    // ── Bulk role re-link (T-0254) ───────────────────────────────────────────
    // Changing a rank's/medal's linked role re-roles every holder in Discord. The
    // backend answers the link/unlink call with `relinkBatchId` — the handle for
    // the ONE bulk job that change queued — and only when a run was actually
    // started (nothing is queued when the bot is off, role syncing is off, the
    // role did not really change, or the rank/medal has no linked holders).
    //
    // WHY the link/unlink calls live here rather than on RanksService/MedalsService:
    // those map their responses through `mapRank`/`mapMedal` into the domain
    // models, which deliberately carry no transient job handle, so `relinkBatchId`
    // is dropped before a caller can see it. It is a Discord-sync concern, so the
    // raw body is read here. (`subject + 's'` is the collection segment: /ranks, /medals.)

    /**
     * Progress of one bulk re-link. Counts are derived from the job rows, so they
     * survive an API restart and every polling tab sees the same numbers.
     */
    getRelinkProgress(batchId: string): Observable<RoleRelinkProgress> {
        return this.http.get<RoleRelinkProgress>(`${this.base}/relink/${batchId}`);
    }

    /**
     * Stop a run. Members already updated STAY updated — there is no rollback —
     * and the run reports as `partial` (or `cancelled` if nothing had landed yet).
     */
    cancelRelink(batchId: string): Observable<RoleRelinkProgress> {
        return this.http.post<RoleRelinkProgress>(`${this.base}/relink/${batchId}/cancel`, {});
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
