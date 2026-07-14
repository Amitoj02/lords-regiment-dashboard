import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
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
}
