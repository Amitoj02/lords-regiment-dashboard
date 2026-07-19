import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Response of POST /api/storage/uploads (mirrors the backend PresignedUploadDto). */
export interface PresignedUpload {
    key: string;
    uploadUrl: string;
    publicUrl: string;
    expiresIn: number;
    requiredContentType: string;
}

/** Upload targets (mirrors the backend StorageTarget enum). */
export type StorageTarget =
    | 'member-avatar'
    | 'member-banner'
    | 'event-banner'
    | 'medal-image'
    | 'rank-image'
    | 'gallery';

/** One target's upload policy (mirrors the backend StorageTargetPolicyDto). */
export interface StorageTargetPolicy {
    target: StorageTarget;
    kinds: ('image' | 'video')[];
    /** Effective image size cap in MB (target policy capped by the global ceiling). */
    maxImageMb: number;
    /** Effective video cap in MB, or null for image-only targets. */
    maxVideoMb: number | null;
    acceptedMimeTypes: string[];
    acceptedExtensions: string[];
}

/** The per-target upload policy (mirrors the backend StoragePolicyDto, GET /storage/policy). */
export interface StoragePolicy {
    maxUploadMb: number;
    image: { mimeTypes: string[]; extensions: string[] };
    video: { mimeTypes: string[]; extensions: string[] };
    targets: StorageTargetPolicy[];
}

const IMAGE_TYPES = {
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    extensions: ['png', 'jpg', 'webp'],
};
/** Rank/medal icons accept PNG + SVG + WebP (mirrors backend T-0124/T-0130). */
const ICON_TYPES = {
    mimeTypes: ['image/png', 'image/svg+xml', 'image/webp'],
    extensions: ['png', 'svg', 'webp'],
};
const VIDEO_TYPES = {
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    extensions: ['mp4', 'webm', 'mov'],
};

/** Max pixel dimension (per side) for a rank/medal icon (mirrors backend T-0125). */
export const ICON_MAX_DIMENSION_PX = 250;

/** The upload targets whose icons are size-capped + restricted to PNG/SVG. */
const ICON_TARGETS: StorageTarget[] = ['rank-image', 'medal-image'];

/**
 * Static fallback mirroring the backend storage TARGET_POLICY. Rendered
 * immediately so upload hints never wait on the network, and used verbatim when
 * GET /storage/policy fails — a hint must degrade gracefully, never block an
 * upload. Kept in sync with the backend source of truth via GET /storage/policy.
 */
export const DEFAULT_STORAGE_POLICY: StoragePolicy = {
    maxUploadMb: 100,
    image: IMAGE_TYPES,
    video: VIDEO_TYPES,
    targets: [
        {
            target: 'member-avatar',
            kinds: ['image'],
            maxImageMb: 8,
            maxVideoMb: null,
            acceptedMimeTypes: IMAGE_TYPES.mimeTypes,
            acceptedExtensions: IMAGE_TYPES.extensions,
        },
        {
            target: 'member-banner',
            kinds: ['image'],
            maxImageMb: 12,
            maxVideoMb: null,
            acceptedMimeTypes: IMAGE_TYPES.mimeTypes,
            acceptedExtensions: IMAGE_TYPES.extensions,
        },
        {
            target: 'event-banner',
            kinds: ['image'],
            maxImageMb: 12,
            maxVideoMb: null,
            acceptedMimeTypes: IMAGE_TYPES.mimeTypes,
            acceptedExtensions: IMAGE_TYPES.extensions,
        },
        {
            target: 'medal-image',
            kinds: ['image'],
            maxImageMb: 4,
            maxVideoMb: null,
            acceptedMimeTypes: ICON_TYPES.mimeTypes,
            acceptedExtensions: ICON_TYPES.extensions,
        },
        {
            target: 'rank-image',
            kinds: ['image'],
            maxImageMb: 4,
            maxVideoMb: null,
            acceptedMimeTypes: ICON_TYPES.mimeTypes,
            acceptedExtensions: ICON_TYPES.extensions,
        },
        {
            target: 'gallery',
            kinds: ['image', 'video'],
            maxImageMb: 12,
            maxVideoMb: 80,
            acceptedMimeTypes: [...IMAGE_TYPES.mimeTypes, ...VIDEO_TYPES.mimeTypes],
            acceptedExtensions: [...IMAGE_TYPES.extensions, ...VIDEO_TYPES.extensions],
        },
    ],
};

