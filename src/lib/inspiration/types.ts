export type InspirationSyncState = "idle" | "syncing" | "ready" | "error";

export type InspirationSourceFeedFilter = "all" | "unused" | "used" | "rejected";
export type InspirationSourceSort = "recent" | "views" | "engagement";

export const INSPIRATION_VIDEO_PAGE_SIZE = 24;

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
  videoCount: number;
}

export interface InspirationSourceUsageCounts {
  all: number;
  unused: number;
  used: number;
  rejected: number;
}

export interface InspirationVideoPage {
  items: InspirationVideoCard[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
  usageCounts: InspirationSourceUsageCounts;
}

export interface InspirationVideoPageQuery {
  accountId?: string | null;
  cursor?: string | null;
  take?: number;
  usage?: InspirationSourceFeedFilter;
  search?: string;
  sort?: InspirationSourceSort;
}

export interface UseInspirationResult {
  sourceId: string;
  redirectTo: string;
}

export interface SetInspirationRejectionResult {
  videoId: string;
  sourceDecision: InspirationSourceDecision;
}

export function parseInspirationSourceFeedFilter(
  value: string
): InspirationSourceFeedFilter {
  switch (value) {
    case "all":
    case "unused":
    case "used":
    case "rejected":
      return value;
    default:
      return "all";
  }
}

export function parseInspirationSourceSort(
  value: string
): InspirationSourceSort {
  switch (value) {
    case "recent":
    case "views":
    case "engagement":
      return value;
    default:
      return "recent";
  }
}

export function emptyInspirationVideoPage(): InspirationVideoPage {
  return {
    items: [],
    nextCursor: null,
    hasMore: false,
    total: 0,
    usageCounts: {
      all: 0,
      unused: 0,
      used: 0,
      rejected: 0,
    },
  };
}

export function inspirationVideoFeedPath(
  input: InspirationVideoPageQuery
): string {
  const params = new URLSearchParams();
  const take = input.take ?? INSPIRATION_VIDEO_PAGE_SIZE;
  params.set("take", String(take));
  if (input.cursor) params.set("cursor", input.cursor);
  if (input.usage && input.usage !== "all") params.set("usage", input.usage);
  const search = input.search?.trim();
  if (search) params.set("search", search);
  if (input.sort && input.sort !== "recent") params.set("sort", input.sort);

  const base = input.accountId
    ? `/api/ugc-inspiration/accounts/${encodeURIComponent(input.accountId)}/videos`
    : "/api/ugc-inspiration/accounts/feed";
  return `${base}?${params.toString()}`;
}
