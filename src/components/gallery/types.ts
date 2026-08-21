import type { SerializedOutputReviewStatus } from "@/lib/output-review-status";

export interface GalleryItem {
  id: string;
  jobId: string;
  type: "image" | "video";
  url: string;
  filename?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  model: string;
  prompt?: string;
  tiktokSourceUrl?: string;
  reviewStatus: SerializedOutputReviewStatus;
  createdAt: string | Date;
}

export type GalleryView = "grid" | "list";

export type GalleryFeedback = {
  tone: "success" | "error";
  message: string;
};

export type GalleryItemActions = {
  onDelete: (id: string) => Promise<boolean>;
  onReviewStatusChange?: (
    id: string,
    reviewStatus: SerializedOutputReviewStatus
  ) => void;
  onHandoff?: (item: GalleryItem) => Promise<boolean>;
  onFeedback?: (feedback: GalleryFeedback) => void;
};
