export type GalleryItemType = 'image' | 'video' | 'link';
export type GalleryItemStatus = 'approved' | 'pending' | 'declined';

export interface GalleryItem {
    id: string;
    title: string;
    type: GalleryItemType;
    thumbnailUrl: string;
    mediaUrl?: string;
    submittedBy: string;
    submittedAt: string;
    status: GalleryItemStatus;
    likes: number;
    tags: string[];
    linkedEvent?: string;
    taggedMembers?: string[];
    caption?: string;
    fileCount?: number;
}
