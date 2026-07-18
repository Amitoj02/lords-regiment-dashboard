export type GalleryItemType = 'image' | 'video' | 'link';
export type GalleryItemStatus = 'approved' | 'pending' | 'declined';

export interface GalleryItem {
    id: string;
    title: string;
    type: GalleryItemType;
    thumbnailUrl: string;
    mediaUrl?: string;
    submittedBy: string;
    /** Author member id (used to scope a profile's gallery tab to its owner). */
    submittedByMemberId?: string;
    /** Author avatar (custom or Discord fallback); null → the card shows initials. */
    submittedByAvatarUrl?: string | null;
    submittedAt: string;
    status: GalleryItemStatus;
    likes: number;
    tags: string[];
    /** Reason recorded on decline (moderation "Declined" tab). */
    declineReason?: string | null;
    caption?: string;
    fileCount?: number;
}
