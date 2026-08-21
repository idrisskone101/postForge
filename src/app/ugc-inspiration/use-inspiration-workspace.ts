"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INSPIRATION_VIDEO_PAGE_SIZE,
  type InspirationSourceFeedFilter,
  type InspirationSourceSort,
  type InspirationVideoCard,
  type InspirationVideoPage,
  type TrackedInspirationAccount,
} from "@/lib/inspiration/types";
import {
  applySourceDecisionToCounts,
  filterVideosBySourceUsage,
  inspirationPageError,
  markAccountSyncError,
  markAccountSyncing,
  mergeAccountIntoState,
  sortAccounts,
  SOURCE_FEED_FILTERS,
  withId,
  withoutId,
} from "./inspiration-models";
import {
  copyInspirationSourceUrl,
  deleteInspirationAccount,
  fetchInspirationVideoPage,
  postInspirationVideoUse,
  refreshInspirationAccount,
  setInspirationVideoRejection,
  trackInspirationAccount,
} from "./inspiration-mutations";

export interface InspirationPageClientProps {
  initialAccounts: TrackedInspirationAccount[];
  initialVideoPage: InspirationVideoPage;
}

export function useInspirationWorkspace({
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
      return fetchInspirationVideoPage({
        accountId: activeFilter === "all" ? null : activeFilter,
        cursor,
        take: INSPIRATION_VIDEO_PAGE_SIZE,
        usage: sourceFeedFilter,
        search: sourceSearch,
        sort: sourceSort,
      });
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
      setPageError(inspirationPageError(error, "Failed to load sources."));
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
      setPageError(inspirationPageError(error, "Failed to load more sources."));
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
      const account = await trackInspirationAccount(handleInput.trim());
      setAccounts((prev) => mergeAccountIntoState(prev, account));
      setHandleInput("");
      await replaceVideoPage();
    } catch (error) {
      setPageError(inspirationPageError(error, "Failed to track creator."));
    } finally {
      setIsAddingAccount(false);
    }
  }

  async function handleRefreshAccount(accountId: string) {
    const attemptAt = new Date().toISOString();
    setRefreshingIds((prev) => withId(prev, accountId));
    setAccounts((prev) => markAccountSyncing(prev, accountId, attemptAt));

    try {
      const refreshed = await refreshInspirationAccount(accountId);
      setAccounts((prev) => mergeAccountIntoState(prev, refreshed));
      await replaceVideoPage();
    } catch (error) {
      const message = inspirationPageError(error, "Failed to refresh creator.");
      setPageError(message);
      setAccounts((prev) =>
        markAccountSyncError(prev, accountId, attemptAt, message)
      );
    } finally {
      setRefreshingIds((prev) => withoutId(prev, accountId));
    }
  }

  async function handleDeleteAccount(account: TrackedInspirationAccount) {
    if (!window.confirm(`Remove ${account.handleDisplay} from Inspiration?`)) {
      return;
    }

    setDeletingIds((prev) => withId(prev, account.id));
    setPageError(null);

    try {
      await deleteInspirationAccount(account.id);
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
      setPageError(inspirationPageError(error, "Failed to remove creator."));
    } finally {
      setDeletingIds((prev) => withoutId(prev, account.id));
    }
  }

  async function handleUseInClone(video: InspirationVideoCard) {
    setUsingVideoId(video.id);
    setPageError(null);

    try {
      const result = await postInspirationVideoUse(video.id);
      window.location.assign(result.redirectTo);
    } catch (error) {
      setPageError(inspirationPageError(error, "Failed to send video to Clone."));
    } finally {
      setUsingVideoId(null);
    }
  }

  async function handleSetVideoRejection(
    video: InspirationVideoCard,
    rejected: boolean
  ) {
    setUpdatingRejectionIds((prev) => withId(prev, video.id));
    setPageError(null);

    try {
      const result = await setInspirationVideoRejection(video.id, rejected);
      const nextVideo: InspirationVideoCard = {
        ...video,
        sourceDecision: result.sourceDecision,
      };
      const staysInView =
        filterVideosBySourceUsage([nextVideo], sourceFeedFilter).length > 0;
      setVideoItems((current) =>
        staysInView
          ? current.map((item) =>
              item.id === result.videoId ? nextVideo : item
            )
          : current.filter((item) => item.id !== result.videoId)
      );
      if (!staysInView) {
        setVideoTotal((current) => Math.max(0, current - 1));
      }
      setSourceUsageCounts((current) =>
        applySourceDecisionToCounts(current, video, result.sourceDecision)
      );
    } catch (error) {
      setPageError(
        inspirationPageError(error, "Failed to update source decision.")
      );
    } finally {
      setUpdatingRejectionIds((prev) => withoutId(prev, video.id));
    }
  }

  async function handleCopySourceUrl(video: InspirationVideoCard) {
    setPageError(null);

    try {
      await copyInspirationSourceUrl(video.originalUrl);
      setCopiedVideoId(video.id);
    } catch (error) {
      console.error("Failed to copy TikTok URL:", error);
      setPageError("Failed to copy TikTok URL.");
    }
  }

  function markThumbnailError(videoId: string) {
    setThumbnailErrorIds((prev) => withId(prev, videoId));
  }

  function clearThumbnailError(videoId: string) {
    setThumbnailErrorIds((prev) => withoutId(prev, videoId));
  }

  return {
    accounts,
    activeFilter,
    setActiveFilter,
    sourceFeedFilter,
    setSourceFeedFilter,
    sourceSearch,
    setSourceSearch,
    sourceSort,
    setSourceSort,
    compactGrid,
    setCompactGrid,
    videoItems,
    videoCursor,
    videoHasMore,
    videoTotal,
    sourceUsageCounts,
    isLoadingVideos,
    isLoadingMore,
    handleInput,
    setHandleInput,
    pageError,
    setPageError,
    isAddingAccount,
    refreshingIds,
    deletingIds,
    usingVideoId,
    updatingRejectionIds,
    selectedVideoId,
    setSelectedVideoId,
    copiedVideoId,
    embedState,
    setEmbedState,
    thumbnailErrorIds,
    selectedAccount,
    selectedVideo,
    trackedVideoCount,
    remainingVideoCount,
    activeSourceLabel,
    activeFeedFilterLabel,
    handleTrackAccount,
    handleRefreshAccount,
    handleDeleteAccount,
    handleUseInClone,
    handleSetVideoRejection,
    handleCopySourceUrl,
    handleLoadMore,
    markThumbnailError,
    clearThumbnailError,
  };
}

export type InspirationWorkspace = ReturnType<typeof useInspirationWorkspace>;
