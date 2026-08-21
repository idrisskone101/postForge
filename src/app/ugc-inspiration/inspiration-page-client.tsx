"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import {
  INSPIRATION_VIDEO_PAGE_SIZE,
  inspirationVideoFeedPath,
  parseInspirationSourceSort,
  type InspirationSourceFeedFilter,
  type InspirationSourceSort,
  type InspirationVideoCard,
  type InspirationVideoPage,
  type SetInspirationRejectionResult,
  type TrackedInspirationAccount,
  type UseInspirationResult,
} from "@/lib/inspiration/types";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceState } from "@/components/workspace-state";
import { WorkspaceHeaderAccessory } from "@/components/workspace-shell";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Compass,
  Copy,
  Eye,
  ExternalLink,
  Heart,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Play,
  RefreshCw,
  Repeat2,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  Undo2,
  Users,
} from "lucide-react";

const SOURCE_FEED_FILTERS: Array<{
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

interface InspirationPageClientProps {
  initialAccounts: TrackedInspirationAccount[];
  initialVideoPage: InspirationVideoPage;
}

interface InspirationHeaderControlsProps {
  handleInput: string;
  isAddingAccount: boolean;
  onHandleInputChange: (value: string) => void;
  onTrackAccount: () => void;
}

export function InspirationHeaderControls({
  handleInput,
  isAddingAccount,
  onHandleInputChange,
  onTrackAccount,
}: InspirationHeaderControlsProps) {
  return (
    <div className="w-full min-w-0 lg:w-[31rem]">
      <p className="sr-only">
        Source Selection. Compare creator posts and send the strongest source straight into Clone.
      </p>
      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_2.5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          value={handleInput}
          onChange={(event) => onHandleInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onTrackAccount();
            }
          }}
          placeholder="@creator or TikTok profile URL"
          disabled={isAddingAccount}
          className="h-10 min-w-0 rounded-lg border-border bg-card px-3 text-xs shadow-none"
        />
        <Button
          type="button"
          onClick={onTrackAccount}
          disabled={isAddingAccount || !handleInput.trim()}
          className="h-10 min-w-0 shrink-0 rounded-lg bg-[var(--pf-orange)] px-0 text-xs font-semibold text-white hover:brightness-[0.93] sm:px-4"
        >
          {isAddingAccount ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span className="hidden sm:inline">Tracking...</span>
              <span className="sr-only sm:hidden">Tracking creator</span>
            </>
          ) : (
            <>
              <Users className="size-4" />
              <span className="hidden sm:inline">Track Creator</span>
              <span className="sr-only sm:hidden">Track Creator</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function formatMetric(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function formatDuration(durationSec: number | null): string {
  if (!durationSec || durationSec <= 0) return "TikTok";
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.round(durationSec % 60);
  return minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, "0")}`
    : `${seconds}s`;
}

function formatPublishedDate(value: string | null): string {
  if (!value) return "Unknown publish date";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInspirationThumbnailSrc(videoId: string, updatedAt: string): string {
  return `/api/ugc-inspiration/videos/${videoId}/thumbnail?v=${encodeURIComponent(updatedAt)}`;
}

function getInspirationAvatarSrc(accountId: string, updatedAt: string): string {
  return `/api/ugc-inspiration/accounts/${accountId}/avatar?v=${encodeURIComponent(updatedAt)}`;
}

function getCreatorSyncMeta(
  account: TrackedInspirationAccount,
  isRefreshing: boolean
) {
  if (isRefreshing) {
    return {
      label: "Syncing now",
      className: "text-blue-600",
    };
  }

  if (account.syncStatus === "error") {
    return {
      label: "Sync failed",
      className: "text-destructive",
    };
  }

  return {
    label: account.lastSyncedAt
      ? `Synced ${formatRelativeDate(account.lastSyncedAt)}`
      : "Not synced yet",
    className:
      account.syncStatus === "ready" && !account.isStale
        ? "text-[var(--pf-success)]"
        : "text-muted-foreground",
  };
}

function sortAccounts(accounts: TrackedInspirationAccount[]) {
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

function mergeAccountIntoState(
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

function CreatorSyncAvatar({
  account,
}: {
  account: TrackedInspirationAccount;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarSrc =
    account.avatarUrl && !avatarFailed
      ? getInspirationAvatarSrc(account.id, account.updatedAt)
      : null;
  const fallback = account.handleDisplay.slice(1, 3).toUpperCase();

  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[11px] font-medium text-muted-foreground">
      {avatarSrc ? (
        <Image
          src={avatarSrc}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="size-full object-cover"
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        fallback
      )}
    </span>
  );
}

export function InspirationPageClient({
  initialAccounts,
  initialVideoPage,
}: InspirationPageClientProps) {
  const [accounts, setAccounts] = useState(() => sortAccounts(initialAccounts));
  const [activeFilter, setActiveFilter] = useState<"all" | string>("all");
  const [sourceFeedFilter, setSourceFeedFilter] =
    useState<InspirationSourceFeedFilter>("all");
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceSort, setSourceSort] = useState<InspirationSourceSort>("recent");
  const [compactGrid, setCompactGrid] = useState(false);
  const [videoItems, setVideoItems] = useState(initialVideoPage.items);
  const [videoCursor, setVideoCursor] = useState(initialVideoPage.nextCursor);
  const [videoHasMore, setVideoHasMore] = useState(initialVideoPage.hasMore);
  const [videoTotal, setVideoTotal] = useState(initialVideoPage.total);
  const [sourceUsageCounts, setSourceUsageCounts] = useState(
    initialVideoPage.usageCounts
  );
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [handleInput, setHandleInput] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [usingVideoId, setUsingVideoId] = useState<string | null>(null);
  const [updatingRejectionIds, setUpdatingRejectionIds] = useState<string[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);
  const [embedState, setEmbedState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [thumbnailErrorIds, setThumbnailErrorIds] = useState<string[]>([]);
  const didMountVideos = useRef(false);

  const selectedAccount = useMemo(
    () =>
      activeFilter === "all"
        ? null
        : accounts.find((account) => account.id === activeFilter) ?? null,
    [accounts, activeFilter]
  );

  const applyVideoPage = useCallback(
    (page: InspirationVideoPage, mode: "replace" | "append") => {
      setVideoItems((current) =>
        mode === "append" ? [...current, ...page.items] : page.items
      );
      setVideoCursor(page.nextCursor);
      setVideoHasMore(page.hasMore);
      setVideoTotal(page.total);
      setSourceUsageCounts(page.usageCounts);
    },
    []
  );

  const loadVideoPage = useCallback(
    async (cursor?: string | null) => {
      return apiGet<InspirationVideoPage>(
        inspirationVideoFeedPath({
          accountId: activeFilter === "all" ? null : activeFilter,
          cursor,
          take: INSPIRATION_VIDEO_PAGE_SIZE,
          usage: sourceFeedFilter,
          search: sourceSearch,
          sort: sourceSort,
        })
      );
    },
    [activeFilter, sourceFeedFilter, sourceSearch, sourceSort]
  );

  const replaceVideoPage = useCallback(async () => {
    setIsLoadingVideos(true);
    setVideoItems([]);
    setVideoCursor(null);
    setVideoHasMore(false);
    setPageError(null);
    try {
      const page = await loadVideoPage();
      applyVideoPage(page, "replace");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to load sources."
      );
      setVideoTotal(0);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [applyVideoPage, loadVideoPage]);

  useEffect(() => {
    if (!didMountVideos.current) {
      didMountVideos.current = true;
      return;
    }

    const delay = sourceSearch.trim() ? 250 : 0;
    const timer = window.setTimeout(() => {
      void replaceVideoPage();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [replaceVideoPage, sourceSearch]);

  async function handleLoadMore() {
    if (!videoHasMore || !videoCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setPageError(null);
    try {
      const page = await loadVideoPage(videoCursor);
      applyVideoPage(page, "append");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to load more sources."
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  const selectedVideo = useMemo(
    () =>
      selectedVideoId
        ? videoItems.find((video) => video.id === selectedVideoId) ?? null
        : null,
    [videoItems, selectedVideoId]
  );

  const trackedVideoCount = accounts.reduce(
    (sum, account) => sum + account.videoCount,
    0
  );
  const remainingVideoCount = Math.max(0, videoTotal - videoItems.length);
  const activeSourceLabel = selectedAccount
    ? selectedAccount.handleDisplay
    : "Creator Feed";
  const activeFeedFilterLabel =
    SOURCE_FEED_FILTERS.find((filter) => filter.value === sourceFeedFilter)
      ?.label ?? "All";

  useEffect(() => {
    if (!selectedVideoId) {
      setEmbedState("idle");
      return;
    }

    setEmbedState("loading");
    const timer = window.setTimeout(() => {
      setEmbedState((current) => (current === "ready" ? current : "failed"));
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [selectedVideoId]);

  useEffect(() => {
    if (!selectedVideoId) return;
    if (selectedVideo) return;
    setSelectedVideoId(null);
  }, [selectedVideoId, selectedVideo]);

  useEffect(() => {
    if (!copiedVideoId) return;

    const timer = window.setTimeout(() => {
      setCopiedVideoId((current) =>
        current === copiedVideoId ? null : current
      );
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [copiedVideoId]);

  async function handleTrackAccount() {
    if (!handleInput.trim()) return;

    setIsAddingAccount(true);
    setPageError(null);

    try {
      const account = await apiPost<TrackedInspirationAccount>(
        "/api/ugc-inspiration/accounts",
        { handle: handleInput.trim() }
      );
      setAccounts((prev) => mergeAccountIntoState(prev, account));
      setHandleInput("");
      await replaceVideoPage();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to track creator."
      );
    } finally {
      setIsAddingAccount(false);
    }
  }

  async function handleRefreshAccount(accountId: string) {
    const attemptAt = new Date().toISOString();
    setRefreshingIds((prev) =>
      prev.includes(accountId) ? prev : [...prev, accountId]
    );
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === accountId
          ? {
              ...account,
              syncStatus: "syncing",
              lastSyncAttemptAt: attemptAt,
              lastSyncError: null,
            }
          : account
      )
    );

    try {
      const refreshed = await apiPost<TrackedInspirationAccount>(
        `/api/ugc-inspiration/accounts/${accountId}/refresh`,
        {}
      );
      setAccounts((prev) => mergeAccountIntoState(prev, refreshed));
      await replaceVideoPage();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to refresh creator.";
      setPageError(message);
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === accountId
            ? {
                ...account,
                syncStatus: "error",
                lastSyncAttemptAt: attemptAt,
                lastSyncError: message,
              }
            : account
        )
      );
    } finally {
      setRefreshingIds((prev) => prev.filter((id) => id !== accountId));
    }
  }

  async function handleDeleteAccount(account: TrackedInspirationAccount) {
    if (!window.confirm(`Remove ${account.handleDisplay} from Inspiration?`)) {
      return;
    }

    setDeletingIds((prev) =>
      prev.includes(account.id) ? prev : [...prev, account.id]
    );
    setPageError(null);

    try {
      await apiDelete(`/api/ugc-inspiration/accounts/${account.id}`);
      setAccounts((prev) => prev.filter((item) => item.id !== account.id));
      if (selectedVideo?.accountId === account.id) {
        setSelectedVideoId(null);
      }
      if (activeFilter === account.id) {
        setActiveFilter("all");
      } else {
        await replaceVideoPage();
      }
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to remove creator."
      );
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== account.id));
    }
  }

  async function handleUseInClone(video: InspirationVideoCard) {
    setUsingVideoId(video.id);
    setPageError(null);

    try {
      const result = await apiPost<UseInspirationResult>(
        `/api/ugc-inspiration/videos/${video.id}/use`,
        {}
      );
      window.location.assign(result.redirectTo);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to send video to Clone."
      );
    } finally {
      setUsingVideoId(null);
    }
  }

  async function handleSetVideoRejection(
    video: InspirationVideoCard,
    rejected: boolean
  ) {
    setUpdatingRejectionIds((prev) =>
      prev.includes(video.id) ? prev : [...prev, video.id]
    );
    setPageError(null);

    try {
      const result = await apiPost<SetInspirationRejectionResult>(
        `/api/ugc-inspiration/videos/${video.id}/rejection`,
        { rejected }
      );
      const nextVideo: InspirationVideoCard = {
        ...video,
        sourceDecision: result.sourceDecision,
      };
      const staysInView =
        filterVideosBySourceUsage([nextVideo], sourceFeedFilter).length > 0;

      setVideoItems((current) => {
        if (!staysInView) {
          return current.filter((item) => item.id !== result.videoId);
        }
        return current.map((item) =>
          item.id === result.videoId ? nextVideo : item
        );
      });
      if (!staysInView) {
        setVideoTotal((current) => Math.max(0, current - 1));
      }

      setSourceUsageCounts((current) => {
        const wasRejected = video.sourceDecision.status === "rejected";
        const isRejected = nextVideo.sourceDecision.status === "rejected";
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
      });
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to update source decision."
      );
    } finally {
      setUpdatingRejectionIds((prev) =>
        prev.filter((id) => id !== video.id)
      );
    }
  }

  async function handleCopySourceUrl(video: InspirationVideoCard) {
    setPageError(null);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(video.originalUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = video.originalUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopiedVideoId(video.id);
    } catch (error) {
      console.error("Failed to copy TikTok URL:", error);
      setPageError("Failed to copy TikTok URL.");
    }
  }

  function markThumbnailError(videoId: string) {
    setThumbnailErrorIds((prev) =>
      prev.includes(videoId) ? prev : [...prev, videoId]
    );
  }

  function clearThumbnailError(videoId: string) {
    setThumbnailErrorIds((prev) => prev.filter((id) => id !== videoId));
  }

  return (
    <>
      <WorkspaceHeaderAccessory>
        <InspirationHeaderControls
          handleInput={handleInput}
          isAddingAccount={isAddingAccount}
          onHandleInputChange={setHandleInput}
          onTrackAccount={() => void handleTrackAccount()}
        />
      </WorkspaceHeaderAccessory>

      <div className="min-w-0">
        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 overflow-x-clip">
          <div className="mx-auto flex w-full min-w-0 max-w-[1280px] flex-col gap-5 overflow-x-clip">
            {pageError && (
              <div role="alert" className="flex min-w-0 items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{pageError}</span>
                <button type="button" onClick={() => setPageError(null)} className="shrink-0 text-xs font-semibold hover:underline">
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-card px-4 py-3 shadow-[var(--pf-shadow-2xs)]">
              <button
                type="button"
                onClick={() => {
                  setActiveFilter("all");
                  document.getElementById("tracked-creators-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                title="Show all tracked creators"
                className="rounded-md text-left transition-colors hover:text-[var(--pf-orange)]"
              >
                <strong className="text-[15px] font-semibold tabular-nums">{accounts.length}</strong>
                <span className="ml-2 text-xs text-muted-foreground underline-offset-2">tracked creators</span>
              </button>
              <span className="hidden h-6 w-px bg-border sm:block" />
              <button
                type="button"
                onClick={() => {
                  setSourceFeedFilter("all");
                  document.getElementById("source-library-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                title="Show every saved source"
                className="rounded-md text-left transition-colors hover:text-[var(--pf-orange)]"
              >
                <strong className="text-[15px] font-semibold tabular-nums">{trackedVideoCount}</strong>
                <span className="ml-2 text-xs text-muted-foreground">saved sources</span>
              </button>
              <span className="hidden h-6 w-px bg-border sm:block" />
              <button
                type="button"
                onClick={() => {
                  setSourceFeedFilter("unused");
                  document.getElementById("source-library-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                title="Filter the library to fresh sources"
                className="rounded-md text-left transition-colors hover:text-[var(--pf-orange)]"
              >
                <strong className="text-[15px] font-semibold tabular-nums">{sourceUsageCounts.unused}</strong>
                <span className="ml-2 text-xs text-muted-foreground">ready to use</span>
              </button>
              <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                  <Sparkles className="size-3.5 shrink-0 text-[var(--pf-orange)]" /> <span className="min-w-0 break-words [overflow-wrap:anywhere]">Fresh posts stay at the front</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    accounts.forEach((account) => {
                      if (!refreshingIds.includes(account.id)) {
                        void handleRefreshAccount(account.id);
                      }
                    })
                  }
                  disabled={accounts.length === 0 || refreshingIds.length > 0}
                  className="h-10 shrink-0 rounded-lg px-3 text-xs"
                >
                  <RefreshCw className={cn("size-4 shrink-0", refreshingIds.length > 0 && "animate-spin")} />
                  Refresh all
                </Button>
              </div>
            </div>

            <section
              aria-labelledby="tracked-creators-heading"
              className="min-w-0 max-w-full overflow-hidden [contain:inline-size_layout_paint]"
            >
              <div className="mb-3">
                <h3 id="tracked-creators-heading" className="text-sm font-semibold">Tracked creators</h3>
                <p className="mt-1 text-xs text-muted-foreground">Choose a creator to narrow the source library.</p>
              </div>

              <div
                data-creator-list="true"
                data-creator-scroll-viewport="true"
                className="flex w-full min-w-0 max-w-full snap-x gap-2 overflow-x-auto overscroll-x-contain pb-2 [contain:inline-size]"
              >
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  title="All tracked creator videos"
                  className={cn(
                    "flex w-auto shrink-0 snap-start items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                    activeFilter === "all"
                      ? "border-foreground/20 bg-foreground text-background shadow-[var(--pf-shadow-2xs)]"
                      : "border-border bg-card shadow-[var(--pf-shadow-2xs)] hover:bg-muted/60"
                  )}
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", activeFilter === "all" ? "bg-background/15" : "bg-muted text-muted-foreground")}>
                    <Compass className="size-4" />
                  </span>
                  <span className="whitespace-nowrap text-[13px] font-semibold">Creator Feed</span>
                  <span className={cn("text-[11px] font-semibold tabular-nums", activeFilter === "all" ? "text-background/70" : "text-muted-foreground")}>{trackedVideoCount}</span>
                </button>

                {accounts.map((account) => {
                  const isActive = activeFilter === account.id;
                  const isRefreshing = refreshingIds.includes(account.id);
                  const isDeleting = deletingIds.includes(account.id);
                  const syncMeta = getCreatorSyncMeta(account, isRefreshing);

                  return (
                    <div
                      key={account.id}
                      className={cn(
                        "group flex w-[13.5rem] max-w-[calc(100vw-3rem)] shrink-0 snap-start items-center rounded-lg border pr-1.5 transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                        isActive
                          ? "border-foreground/20 bg-card shadow-[var(--pf-shadow-sm)]"
                          : "border-border bg-card shadow-[var(--pf-shadow-2xs)] hover:bg-muted/40 hover:shadow-[var(--pf-shadow-2xs)]"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveFilter(account.id)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left"
                        title={`${account.handleDisplay} · ${syncMeta.label}`}
                      >
                        <CreatorSyncAvatar account={account} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">{account.handleDisplay}</span>
                          <span className={cn("mt-0.5 block truncate text-[11px]", syncMeta.className)}>{syncMeta.label}</span>
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground">{account.videoCount}</span>
                      </button>
                      <span className="flex shrink-0 flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => void handleRefreshAccount(account.id)}
                          disabled={isRefreshing || isDeleting}
                          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                          aria-label={`Refresh ${account.handleDisplay}`}
                        >
                          {isRefreshing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                          <span className="sr-only">Refresh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteAccount(account)}
                          disabled={isDeleting}
                          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          aria-label={`Remove ${account.handleDisplay}`}
                        >
                          {isDeleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                          <span className="sr-only">Remove</span>
                        </button>
                      </span>
                      {account.lastSyncError && <span className="sr-only">{account.lastSyncError}</span>}
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-5">
              <div className="min-w-0">
                <h3 id="source-library-heading" className="text-[15px] font-semibold tracking-[-0.01em]">Source library</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeSourceLabel} · {videoItems.length} of {videoTotal} {activeFeedFilterLabel.toLowerCase()}
                </p>
              </div>

              <div
                data-source-feed-tabs="true"
                role="tablist"
                aria-label="Source usage filter"
                className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 shadow-[var(--pf-shadow-2xs)] sm:w-auto"
              >
                {SOURCE_FEED_FILTERS.map((filter) => {
                  const isActive = sourceFeedFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      role="tab"
                      data-source-feed-filter={filter.value}
                      aria-selected={isActive}
                      onClick={() => setSourceFeedFilter(filter.value)}
                      className={cn(
                        "flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-left transition-colors",
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="text-xs font-semibold">{filter.label}</span>
                      <span className="sr-only">{filter.description}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                          isActive
                            ? "bg-background/15 text-background"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {sourceUsageCounts[filter.value]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 shadow-[var(--pf-shadow-2xs)] sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={sourceSearch}
                  onChange={(event) => setSourceSearch(event.target.value)}
                  placeholder="Search captions or creators"
                  aria-label="Search source library"
                  className="h-9 rounded-md border-0 bg-muted/55 pl-9 text-xs shadow-none focus-visible:ring-1"
                />
              </label>
              <label className="relative flex h-9 min-w-40 items-center rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground">
                <span className="sr-only">Sort source library</span>
                <select
                  value={sourceSort}
                  onChange={(event) =>
                    setSourceSort(parseInspirationSourceSort(event.target.value))
                  }
                  aria-label="Sort source library"
                  className="size-full appearance-none bg-transparent pr-6 text-xs font-medium text-foreground outline-none"
                >
                  <option value="recent">Newest first</option>
                  <option value="views">Most viewed</option>
                  <option value="engagement">Most engagement</option>
                </select>
                <ArrowRight className="pointer-events-none absolute right-2.5 size-3.5 rotate-90" />
              </label>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label={compactGrid ? "Use comfortable source grid" : "Use compact source grid"}
                aria-pressed={compactGrid}
                onClick={() => setCompactGrid((current) => !current)}
                className={cn("size-9 rounded-md", compactGrid && "bg-foreground text-background hover:bg-foreground/90 hover:text-background")}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>

            {accounts.length === 0 ? (
              <WorkspaceState
                tone="empty"
                icon={Compass}
                title="Start your discovery board"
                description="Add a few creators you already trust. PostForge will keep a cached feed of their recent TikToks here, ready for preview and one-click cloning."
                action={{
                  label: "Track Creator",
                  onClick: () => {
                    document
                      .querySelector<HTMLInputElement>(
                        'input[placeholder="@creator or TikTok profile URL"]'
                      )
                      ?.focus();
                  },
                }}
                secondaryAction={{ href: "/ugc-clone", label: "Start Clone" }}
                className="min-h-[360px]"
              />
            ) : isLoadingVideos && videoItems.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 px-6 py-14 text-center">
                <Loader2 className="mb-4 size-6 animate-spin text-muted-foreground" />
                <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
                  Loading sources
                </h2>
              </div>
            ) : sourceUsageCounts.all === 0 && videoTotal === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 px-6 py-14 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-[var(--pf-success)]/10 text-[var(--pf-success)]">
                  <CheckCircle2 className="size-6" />
                </div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
                  No cached videos yet
                </h2>
                <p className="mt-2 min-w-0 max-w-md break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {selectedAccount
                    ? `${selectedAccount.handleDisplay} is tracked, but there are no recent videos cached yet. Refresh the creator or open the profile on TikTok.`
                    : "Tracked creators are present, but no videos are cached yet."}
                </p>
                {selectedAccount?.profileUrl && (
                  <a
                    href={selectedAccount.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-5 rounded-lg")}
                  >
                    Open Profile
                    <ExternalLink className="size-4 shrink-0" />
                  </a>
                )}
              </div>
            ) : videoItems.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 px-6 py-14 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <CheckCircle2 className="size-6" />
                </div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
                  {sourceSearch.trim()
                    ? "No sources match your search"
                    : sourceFeedFilter === "used"
                    ? "No used sources in this view"
                    : sourceFeedFilter === "rejected"
                      ? "No rejected sources in this view"
                      : "Everything here is used or rejected"}
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {sourceSearch.trim()
                    ? "Try another creator, caption phrase, or clear the search to see every source in this view."
                    : sourceFeedFilter === "used"
                    ? "This creator view does not have any videos that have already been sent to Clone."
                    : sourceFeedFilter === "rejected"
                      ? "Reject a source when you know it will never become clone material."
                      : "Switch to Used or Rejected to review prior decisions, or refresh creators to bring in new options."}
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  "grid max-h-[440px] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2",
                  compactGrid
                    ? "lg:grid-cols-4 2xl:grid-cols-5"
                    : "lg:grid-cols-3 2xl:grid-cols-4",
                )}
              >
                {videoItems.map((video) => {
                  const thumbnailFailed = thumbnailErrorIds.includes(video.id);
                  const isRejected = video.sourceDecision.status === "rejected";
                  const isUpdatingRejection = updatingRejectionIds.includes(video.id);

                  return (
                    <article
                      key={video.id}
                      data-inspiration-video-id={video.id}
                      data-source-decision={video.sourceDecision.status}
                      className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--pf-shadow-2xs)] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-foreground/20 hover:shadow-[var(--pf-shadow-md)]"
                    >
                      <button
                        type="button"
                        aria-label={`Preview source from ${video.creatorHandle}`}
                        onClick={() => setSelectedVideoId(video.id)}
                        className="relative block w-full overflow-hidden bg-black text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        <div
                          data-source-preview-frame="portrait"
                          className="aspect-[9/16] bg-zinc-950"
                        >
                          {!thumbnailFailed ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getInspirationThumbnailSrc(video.id, video.updatedAt)}
                                alt={video.caption || `${video.creatorHandle} TikTok`}
                                className="size-full object-contain"
                                loading="lazy"
                                onError={() => markThumbnailError(video.id)}
                                onLoad={() => clearThumbnailError(video.id)}
                              />
                            </>
                          ) : (
                            <div className="flex size-full items-center justify-center text-muted-foreground">
                              <Play className="size-8" />
                            </div>
                          )}
                        </div>

                        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                          <span className="flex max-w-[70%] flex-wrap gap-1.5">
                            <span
                              className={cn(
                                "rounded-full border px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm",
                                isRejected
                                  ? "border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/90"
                                  : video.sourceUsage.status === "used"
                                    ? "border-[var(--pf-success)]/40 bg-[var(--pf-success)]/85"
                                    : "border-white/15 bg-black/65"
                              )}
                            >
                              {isRejected
                                ? "Rejected"
                                : video.sourceUsage.status === "used"
                                  ? "Used in Clone"
                                  : "Fresh source"}
                            </span>
                          </span>
                          <span className="rounded-full bg-black/65 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                            {formatRelativeDate(video.publishedAt ?? video.createdAt)}
                          </span>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent px-3 pb-3 pt-14 text-white">
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-white/85">
                            <div className="flex items-center gap-1.5">
                              <Play className="size-3" />
                              <span>{formatDuration(video.durationSec)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Heart className="size-3" />
                              <span>{formatMetric(video.likeCount)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MessageCircle className="size-3" />
                              <span>{formatMetric(video.commentCount)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Repeat2 className="size-3" />
                              <span>{formatMetric(video.shareCount)}</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      <div className="flex flex-1 flex-col gap-3 p-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar size="sm">
                            <AvatarImage src={video.creatorAvatarUrl ?? undefined} alt={video.creatorHandle} />
                            <AvatarFallback>{video.creatorHandle.slice(1, 3).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold">{video.creatorHandle}</span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">{formatRelativeDate(video.publishedAt ?? video.createdAt)}</span>
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground">{formatMetric(video.viewCount)} views</span>
                        </div>
                        <p className="line-clamp-2 min-h-10 text-xs leading-5 text-foreground/80">
                          {video.caption || "No caption provided."}
                        </p>
                        {video.sourceUsage.status === "used" && video.sourceUsage.usedAt && (
                          <p className="rounded-md border border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 px-2.5 py-1.5 text-[11px] font-medium text-[var(--pf-success)]">
                            Used as a source {formatRelativeDate(video.sourceUsage.usedAt)}
                          </p>
                        )}

                        {isRejected && video.sourceDecision.rejectedAt && (
                          <p className="rounded-md border border-[var(--pf-danger)]/30 bg-[var(--pf-danger)]/10 px-2.5 py-1.5 text-[11px] font-medium text-[var(--pf-danger)]">
                            Rejected as a source {formatRelativeDate(video.sourceDecision.rejectedAt)}
                          </p>
                        )}

                        {isRejected ? (
                          <Button
                            type="button"
                            variant="outline"
                            data-source-action="restore"
                            onClick={() => void handleSetVideoRejection(video, false)}
                            disabled={isUpdatingRejection}
                            className="mt-auto h-9 w-full rounded-md border-border bg-background text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isUpdatingRejection ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Restoring...
                              </>
                            ) : (
                              <>
                                Restore Source
                                <Undo2 className="size-4" />
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => void handleUseInClone(video)}
                            disabled={usingVideoId === video.id}
                            className="mt-auto h-9 w-full rounded-md bg-[var(--pf-orange)] text-xs font-semibold text-white hover:brightness-[0.93]"
                          >
                            {usingVideoId === video.id ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                Use in Clone
                                <Sparkles className="size-4" />
                              </>
                            )}
                          </Button>
                        )}

                        <div
                          className={cn(
                            "grid gap-1.5",
                            isRejected
                              ? "grid-cols-[minmax(0,1fr)_2rem_2rem]"
                              : "grid-cols-[minmax(0,1fr)_2rem_2rem_2rem_2rem]"
                          )}
                        >
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedVideoId(video.id)}
                            className="h-8 min-w-0 rounded-md px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="size-3.5" />
                            Preview
                          </Button>

                          {!isRejected && (
                            <Button
                              type="button"
                              variant="outline"
                              data-source-action="reject"
                              onClick={() => void handleSetVideoRejection(video, true)}
                              disabled={isUpdatingRejection}
                              aria-label={`Reject source from ${video.creatorHandle}`}
                              size="icon-sm"
                              className="size-8 rounded-md border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdatingRejection ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Ban className="size-3.5" />
                              )}
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="icon-lg"
                            onClick={() => void handleCopySourceUrl(video)}
                            aria-label={
                              copiedVideoId === video.id
                                ? `Copied source URL for ${video.creatorHandle}`
                                : `Copy source URL for ${video.creatorHandle}`
                            }
                            className="size-8 rounded-md text-muted-foreground hover:text-foreground"
                          >
                            {copiedVideoId === video.id ? (
                              <CheckCircle2 className="size-4" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>

                          <a
                            href={video.originalUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open original source from ${video.creatorHandle}`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "icon-lg" }),
                              "size-8 rounded-md text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {videoHasMore && (
              <div className="flex flex-col items-center gap-2 border-t border-border pt-5 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Showing {videoItems.length} of {videoTotal} matching sources
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleLoadMore()}
                  disabled={isLoadingMore || !videoCursor}
                  data-inspiration-load-more="true"
                  className="h-10 rounded-lg px-5 text-xs font-semibold"
                >
                  {isLoadingMore ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    `Load ${Math.min(INSPIRATION_VIDEO_PAGE_SIZE, remainingVideoCount)} more`
                  )}
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={!!selectedVideoId} onOpenChange={(open) => !open && setSelectedVideoId(null)}>
        <DialogContent
          showCloseButton
          data-source-preview-drawer="true"
          className="!w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto rounded-[12px] p-0 sm:!max-w-6xl lg:overflow-hidden [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:z-20"
        >
          <DialogTitle className="sr-only">Source preview</DialogTitle>
          {selectedVideo && (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="relative flex min-h-[300px] items-center justify-center bg-[#09090B] lg:min-h-[560px]">
                {embedState !== "failed" && (
                  <iframe
                    key={selectedVideo.id}
                    src={selectedVideo.embedUrl ?? `https://www.tiktok.com/embed/v3/${selectedVideo.externalVideoId}`}
                    title={`TikTok preview for ${selectedVideo.creatorHandle}`}
                    className={cn(
                      "size-full min-h-[300px] lg:min-h-[560px]",
                      embedState === "loading" && "opacity-0"
                    )}
                    allow="encrypted-media; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setEmbedState("ready")}
                    onError={() => setEmbedState("failed")}
                  />
                )}

                {embedState === "loading" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                    <Loader2 className="size-6 animate-spin" />
                    <p className="text-[13px] font-medium">Loading TikTok preview...</p>
                  </div>
                )}

                {embedState === "failed" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
                    {!thumbnailErrorIds.includes(selectedVideo.id) ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getInspirationThumbnailSrc(
                            selectedVideo.id,
                            selectedVideo.updatedAt
                          )}
                          alt={selectedVideo.caption || `${selectedVideo.creatorHandle} TikTok`}
                          className="max-h-[42dvh] max-w-full object-contain lg:max-h-[calc(100dvh-8rem)]"
                          onError={() => markThumbnailError(selectedVideo.id)}
                          onLoad={() => clearThumbnailError(selectedVideo.id)}
                        />
                      </>
                    ) : (
                      <div className="flex size-16 items-center justify-center rounded-lg bg-white/10">
                        <Play className="size-8" />
                      </div>
                    )}
                    <div>
                      <p className="text-[15px] font-semibold">
                        TikTok preview unavailable
                      </p>
                      <p className="mt-1.5 max-w-md text-[13px] text-white/60">
                        The embed could not load for this post. You can still
                        open it on TikTok or send it directly into Clone.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-border bg-card p-5 lg:max-h-[calc(100dvh-2rem)] lg:border-l lg:border-t-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                      selectedVideo.sourceDecision.status === "rejected"
                        ? "border-[var(--pf-danger)]/30 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                        : selectedVideo.sourceUsage.status === "used"
                          ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                          : "border-[var(--pf-border)] bg-[var(--pf-active)] text-muted-foreground"
                    )}
                  >
                    {selectedVideo.sourceDecision.status === "rejected"
                      ? "Rejected"
                      : selectedVideo.sourceUsage.status === "used"
                        ? "Used in Clone"
                        : "Fresh source"}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {formatDuration(selectedVideo.durationSec)} · {formatRelativeDate(selectedVideo.publishedAt ?? selectedVideo.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarImage
                      src={selectedVideo.creatorAvatarUrl ?? undefined}
                      alt={selectedVideo.creatorHandle}
                    />
                    <AvatarFallback>
                      {selectedVideo.creatorHandle.slice(1, 3).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                      {selectedVideo.creatorDisplayName || selectedVideo.creatorHandle}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {selectedVideo.creatorHandle}
                    </p>
                  </div>
                </div>

                {selectedVideo.caption && (
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Caption
                    </p>
                    <p className="mt-1.5 min-w-0 break-words text-[13px] leading-5 text-foreground/80 [overflow-wrap:anywhere] line-clamp-5">
                      {selectedVideo.caption}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["Views", selectedVideo.viewCount],
                    ["Likes", selectedVideo.likeCount],
                    ["Comments", selectedVideo.commentCount],
                    ["Shares", selectedVideo.shareCount],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-[var(--pf-shadow-2xs)]">
                      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
                      <p className="text-[13px] font-semibold tabular-nums">
                        {formatMetric(value)}
                      </p>
                    </div>
                  ))}
                </div>

                <dl className="divide-y divide-border border-y border-border">
                  <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                    <dt className="text-muted-foreground">Published</dt>
                    <dd>{formatPublishedDate(selectedVideo.publishedAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                    <dt className="text-muted-foreground">Source use</dt>
                    <dd>
                      {selectedVideo.sourceUsage.status === "used" &&
                      selectedVideo.sourceUsage.usedAt
                        ? `Used ${formatRelativeDate(selectedVideo.sourceUsage.usedAt)}`
                        : "Not used yet"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                    <dt className="text-muted-foreground">Decision</dt>
                    <dd>
                      {selectedVideo.sourceDecision.status === "rejected" &&
                      selectedVideo.sourceDecision.rejectedAt
                        ? `Rejected ${formatRelativeDate(selectedVideo.sourceDecision.rejectedAt)}`
                        : "Approved"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
                  {selectedVideo.sourceDecision.status === "rejected" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleSetVideoRejection(selectedVideo, false)}
                      disabled={updatingRejectionIds.includes(selectedVideo.id)}
                      className="h-10 rounded-lg border-border text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingRejectionIds.includes(selectedVideo.id) ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Restoring source...
                        </>
                      ) : (
                        <>
                          Restore Source
                          <Undo2 className="size-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => void handleUseInClone(selectedVideo)}
                      disabled={usingVideoId === selectedVideo.id}
                      className="pf-button-primary h-10"
                    >
                      {usingVideoId === selectedVideo.id ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Sending to Clone...
                        </>
                      ) : (
                        <>
                          Use in Clone
                          <Sparkles className="size-4" />
                        </>
                      )}
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleCopySourceUrl(selectedVideo)}
                      className="h-10 rounded-lg text-[13px] font-semibold"
                    >
                      {copiedVideoId === selectedVideo.id ? (
                        <>
                          Copied
                          <CheckCircle2 className="size-4" />
                        </>
                      ) : (
                        <>
                          Copy URL
                          <Copy className="size-4" />
                        </>
                      )}
                    </Button>
                    <a
                      href={selectedVideo.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-10 rounded-lg text-[13px] font-semibold"
                      )}
                    >
                      Open
                      <ExternalLink className="size-4" />
                    </a>
                  </div>

                  {selectedVideo.sourceDecision.status !== "rejected" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleSetVideoRejection(selectedVideo, true)}
                      disabled={updatingRejectionIds.includes(selectedVideo.id)}
                      className="h-9 rounded-lg border-transparent text-[12px] font-medium text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingRejectionIds.includes(selectedVideo.id) ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Rejecting source...
                        </>
                      ) : (
                        <>
                          Reject Source
                          <Ban className="size-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </aside>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