/** Human labels for the file extensions surfaced in upload hints. */
const EXT_LABELS: Record<string, string> = {
    png: 'PNG',
    jpg: 'JPG',
    jpeg: 'JPG',
    webp: 'WebP',
    svg: 'SVG',
    gif: 'GIF',
    mp4: 'MP4',
    webm: 'WEBM',
    mov: 'MOV',
};

/**
 * Presigned-upload client (T-0093 and friends). Two-step: ask the API for a
 * presigned PUT URL (which validates type/size + capability), then PUT the bytes
 * straight to object storage — the bytes never pass through the API. `upload()`
 * chains both and resolves to the namespaced storage key the owning resource
 * submits back (e.g. as `bannerKey`).
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/storage`;

    /** Cached policy stream — fetched once, shared, and falls back to the defaults. */
    private policy$?: Observable<StoragePolicy>;

    /**
     * The per-target upload policy (GET /storage/policy), cached and shared. A
     * failed fetch degrades to {@link DEFAULT_STORAGE_POLICY} so upload hints
     * always render and never block an upload (T-0187).
     */
    getPolicy(): Observable<StoragePolicy> {
        this.policy$ ??= this.http.get<StoragePolicy>(`${this.base}/policy`).pipe(
            catchError(() => of(DEFAULT_STORAGE_POLICY)),
            shareReplay(1),
        );
        return this.policy$;
    }

    /** The policy for one target, falling back to the static default for that target. */
    static targetPolicy(policy: StoragePolicy, target: StorageTarget): StorageTargetPolicy {
        return (
            policy.targets.find((t) => t.target === target) ??
            (DEFAULT_STORAGE_POLICY.targets.find((t) => t.target === target) as StorageTargetPolicy)
        );
    }

    /**
     * A user-facing "accepted types · max size" hint for a single-file target
     * (avatar/banner/event). E.g. "PNG, JPG or WebP · max 8 MB".
     */
    static uploadHint(policy: StoragePolicy, target: StorageTarget): string {
        const p = StorageService.targetPolicy(policy, target);
        const base = `${StorageService.formatExtensions(p.acceptedExtensions)} · max ${p.maxImageMb} MB`;
        // Rank/medal icons are additionally capped to a max pixel dimension (T-0125).
        return ICON_TARGETS.includes(target) ? `${base} · ${ICON_MAX_DIMENSION_PX}px max` : base;
    }

    /** Join extension labels as "PNG, JPG or WebP". */
    static formatExtensions(extensions: string[]): string {
        const labels = extensions.map((e) => EXT_LABELS[e] ?? e.toUpperCase());
        if (labels.length <= 1) return labels[0] ?? '';
        return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
    }

    /** Step 1: request a presigned upload ticket for a file. */
    requestUpload(target: StorageTarget, file: File): Observable<PresignedUpload> {
        return this.http.post<PresignedUpload>(`${this.base}/uploads`, {
            target,
            contentType: file.type,
            sizeBytes: file.size,
            fileName: file.name,
        });
    }

    /**
     * Presign + PUT the file to object storage; resolves to the storage key. The
     * PUT must send exactly the signed Content-Type (the backend also signs the
     * Content-Length, so the browser's automatic length must match — it does).
     */
    upload(target: StorageTarget, file: File): Observable<string> {
        return this.requestUpload(target, file).pipe(
            switchMap((ticket) =>
                this.http
                    .put(ticket.uploadUrl, file, {
                        headers: { 'Content-Type': ticket.requiredContentType },
                    })
                    .pipe(map(() => ticket.key)),
            ),
        );
    }

    /**
     * Extract a user-facing upload error message from an HttpErrorResponse. The
     * backend returns a standardized "Your file size exceeds the limit of N MB"
     * (and similar) in `error.message`; surface it verbatim (T-0160), falling back
     * to a generic message when none is present.
     */
    static uploadErrorMessage(err: unknown, fallback = 'Upload failed. Please try again.'): string {
        const body = (err as { error?: unknown })?.error;
        const message = (body as { message?: unknown })?.message;
        if (typeof message === 'string' && message.trim()) return message;
        if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
        return fallback;
    }
}
