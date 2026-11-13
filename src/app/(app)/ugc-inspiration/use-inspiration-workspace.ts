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
  type VideoPageQuery,
  withId,
  withoutId,
} from "./inspiration-models";
import {
  refreshWorkspaceAccount,
  deleteWorkspaceAccount,
  trackWorkspaceAccount,
} from "./inspiration-account-commands";
import {
  copyInspirationSourceUrl,
  fetchInspirationVideoPage,
  setInspirationVideoRejection,
} from "./inspiration-mutations";
import { useInspirationAccountList } from "./use-inspiration-account-list";
import type { InspirationPageClientProps } from "./types";

export function useInspirationWorkspace({
  initialAccountPage,
  initialVideoPage,
}: InspirationPageClientProps) {
  const [pageError, setPageError] = useState<string | null>(null);
  const {
    accounts, setAccounts, accountCursor, isLoadingMoreAccounts, handleLoadMoreAccounts,
  } = useInspirationAccountList(initialAccountPage, setPageError);
  const [activeFilter, setActiveFilter] = useState<"all" | string>("all");
  const [sourceFeedFilter, setSourceFeedFilter] =
    useState<InspirationSourceFeedFilter>("all");
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceSort, setSourceSort] = useState<InspirationSourceSort>("recent");
  const [largeTiles, setLargeTiles] = useState(false);
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
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [updatingRejectionIds, setUpdatingRejectionIds] = useState<string[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);
  const [embedState, setEmbedState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [thumbnailErrorIds, setThumbnailErrorIds] = useState<string[]>([]);
  const didMountSearch = useRef(false);
  const replaceVideoPageRef = useRef<
    (query?: VideoPageQuery) => Promise<void>
  >(() => Promise.resolve());

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
    async (cursor?: string | null, query: VideoPageQuery = {}) => {
      const accountId =
        query.accountId !== undefined
          ? query.accountId
          : activeFilter === "all"
            ? null
            : activeFilter;

      return fetchInspirationVideoPage({
        accountId,
        cursor,
        take: INSPIRATION_VIDEO_PAGE_SIZE,
        usage: query.usage ?? sourceFeedFilter,
        search: query.search ?? sourceSearch,
        sort: query.sort ?? sourceSort,
      });
    },
    [activeFilter, sourceFeedFilter, sourceSearch, sourceSort]
  );

  const replaceVideoPage = useCallback(
    async (query: VideoPageQuery = {}) => {
      setIsLoadingVideos(true);
      setVideoItems([]);
      setVideoCursor(null);
      setVideoHasMore(false);
      setPageError(null);
      try {
        const page = await loadVideoPage(undefined, query);
        applyVideoPage(page, "replace");
      } catch (error) {
        setPageError(inspirationPageError(error, "Failed to load sources."));
        setVideoTotal(0);
      } finally {
        setIsLoadingVideos(false);
      }
    },
    [applyVideoPage, loadVideoPage]
  );

  replaceVideoPageRef.current = replaceVideoPage;

  const setActiveFilterAndReload = useCallback(
    (filter: "all" | string) => {
      setActiveFilter(filter);
      void replaceVideoPage({
        accountId: filter === "all" ? null : filter,
      });
    },
    [replaceVideoPage]
  );

  const setSourceFeedFilterAndReload = useCallback(
    (filter: InspirationSourceFeedFilter) => {
      setSourceFeedFilter(filter);
      void replaceVideoPage({ usage: filter });
    },
    [replaceVideoPage]
  );

  const setSourceSortAndReload = useCallback(
    (sort: InspirationSourceSort) => {
      setSourceSort(sort);
      void replaceVideoPage({ sort });
    },
    [replaceVideoPage]
  );

  useEffect(() => {
    if (!didMountSearch.current) {
      didMountSearch.current = true;
      return;
    }

    const delay = sourceSearch.trim() ? 250 : 0;
    const timer = window.setTimeout(() => {
      void replaceVideoPageRef.current();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [sourceSearch]);

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

  useEffect(() => {
    if (!selectedVideo) {
      setEmbedState("idle");
      return;
    }

    setEmbedState("loading");
    const timer = window.setTimeout(() => {
      setEmbedState((current) => (current === "ready" ? current : "failed"));
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [selectedVideo]);

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
    await trackWorkspaceAccount({
      handle: handleInput,
      setHandleInput,
      setIsAddingAccount,
      setPageError,
      setAccounts,
      replaceVideoPage,
    });
  }

  async function handleRefreshAccount(accountId: string) {
    await refreshWorkspaceAccount({
      accountId,
      setRefreshingIds,
      setAccounts,
      setPageError,
      replaceVideoPage,
    });
  }

  async function handleDeleteAccount(account: TrackedInspirationAccount) {
    await deleteWorkspaceAccount({
      account,
      selectedVideoAccountId: selectedVideo?.accountId,
      activeFilter,
      setDeletingIds,
      setAccounts,
      setPageError,
      setSelectedVideoId,
      setActiveFilterAndReload,
      replaceVideoPage,
    });
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
        if (selectedVideoId === result.videoId) {
          setSelectedVideoId(null);
        }
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
    accountCursor,
    isLoadingMoreAccounts,
    activeFilter,
    setActiveFilter: setActiveFilterAndReload,
    sourceFeedFilter,
    setSourceFeedFilter: setSourceFeedFilterAndReload,
    sourceSearch,
    setSourceSearch,
    sourceSort,
    setSourceSort: setSourceSortAndReload,
    largeTiles,
    setLargeTiles,
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
    handleTrackAccount,
    handleRefreshAccount,
    handleDeleteAccount,
    handleSetVideoRejection,
    handleCopySourceUrl,
    handleLoadMore,
    handleLoadMoreAccounts,
    reloadVideos: () => void replaceVideoPage(),
    markThumbnailError,
    clearThumbnailError,
  };
}
