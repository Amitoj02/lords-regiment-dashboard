import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MemberRole } from '../models/member.model';

/**
 * The regiment control-panel projection (GET /settings): the editable profile
 * merged with every regiment_settings row. Mirrors the backend SettingsDto.
 */
export interface SettingsDto {
    // Regiment profile
    name: string;
    shortTag: string;
    missionStatement: string | null;
    accentTone: string;
    crestUrl: string | null;
    bannerUrl: string | null;
    establishedYear: number | null;
    discordInviteUrl: string | null;
    discordServerId: string | null;
    discordServerName: string | null;
    // Privacy toggles
    publicRoster: boolean;
    publicGallery: boolean;
    publicEvents: boolean;
    publicStats: boolean;
    openRecruitment: boolean;
    showOfficersMessOnLanding: boolean;
    allowMercenaries: boolean;
    autoApproveTrustedMembers: boolean;
    // Gallery policy
    galleryMaxImageSizeMb: number;
    galleryMaxVideoSizeMb: number;
    galleryMaxItemsPerSubmission: number;
    galleryAllowedImageTypes: string[] | null;
    galleryAllowedVideoTypes: string[] | null;
    // Event + audit policy
    eventDefaultTimezone: string;
    eventDefaultStartTime: string | null;
    eventDefaultNotifyBefore: number[] | null;
    auditRetentionMonths: number;
}

/**
 * Body for PATCH /settings — every field optional. The Discord guild binding
 * (`discordServerId`) is intentionally NOT editable here; it moves through the
 * dedicated transfer-discord action.
 */
export type UpdateSettingsPayload = Partial<Omit<SettingsDto, 'discordServerId'>>;

/** The authorization matrix (GET /settings/permissions). Mirrors PermissionsMatrixDto. */
export interface PermissionsMatrix {
    roles: MemberRole[];
    capabilities: string[];
    /** role -> (capability -> granted). Absent cells are false. */
    matrix: Record<string, Record<string, boolean>>;
}

/** A single matrix cell edit (PATCH /settings/permissions). */
export interface PermissionChange {
    role: MemberRole;
    capability: string;
    granted: boolean;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/settings`;

    getSettings(): Observable<SettingsDto> {
        return this.http.get<SettingsDto>(this.base);
    }

    updateSettings(changes: UpdateSettingsPayload): Observable<SettingsDto> {
        return this.http.patch<SettingsDto>(this.base, changes);
    }

    getPermissions(): Observable<PermissionsMatrix> {
        return this.http.get<PermissionsMatrix>(`${this.base}/permissions`);
    }

    updatePermissions(changes: PermissionChange[]): Observable<PermissionsMatrix> {
        return this.http.patch<PermissionsMatrix>(`${this.base}/permissions`, { changes });
    }
}
