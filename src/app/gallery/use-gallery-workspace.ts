"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GalleryFeedback, GalleryItem, GalleryView } from "@/components/gallery/types";
import type { OutputReviewStatus, SerializedOutputReviewStatus } from "@/lib/output-review-status";
import {
  emptyReviewCounts,
  filterGalleryItems,
  galleryLoadError,
  galleryReviewSummary,
  appendGalleryItems,
  normalizeGalleryItem,
  type GalleryItemInput,
  type GalleryPage,
  type GallerySortOrder,
  type GalleryTypeFilter,
  type ReviewFilter,
} from "./gallery-models";
import {
  copyHandoffUrls,
  deleteGalleryFile,
  downloadGalleryFiles,
  fetchGalleryPage,
  patchGalleryReviewStatuses,
  replaceGalleryRouteFilters,
} from "./gallery-mutations";

export function useGalleryWorkspace({
  initialPage,
  initialType = "video",
  initialSort = "newest",
  initialReviewStatus = "needs_review",
}: {
  initialPage: Omit<GalleryPage, "items"> & { items: GalleryItemInput[] };
  initialType?: GalleryTypeFilter;
  initialSort?: GallerySortOrder;
  initialReviewStatus?: ReviewFilter;
}) {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(
    initialReviewStatus
  );
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [sortOrder, setSortOrder] = useState<GallerySortOrder>(initialSort);
  const [view, setView] = useState<GalleryView>("grid");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GalleryItem[]>(() =>
    initialPage.items.map(normalizeGalleryItem)
  );
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [reviewCounts, setReviewCounts] = useState<Record<ReviewFilter, number>>(
    () => initialPage.reviewCounts ?? emptyReviewCounts(initialPage.items)
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<GalleryFeedback | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const applyPage = (page: GalleryPage) => {
    setItems(page.items);
    setNextCursor(page.nextCursor);
    setHasMore(page.hasMore);
    if (page.reviewCounts) setReviewCounts(page.reviewCounts);
  };

  const loadPage = useCallback(
    async (cursor?: string | null) => {
      return fetchGalleryPage({
        type: typeFilter,
        sort: sortOrder,
        reviewStatus: reviewFilter,
        cursor,
      });
    },
    [reviewFilter, sortOrder, typeFilter]
  );

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    let isCurrent = true;
    setIsReloading(true);
    setLoadError(null);
    setSelectedIds(new Set());

    loadPage()
      .then((page) => {
        if (!isCurrent) return;
        applyPage(page);
      })
      .catch((error) => {
        if (!isCurrent) return;
        setLoadError(galleryLoadError(error));
      })
      .finally(() => {
        if (isCurrent) setIsReloading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [loadPage]);

  const activeItems = useMemo(
    () => items.filter((item) => !deletedIds.has(item.id)),
    [deletedIds, items]
  );

  const filtered = useMemo(
    () => filterGalleryItems(activeItems, { reviewFilter, typeFilter, query }),
    [activeItems, query, reviewFilter, typeFilter]
  );

  const refreshActiveFilter = useCallback(() => {
    setLoadError(null);
    void loadPage()
      .then(applyPage)
      .catch((error) => {
        setLoadError(galleryLoadError(error));
      });
  }, [loadPage]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDownload = async () => {
    if (isBulkDownloading) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsBulkDownloading(true);
    const { downloadedIds, failedIds } = await downloadGalleryFiles(
      ids,
      activeItems
    );

    if (failedIds.length > 0) {
      setSelectedIds(new Set(failedIds));
      setFeedback({
        tone: "error",
        message:
          downloadedIds.length === 0
            ? "The selected assets could not be downloaded. Try again."
            : `${downloadedIds.length} downloaded; ${failedIds.length} could not be downloaded and remain selected.`,
      });
    } else {
      setFeedback({
        tone: "success",
        message: `${downloadedIds.length} asset${downloadedIds.length === 1 ? "" : "s"} downloaded.`,
      });
    }
    setIsBulkDownloading(false);
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.all(
      ids.map(async (id) => ((await deleteGalleryFile(id)) ? id : null))
    );
    const removedIds = results.filter((id): id is string => id !== null);
    if (removedIds.length > 0) {
      setDeletedIds((previous) => {
        const next = new Set(previous);
        removedIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedIds((previous) => {
        const next = new Set(previous);
        removedIds.forEach((id) => next.delete(id));
        return next;
      });
    }
    setFeedback(
      removedIds.length === ids.length
        ? {
            tone: "success",
            message: `${removedIds.length} asset${removedIds.length === 1 ? "" : "s"} deleted.`,
          }
        : {
            tone: "error",
            message:
              removedIds.length === 0
                ? "The selected assets could not be deleted. Try again."
                : `${removedIds.length} deleted; ${ids.length - removedIds.length} could not be deleted.`,
          }
    );
    setIsDeleting(false);
    refreshActiveFilter();
  };

  const handleSingleDelete = async (id: string) => {
    const deleted = await deleteGalleryFile(id);
    if (!deleted) {
      setFeedback({
        tone: "error",
        message: "This asset could not be deleted. Try again.",
      });
      return false;
    }
    setDeletedIds((previous) => new Set(previous).add(id));
    setSelectedIds((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
    setFeedback({ tone: "success", message: "Asset deleted." });
    refreshActiveFilter();
    return true;
  };

  const handleReviewStatusChange = (
    id: string,
    reviewStatus: SerializedOutputReviewStatus
  ) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, reviewStatus } : item
      )
    );
    if (reviewFilter !== "all" && reviewStatus.value !== reviewFilter) {
      setSelectedIds((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
    }
    refreshActiveFilter();
  };

  const updateSelectedReviewStatus = async (status: OutputReviewStatus) => {
    if (isBulkUpdating) return;
    setIsBulkUpdating(true);
    const ids = Array.from(selectedIds);
    const { updated, failedIds } = await patchGalleryReviewStatuses(ids, status);
    setItems((previous) =>
      previous.map((item) => {
        const result = updated.find((entry) => entry.id === item.id);
        return result ? { ...item, reviewStatus: result.reviewStatus } : item;
      })
    );
    setSelectedIds(new Set(failedIds));
    setFeedback(
      updated.length === ids.length
        ? {
            tone: "success",
            message: `${updated.length} asset${updated.length === 1 ? "" : "s"} marked ${status === "approved_output" ? "approved" : "rejected"}.`,
          }
        : {
            tone: "error",
            message:
              updated.length === 0
                ? "The selected assets could not be updated and remain selected. Try again."
                : `${updated.length} of ${ids.length} assets updated. ${failedIds.length} remain selected for retry.`,
          }
    );
    setIsBulkUpdating(false);
    refreshActiveFilter();
  };

  const handleHandoff = async (item: { id: string }) => {
    try {
      await copyHandoffUrls([item.id]);
      setFeedback({
        tone: "success",
        message: "Handoff link copied. Paste it into your next workflow.",
      });
      return true;
    } catch {
      setFeedback({
        tone: "error",
        message: "The handoff link could not be copied. Check browser permissions.",
      });
      return false;
    }
  };

  const handleBulkHandoff = async () => {
    try {
      const ids = Array.from(selectedIds);
      await copyHandoffUrls(ids);
      setFeedback({
        tone: "success",
        message: `${ids.length} handoff link${ids.length === 1 ? "" : "s"} copied.`,
      });
    } catch {
      setFeedback({
        tone: "error",
        message: "The handoff links could not be copied. Check browser permissions.",
      });
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setLoadError(null);
    try {
      const page = await loadPage(nextCursor);
      setItems((previous) => appendGalleryItems(previous, page.items));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      if (page.reviewCounts) setReviewCounts(page.reviewCounts);
    } catch (error) {
      setLoadError(galleryLoadError(error));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRetryLoad = async () => {
    setIsReloading(true);
    setLoadError(null);
    try {
      applyPage(await loadPage());
    } catch (error) {
      setLoadError(galleryLoadError(error));
    } finally {
      setIsReloading(false);
    }
  };

  const selectionCount = selectedIds.size;
  const totalCount = filtered.length;
  const isGalleryEmpty = reviewCounts.all === 0;
  const reviewSummary = galleryReviewSummary({
    reviewFilter,
    reviewCounts,
    totalCount,
  });

  return {
    reviewFilter,
    typeFilter,
    sortOrder,
    view,
    query,
    filtered,
    selectedIds,
    selectionCount,
    isDeleting,
    isBulkUpdating,
    isBulkDownloading,
    isReloading,
    isLoadingMore,
    loadError,
    hasMore,
    reviewCounts,
    feedback,
    reviewSummary,
    isGalleryEmpty,
    totalCount,
    activeItems,
    setReviewFilter,
    setTypeFilter,
    setSortOrder,
    setView,
    setQuery,
    setSelectedIds,
    setFeedback,
    replaceRouteFilters: replaceGalleryRouteFilters,
    toggleSelection,
    handleBulkDownload,
    handleBulkDelete,
    handleSingleDelete,
    handleReviewStatusChange,
    updateSelectedReviewStatus,
    handleHandoff,
    handleBulkHandoff,
    handleLoadMore,
    handleRetryLoad,
  };
}

export type GalleryWorkspace = ReturnType<typeof useGalleryWorkspace>;
