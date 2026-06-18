export type InspirationSyncState = "idle" | "syncing" | "ready" | "error";

export interface InspirationSourceUsage {
  status: "unused" | "used";
  sourceId: string | null;
  usedAt: string | null;
}

export interface InspirationSourceDecision {
  status: "approved" | "rejected";
  rejectedAt: string | null;
}

export interface InspirationVideoCard {
  id: string;
  accountId: string;
  platform: "tiktok";
  externalVideoId: string;
  originalUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  durationSec: number | null;
  publishedAt: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
  creatorHandle: string;
  creatorDisplayName: string | null;
  creatorAvatarUrl: string | null;
  creatorProfileUrl: string | null;
  sourceUsage: InspirationSourceUsage;
  sourceDecision: InspirationSourceDecision;
}

export interface TrackedInspirationAccount {
  id: string;
  platform: "tiktok";
  handleNormalized: string;
  handleDisplay: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  syncStatus: InspirationSyncState;
  lastSyncAttemptAt: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
  isStale: boolean;
  videos: InspirationVideoCard[];
}

export interface UseInspirationResult {
  sourceId: string;
  redirectTo: string;
}

export interface SetInspirationRejectionResult {
  videoId: string;
  sourceDecision: InspirationSourceDecision;
}
