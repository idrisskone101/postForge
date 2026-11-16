import { formatRelativeDate } from "@/lib/utils/format-date";
import type {
  InspirationSourceDecision,
  InspirationSourceFeedFilter,
  InspirationSourceSort,
  InspirationSourceUsageCounts,
  InspirationVideoCard,
  TrackedInspirationAccount,
} from "@/lib/inspiration/types";

export type VideoPageQuery = {
  accountId?: string | null;
  usage?: InspirationSourceFeedFilter;
  search?: string;
  sort?: InspirationSourceSort;
};

export const TRACK_CREATOR_INPUT_ID = "inspiration-track-creator";

export const SOURCE_FEED_FILTERS: ReadonlyArray<{
  value: InspirationSourceFeedFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "unused", label: "Not used" },
  { value: "used", label: "Used" },
  { value: "rejected", label: "Rejected" },
];

export function formatMetric(value: number | null): string {
  if (value === null) return "-";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

export function formatDuration(durationSec: number | null): string | undefined {
  if (!durationSec || durationSec <= 0) return undefined;
  const total = Math.round(durationSec);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${(total % 60).toString().padStart(2, "0")}`;
}

export function formatPublishedDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getInspirationThumbnailSrc(videoId: string, updatedAt: string, retry = 0): string {
  const base = `/api/ugc-inspiration/videos/${videoId}/thumbnail?v=${encodeURIComponent(updatedAt)}`;
  return retry ? `${base}&retry=${retry}` : base;
}

export function getInspirationAvatarSrc(accountId: string, updatedAt: string): string {
  return `/api/ugc-inspiration/accounts/${accountId}/avatar?v=${encodeURIComponent(updatedAt)}`;
}

export function getCreatorSyncMeta(
  account: TrackedInspirationAccount,
  isRefreshing: boolean
): { label: string; tone: "live" | "warn" | "muted" } {
  if (isRefreshing || account.syncStatus === "syncing") {
    return { label: "Syncing now", tone: "live" };
  }

  if (account.syncStatus === "error") {
    const when = account.lastSyncAttemptAt ?? account.updatedAt;
    return { label: `Refresh failed ${formatRelativeDate(when)}`, tone: "warn" };
  }

  const posts = `${account.videoCount} ${account.videoCount === 1 ? "post" : "posts"}`;
  return {
    label: account.lastSyncedAt
      ? `${posts} - ${formatRelativeDate(account.lastSyncedAt)}`
      : `${posts} - not synced yet`,
    tone: "muted",
  };
}

export function isTrackableHandle(input: string): boolean {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/tiktok\.com\/@([^/?#]+)/i);
  const raw = (urlMatch?.[1] ?? trimmed).replace(/^@/, "").trim();
  const handle = raw.split(/[/?#]/)[0].toLowerCase();
  return /^[a-z0-9._-]+$/.test(handle);
}

export function sortAccounts(accounts: TrackedInspirationAccount[]) {
  return [...accounts].sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}

export function filterVideosBySourceUsage(
  videos: InspirationVideoCard[],
  filter: InspirationSourceFeedFilter
) {
  switch (filter) {
    case "all":
      return videos;
    case "rejected":
      return videos.filter(
        (video) => video.sourceDecision.status === "rejected"
      );
    case "used":
      return videos.filter(
        (video) =>
          video.sourceDecision.status === "approved" &&
          video.sourceUsage.status === "used"
      );
    case "unused":
      return videos.filter(
        (video) =>
          video.sourceDecision.status === "approved" &&
          video.sourceUsage.status === "unused"
      );
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

export function mergeAccountIntoState(
  accounts: TrackedInspirationAccount[],
  nextAccount: TrackedInspirationAccount
) {
  const hasExisting = accounts.some((account) => account.id === nextAccount.id);
  const merged = hasExisting
    ? accounts.map((account) =>
        account.id === nextAccount.id ? nextAccount : account
      )
    : [nextAccount, ...accounts];

  return sortAccounts(merged);
}

export function appendAccountPage(
  current: TrackedInspirationAccount[],
  incoming: TrackedInspirationAccount[]
) {
  const seen = new Set(current.map((account) => account.id));
  return [
    ...current,
    ...incoming.filter((account) => !seen.has(account.id)),
  ];
}

export function inspirationPageError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function inspirationSourceStatusLabel(video: InspirationVideoCard) {
  if (video.sourceDecision.status === "rejected") return "Rejected";
  if (video.sourceUsage.status === "used") return "Used in Clone";
  return "Not used";
}

export function inspirationStatusTone(
  video: InspirationVideoCard
): "rejected" | "used" | "fresh" {
  if (video.sourceDecision.status === "rejected") return "rejected";
  if (video.sourceUsage.status === "used") return "used";
  return "fresh";
}

export function inspirationStatusBadge(
  video: InspirationVideoCard
): { tone: "ok" | "bad"; label: string } | undefined {
  const tone = inspirationStatusTone(video);
  if (tone === "fresh") return undefined;
  return {
    tone: tone === "used" ? "ok" : "bad",
    label: inspirationSourceStatusLabel(video),
  };
}

export function inspirationVideoTitle(video: InspirationVideoCard) {
  const caption = video.caption?.trim();
  return caption ? caption.split("\n")[0] : video.creatorHandle;
}

export function emptyLibraryTitle(
  search: string,
  filter: InspirationSourceFeedFilter
): string {
  if (search.trim()) return "No sources match your search";

  switch (filter) {
    case "used":
      return "No used sources in this view";
    case "rejected":
      return "No rejected sources in this view";
    case "all":
    case "unused":
      return "Everything here is used or rejected";
    default: {
      const _never: never = filter;
      return _never;
    }
  }
}

export function applySourceDecisionToCounts(
  current: InspirationSourceUsageCounts,
  video: InspirationVideoCard,
  nextDecision: InspirationSourceDecision
): InspirationSourceUsageCounts {
  const wasRejected = video.sourceDecision.status === "rejected";
  const isRejected = nextDecision.status === "rejected";
  if (wasRejected === isRejected) return current;

  const usedDelta = video.sourceUsage.status === "used" ? 1 : 0;
  const unusedDelta = video.sourceUsage.status === "unused" ? 1 : 0;
  if (isRejected) {
    return {
      ...current,
      rejected: current.rejected + 1,
      used: current.used - usedDelta,
      unused: current.unused - unusedDelta,
    };
  }
  return {
    ...current,
    rejected: Math.max(0, current.rejected - 1),
    used: current.used + usedDelta,
    unused: current.unused + unusedDelta,
  };
}

export function markAccountSyncing(
  accounts: TrackedInspirationAccount[],
  accountId: string,
  attemptAt: string
): TrackedInspirationAccount[] {
  return accounts.map((account) =>
    account.id === accountId
      ? {
          ...account,
          syncStatus: "syncing",
          lastSyncAttemptAt: attemptAt,
          lastSyncError: null,
        }
      : account
  );
}

export function markAccountSyncError(
  accounts: TrackedInspirationAccount[],
  accountId: string,
  attemptAt: string,
  message: string
): TrackedInspirationAccount[] {
  return accounts.map((account) =>
    account.id === accountId
      ? {
          ...account,
          syncStatus: "error",
          lastSyncAttemptAt: attemptAt,
          lastSyncError: message,
        }
      : account
  );
}

export function withId(ids: string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id];
}

export function withoutId(ids: string[], id: string) {
  return ids.filter((item) => item !== id);
}
