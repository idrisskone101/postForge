import type { SerializedOutputReviewStatus } from "@/lib/output-review-status";
import type { GalleryFeedback, GalleryItem } from "./types";

export type GalleryMediaSession = {
  selectedIds: Set<string>;
  deletingId: string | null;
  stampedIds: ReadonlySet<string>;
  toggleSelection: (id: string) => void;
  openPreview: (item: GalleryItem) => void;
  copySourceUrl: (url: string) => void;
  downloadItem: (item: GalleryItem) => void;
  deleteItem: (item: GalleryItem) => Promise<void>;
  markStamped: (id: string) => void;
  onReviewStatusChange?: (
    id: string,
    reviewStatus: SerializedOutputReviewStatus
  ) => void;
  onHandoff?: (item: GalleryItem) => Promise<boolean>;
  onFeedback?: (feedback: GalleryFeedback) => void;
};
