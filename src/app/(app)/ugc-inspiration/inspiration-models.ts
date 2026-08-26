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

export const SOURCE_FEED_FILTERS: Array<{
  value: InspirationSourceFeedFilter;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "All",
    description: "Everything tracked",
  },
  {
    value: "unused",
    label: "Not used",
    description: "Fresh source options",
  },
  {
    value: "used",
    label: "Used",
    description: "Already sent to Clone",
  },
  {
    value: "rejected",
    label: "Rejected",
    description: "Won't use",
  },
];

export function formatMetric(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

export function formatDuration(durationSec: number | null): string {
  if (!durationSec || durationSec <= 0) return "TikTok";
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.round(durationSec % 60);
  return minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, "0")}`
    : `${seconds}s`;
}

export function formatPublishedDate(value: string | null): string {
  if (!value) return "Unknown publish date";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getInspirationThumbnailSrc(videoId: string, updatedAt: string): string {
  return `/api/ugc-inspiration/videos/${videoId}/thumbnail?v=${encodeURIComponent(updatedAt)}`;
}

export function getInspirationAvatarSrc(accountId: string, updatedAt: string): string {
  return `/api/ugc-inspiration/accounts/${accountId}/avatar?v=${encodeURIComponent(updatedAt)}`;
}

export function getCreatorSyncMeta(
  account: TrackedInspirationAccount,
  isRefreshing: boolean
) {
  if (isRefreshing) {
    return {
      label: "Syncing now",
      className: "text-[var(--pf-lamp-amber)]",
    };
  }

  if (account.syncStatus === "error") {
    return {
      label: "Sync failed",
      className: "text-[var(--pf-danger)]",
    };
  }

  return {
    label: account.lastSyncedAt
      ? `Synced ${formatRelativeDate(account.lastSyncedAt)}`
      : "Not synced yet",
    className:
      account.syncStatus === "ready" && !account.isStale
        ? "text-[var(--pf-success)]"
        : "text-[var(--pf-muted)]",
  };
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
  return "Fresh source";
}

export function inspirationStatusTone(
  video: InspirationVideoCard
): "rejected" | "used" | "fresh" {
  if (video.sourceDecision.status === "rejected") return "rejected";
  if (video.sourceUsage.status === "used") return "used";
  return "fresh";
}

export function inspirationStatusDotClass(video: InspirationVideoCard) {
  const tone = inspirationStatusTone(video);
  switch (tone) {
    case "rejected":
      return "bg-[var(--pf-danger)]";
    case "used":
      return "bg-[var(--pf-success)]";
    case "fresh":
      return "bg-[var(--pf-lamp-amber)]";
    default: {
      const _never: never = tone;
      return _never;
    }
  }
}

export function inspirationStatusPillClass(video: InspirationVideoCard) {
  const tone = inspirationStatusTone(video);
  switch (tone) {
    case "rejected":
      return "pf-status-danger";
    case "used":
      return "pf-status-success";
    case "fresh":
      return "border-[var(--pf-border)] bg-[var(--pf-active)] text-[var(--pf-muted)]";
    default: {
      const _never: never = tone;
      return _never;
    }
  }
}

export function emptyLibraryCopy(
  search: string,
  filter: InspirationSourceFeedFilter
): { title: string; description: string } {
  if (search.trim()) {
    return {
      title: "No sources match your search",
      description:
        "Try another creator, caption phrase, or clear the search to see every source in this view.",
    };
  }

  switch (filter) {
    case "used":
      return {
        title: "No used sources in this view",
        description:
          "This creator view does not have any videos that have already been sent to Clone.",
      };
    case "rejected":
      return {
        title: "No rejected sources in this view",
        description:
          "Reject a source when you know it will never become clone material.",
      };
    case "all":
    case "unused":
      return {
        title: "Everything here is used or rejected",
        description:
          "Switch to Used or Rejected to review prior decisions, or refresh creators to bring in new options.",
      };
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
