/** Tone of a "Field Dispatch" announcement (mirrors the backend NotificationTone). */
export type NotificationTone = 'info' | 'warn' | 'ok';

/**
 * A "Field Dispatch" announcement (GET /notifications). Mirrors the backend
 * NotificationDto; `read` is computed per-caller from the notification_reads
 * junction, and `author` is the display label (falls back to 'Command').
 */
export interface Notification {
    id: string;
    title: string;
    body: string;
    tone: NotificationTone;
    author: string;
    createdAt: string;
    read: boolean;
}
