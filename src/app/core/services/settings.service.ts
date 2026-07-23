import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    ApiAdminRegimentDocument,
    ApiRegimentDocument,
    RegimentDocumentSlug,
    RegimentPresentation,
} from '../models/api.model';
import { MemberRole } from '../models/member.model';

/**
 * The regiment control-panel projection (GET /settings): the editable profile
 * merged with every regiment_settings row. Mirrors the backend SettingsDto.
 */
export interface SettingsDto {
    // Regiment profile
    name: string;
    missionStatement: string | null;
    accentTone: string;
    crestUrl: string | null;
    bannerUrl: string | null;
    establishedYear: number | null;
    /** Full establishment date (YYYY-MM-DD); drives the landing "Since est MM/YYYY". */
    establishedAt: string | null;
    discordInviteUrl: string | null;
    discordServerId: string | null;
    discordServerName: string | null;
    // Privacy toggles
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
 * Body for PATCH /settings — every field optional.
 *
 * `discordServerId` is deliberately omitted: `POST /discord/bind` (the connect
 * wizard, `DiscordService.bind()`) is the SOLE binder of the regiment's guild,
 * so the id can only ever change down that one audited path. The separate
 * rebinding action that used to own it has been retired (T-0264).
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

/**
 * Body for PATCH /settings/presentation. Mirrors the backend
 * UpdatePresentationDto exactly — the API runs `forbidNonWhitelisted`, so an
 * extra key here is a 400, not a silently ignored field. In particular the
 * banners are written as storage KEYS and read back as URLs, which is why this
 * is not simply `Partial<RegimentPresentation>`.
 *
 * An explicit `null` CLEARS a field back to the shipped default; omitting the
 * key leaves it untouched.
 */
export interface UpdatePresentationPayload {
    heroBannerKey?: string | null;
    loginBannerKey?: string | null;
    charterQuote?: string | null;
    charterQuoteAttribution?: string | null;
    loginQuote?: string | null;
    loginQuoteAttribution?: string | null;
    heroOverlayDensity?: number | null;
    loginOverlayDensity?: number | null;
}

/** Length/range caps, mirroring the backend presentation DTO constants. */
export const QUOTE_MAX_LENGTH = 500;
export const QUOTE_ATTRIBUTION_MAX_LENGTH = 120;
export const OVERLAY_DENSITY_MAX = 100;

/** Body cap for a legal document, mirroring the backend DOCUMENT_MAX_LENGTH. */
export const DOCUMENT_MAX_LENGTH = 60_000;

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

    // ── Public presentation + legal documents ────────────────────────────────
    // Gated on `manage_regiment_details`, NOT `manage_settings` — see the backend
    // controller note: writing the public copy is deliberately a different grant
    // from holding the permission matrix.

    getPresentation(): Observable<RegimentPresentation> {
        return this.http.get<RegimentPresentation>(`${this.base}/presentation`);
    }

    updatePresentation(changes: UpdatePresentationPayload): Observable<RegimentPresentation> {
        return this.http.patch<RegimentPresentation>(`${this.base}/presentation`, changes);
    }

    /** The staff view of all three legal documents, with edit attribution. */
    getDocuments(): Observable<ApiAdminRegimentDocument[]> {
        return this.http.get<ApiAdminRegimentDocument[]>(`${this.base}/documents`);
    }

    /**
     * Replace one legal document. A blank body is a legitimate submission: the
     * backend stores it and projects it back as `body: null`, which every reader
     * renders as its shipped fallback copy.
     */
    updateDocument(
        slug: RegimentDocumentSlug,
        body: string | null,
    ): Observable<ApiAdminRegimentDocument> {
        return this.http.put<ApiAdminRegimentDocument>(`${this.base}/documents/${slug}`, { body });
    }

    /**
     * The ANONYMOUS read side of the same documents (GET /regiment/documents).
     * It lives on this service rather than RegimentService because it is the
     * public projection of a resource this service owns the write side of —
     * keeping the pair together is what stops the two shapes drifting.
     */
    getPublicDocuments(): Observable<ApiRegimentDocument[]> {
        return this.http.get<ApiRegimentDocument[]>(`${environment.apiBaseUrl}/regiment/documents`);
    }
}
