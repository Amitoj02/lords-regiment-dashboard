export type GalleryItemType = 'image' | 'video' | 'link';
export type GalleryItemStatus = 'approved' | 'pending' | 'declined';

export interface GalleryItem {
    id: string;
    title: string;
    type: GalleryItemType;
    thumbnailUrl: string;
    mediaUrl?: string;
    /**
     * Intrinsic size of `mediaUrl`, when the API recorded one (T-0293).
     *
     * Only the share card reads these: an unfurler sizes its player purely from
     * the declared `og:video:width/height`, and the crawler shell already emits
     * them, so without these two fields the SPA's copy of the same tag set was
     * the one thing about a playable dispatch the two documents disagreed on.
     * Absent for a link item and for anything uploaded before the columns were
     * populated.
     */
    mediaWidth?: number | null;
    mediaHeight?: number | null;
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
    /** ISO-8601 instant the item was approved; null while pending/declined. */
    approvedAt?: string | null;
    /**
     * The officer who approved it — populated ONLY when the API decided this
     * caller may see it (holders of `moderate_gallery`). Null otherwise, and
     * null for an item nobody has approved.
     */
    approvedBy?: { memberId: string; name: string; avatarUrl?: string | null } | null;
}
