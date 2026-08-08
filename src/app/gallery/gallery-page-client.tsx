"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  GalleryGrid,
  type GalleryFeedback,
  type GalleryView,
} from "@/components/gallery-grid";
import { WorkspaceHeaderAccessory } from "@/components/workspace-shell";
import { WorkspaceState, WorkspaceStateSkeleton } from "@/components/workspace-state";
import type { SerializedOutputReviewStatus } from "@/lib/output-review-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Download,
  Grid2X2,
  Images,
  List,
  Loader2,
  Search,
  Send,
  Trash2,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/utils/download";
import {
  OUTPUT_REVIEW_STATUSES,
  serializeOutputReviewStatus,
} from "@/lib/output-review-status";
import type { OutputReviewStatus } from "@/lib/output-review-status";

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
  createdAt: string;
}

interface GalleryPageClientProps {
  initialPage: Omit<GalleryPage, "items"> & { items: GalleryItemInput[] };
  initialType?: "all" | "image" | "video";
  initialSort?: "newest" | "oldest";
  initialReviewStatus?: ReviewFilter;
}

type GalleryItemInput = Omit<GalleryItem, "type" | "reviewStatus"> & {
  type: string;
  reviewStatus: {
    value: string;
    label: string;
    tone: string;
  };
};

interface GalleryPage {
  items: GalleryItem[];
  nextCursor: string | null;
  hasMore: boolean;
  reviewCounts?: Record<ReviewFilter, number>;
}

const filterOptions = [
  { value: "all", label: "All media" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
] as const;

const reviewFilters = [
  ...OUTPUT_REVIEW_STATUSES,
  { value: "all", label: "All", tone: "neutral" },
] as const;

type ReviewFilter = OutputReviewStatus | "all";

function normalizeGalleryItem(item: GalleryItemInput): GalleryItem {
  return {
    ...item,
    type: item.type === "image" ? "image" : "video",
    reviewStatus: serializeOutputReviewStatus(item.reviewStatus.value),
  };
}

export function getFailedGalleryActionIds(
  attemptedIds: readonly string[],
  successfulIds: readonly string[]
) {
  const successful = new Set(successfulIds);
  return attemptedIds.filter((id) => !successful.has(id));
}

export function GalleryHeaderControls() {
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      <Link
        href="/ugc-clone"
        className="pf-button-secondary shrink-0 whitespace-nowrap"
      >
        Start Clone
      </Link>
      <Link
        href="/generate"
        className="pf-button-primary shrink-0 whitespace-nowrap"
      >
        Generate asset
      </Link>
    </div>
  );
}

export function GalleryLoadErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <WorkspaceState
      tone="error"
      icon={TriangleAlert}
      title="Gallery failed to load"
      description={message}
      action={{ label: "Retry Gallery", onClick: onRetry }}
      className="min-h-64 min-w-0 [&>p]:min-w-0 [&>p]:break-words [&>p]:[overflow-wrap:anywhere] [&_a]:shrink-0 [&_button]:shrink-0 [&_svg]:shrink-0"
    />
  );
}

export function GalleryPageClient({
  initialPage,
  initialType = "video",
  initialSort = "newest",
  initialReviewStatus = "needs_review",
}: GalleryPageClientProps) {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(
    initialReviewStatus
  );
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">(initialSort);
  const [view, setView] = useState<GalleryView>("grid");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GalleryItem[]>(() =>
    initialPage.items.map(normalizeGalleryItem)
  );
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [reviewCounts, setReviewCounts] = useState<Record<ReviewFilter, number>>(
    () =>
      initialPage.reviewCounts ?? {
        needs_review: initialPage.items.filter(
          (item) => item.reviewStatus.value === "needs_review"
        ).length,
        approved_output: initialPage.items.filter(
          (item) => item.reviewStatus.value === "approved_output"
        ).length,
        rejected_output: initialPage.items.filter(
          (item) => item.reviewStatus.value === "rejected_output"
        ).length,
        all: initialPage.items.length,
      }
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

  const replaceRouteFilters = useCallback(
    (updates: Partial<{ reviewStatus: ReviewFilter; type: typeof typeFilter; sort: typeof sortOrder }>) => {
      const url = new URL(window.location.href);
      if (updates.reviewStatus) {
        url.searchParams.set("reviewStatus", updates.reviewStatus);
      }
      if (updates.type) url.searchParams.set("type", updates.type);
      if (updates.sort) url.searchParams.set("sort", updates.sort);
      window.history.replaceState(window.history.state, "", url);
    },
    []
  );

  const loadPage = useCallback(
    async (cursor?: string | null) => {
      const params = new URLSearchParams({
        type: typeFilter,
        sort: sortOrder,
        reviewStatus: reviewFilter,
      });
      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`/api/gallery?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load gallery.");
      }
      return (await response.json()) as GalleryPage;
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
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        if (page.reviewCounts) setReviewCounts(page.reviewCounts);
      })
      .catch((error) => {
        if (!isCurrent) return;
        setLoadError(
          error instanceof Error ? error.message : "Failed to load gallery."
        );
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

  const filtered = useMemo(() => {
    let result = activeItems;
    if (reviewFilter !== "all") {
      result = result.filter((item) => item.reviewStatus.value === reviewFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((item) => item.type === typeFilter);
    }
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery) {
      result = result.filter((item) =>
        [item.model, item.jobId, item.prompt, item.filename]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))
      );
    }
    return result;
  }, [activeItems, query, reviewFilter, typeFilter]);

  const refreshActiveFilter = useCallback(() => {
    setLoadError(null);
    void loadPage()
      .then((page) => {
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        if (page.reviewCounts) setReviewCounts(page.reviewCounts);
      })
      .catch((error) => {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load gallery."
        );
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
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const item = activeItems.find((candidate) => candidate.id === id);
          await downloadFile(`/api/files/${id}/download`, item?.filename);
          return id;
        } catch {
          return null;
        }
      })
    );
    const downloadedIds = results.filter((id): id is string => id !== null);
    const failedIds = getFailedGalleryActionIds(ids, downloadedIds);

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
      ids.map(async (id) => {
        try {
          const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
          return response.ok ? id : null;
        } catch {
          return null;
        }
      })
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
    try {
      const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setDeletedIds((previous) => new Set(previous).add(id));
      setSelectedIds((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
      setFeedback({ tone: "success", message: "Asset deleted." });
      refreshActiveFilter();
      return true;
    } catch {
      setFeedback({
        tone: "error",
        message: "This asset could not be deleted. Try again.",
      });
      return false;
    }
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
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await fetch(`/api/files/${id}/review-status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reviewStatus: status }),
          });
          if (!response.ok) return null;
          const result = (await response.json()) as {
            reviewStatus: SerializedOutputReviewStatus;
          };
          return { id, reviewStatus: result.reviewStatus };
        } catch {
          return null;
        }
      })
    );
    const updated = results.filter(
      (result): result is { id: string; reviewStatus: SerializedOutputReviewStatus } =>
        result !== null
    );
    setItems((previous) =>
      previous.map((item) => {
        const result = updated.find((entry) => entry.id === item.id);
        return result ? { ...item, reviewStatus: result.reviewStatus } : item;
      })
    );
    const failedIds = getFailedGalleryActionIds(
      ids,
      updated.map((entry) => entry.id)
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
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      const url = new URL(`/api/files/${item.id}`, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
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
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      const urls = Array.from(selectedIds).map((id) =>
        new URL(`/api/files/${id}`, window.location.origin).toString()
      );
      await navigator.clipboard.writeText(urls.join("\n"));
      setFeedback({
        tone: "success",
        message: `${urls.length} handoff link${urls.length === 1 ? "" : "s"} copied.`,
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
      setItems((previous) => {
        const existing = new Set(previous.map((item) => item.id));
        return [
          ...previous,
          ...page.items.filter((item) => !existing.has(item.id)),
        ];
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      if (page.reviewCounts) setReviewCounts(page.reviewCounts);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load gallery."
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRetryLoad = async () => {
    setIsReloading(true);
    setLoadError(null);
    try {
      const page = await loadPage();
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      if (page.reviewCounts) setReviewCounts(page.reviewCounts);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load gallery."
      );
    } finally {
      setIsReloading(false);
    }
  };

  const selectionCount = selectedIds.size;
  const totalCount = filtered.length;
  const isGalleryEmpty = reviewCounts.all === 0;
  const activeReviewLabel =
    reviewFilters.find((filter) => filter.value === reviewFilter)?.label ?? "All";
  const activeTotal = reviewCounts[reviewFilter] ?? totalCount;
  const countCopy =
    totalCount < activeTotal
      ? `Showing ${totalCount} of ${activeTotal}`
      : `${activeTotal}`;
  const reviewSummary =
    reviewFilter === "needs_review"
      ? `${countCopy} output${activeTotal === 1 ? "" : "s"} needing review`
      : `${countCopy} output${activeTotal === 1 ? "" : "s"} in ${activeReviewLabel.toLowerCase()}`;

  return (
    <>
      <WorkspaceHeaderAccessory>
        <GalleryHeaderControls />
      </WorkspaceHeaderAccessory>

      <div className="mx-auto min-w-0 max-w-[1280px] space-y-4 p-5 sm:p-6 lg:p-8">

      {feedback && (
        <div
          role={feedback.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={cn(
            "flex min-w-0 items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
            feedback.tone === "success"
              ? "border-accent-green/30 bg-accent-green/10 text-foreground"
              : "border-destructive/30 bg-destructive/10 text-foreground"
          )}
        >
          <span className="flex min-w-0 flex-1 items-start gap-2">
            {feedback.tone === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-accent-green" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-destructive" />
            )}
            <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
              {feedback.message}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss notification"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground"
          >
            <X className="size-4 shrink-0" />
          </button>
        </div>
      )}

      <section className="rounded-lg border border-border bg-card p-2 shadow-[var(--pf-shadow-2xs)]">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div
            className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--pf-active)] p-1 sm:flex sm:w-fit sm:items-center"
            aria-label="Output review status filters"
          >
            {reviewFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setReviewFilter(filter.value);
                  setSelectedIds(new Set());
                  replaceRouteFilters({ reviewStatus: filter.value });
                }}
                className={cn(
                  "flex h-9 items-center justify-between gap-2 rounded-md px-3 text-[12px] font-medium whitespace-nowrap transition-colors",
                  reviewFilter === filter.value
                    ? "bg-[var(--pf-surface)] text-foreground shadow-[var(--pf-shadow-2xs)]"
                    : "text-[#52525B] hover:text-foreground dark:text-[var(--pf-muted)]"
                )}
              >
                <span>{filter.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                    reviewFilter === filter.value ? "bg-[var(--pf-active)]" : "bg-[var(--pf-surface)]"
                  )}
                >
                  {reviewCounts[filter.value]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-muted-foreground sm:w-56">
              <Search className="size-4 shrink-0" />
              <span className="sr-only">Search gallery</span>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedIds(new Set());
                }}
                placeholder="Search gallery"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>

            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <span className="sr-only">Media type</span>
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTypeFilter(option.value);
                    replaceRouteFilters({ type: option.value });
                  }}
                  className={cn(
                    "h-9 shrink-0 rounded-md px-3 text-[12px] font-medium transition-colors",
                    typeFilter === option.value
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const nextSort = sortOrder === "newest" ? "oldest" : "newest";
                  setSortOrder(nextSort);
                  replaceRouteFilters({ sort: nextSort });
                }}
                className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[12px] font-medium transition-colors hover:bg-muted"
              >
                <ArrowUpDown className="size-3.5" />
                {sortOrder === "newest" ? "Newest" : "Oldest"}
              </button>
              <div className="flex shrink-0 rounded-lg border border-border bg-background p-1">
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground",
                    view === "grid" && "bg-muted text-foreground"
                  )}
                >
                  <Grid2X2 className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground",
                    view === "list" && "bg-muted text-foreground"
                  )}
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectionCount > 0 && (
        <section
          data-gallery-bulk-bar
          className="rounded-lg border border-border bg-card px-3 py-2 shadow-[var(--pf-shadow-2xs)]"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              {selectionCount}
            </span>
            <strong className="shrink-0 text-[13px] font-medium">
              {selectionCount} selected
            </strong>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set(filtered.map((item) => item.id)))}
              className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Select all {filtered.length}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
            <span aria-hidden="true" className="hidden h-4 w-px bg-border sm:block" />
            <div className="flex min-w-0 flex-wrap items-center gap-0.5">
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={() => void updateSelectedReviewStatus("approved_output")}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-[var(--pf-success)]/10 hover:text-[var(--pf-success)] disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" />
                Approve
              </button>
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={() => void updateSelectedReviewStatus("rejected_output")}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)] disabled:opacity-50"
              >
                <XCircle className="size-3.5" />
                Reject
              </button>
              <button
                type="button"
                disabled={isBulkDownloading}
                onClick={() => void handleBulkDownload()}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBulkDownloading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                {isBulkDownloading ? "Downloading" : "Download"}
              </button>
              <button
                type="button"
                onClick={() => void handleBulkHandoff()}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Send className="size-3.5" />
                Handoff
              </button>
            </div>
            <span className="flex-1" />
            <AlertDialog>
              <AlertDialogTrigger
                disabled={isDeleting}
                render={
                  <button
                    type="button"
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-[var(--pf-danger)] transition-colors hover:bg-[var(--pf-danger)]/10 disabled:opacity-50"
                  />
                }
              >
                <Trash2 className="size-3.5" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {selectionCount} asset{selectionCount === 1 ? "" : "s"}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the selected files and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleBulkDelete()}>
                    Delete assets
                  </AlertDialogAction>
                </AlertDialogFooter>
               </AlertDialogContent>
             </AlertDialog>
          </div>
        </section>
      )}

      {isReloading ? (
        <WorkspaceStateSkeleton
          title="Loading Gallery"
          lines={4}
          actions={2}
          preserveHeightClassName="min-h-80"
        />
      ) : loadError && activeItems.length === 0 ? (
        <GalleryLoadErrorState
          message={loadError}
          onRetry={() => void handleRetryLoad()}
        />
      ) : totalCount === 0 ? (
        <WorkspaceState
          tone="empty"
          icon={Images}
          title={isGalleryEmpty ? "No Outputs ready for review" : "No Outputs match these filters"}
          description={
            isGalleryEmpty
              ? "Generate a clone or asset, then return here to approve and hand it off."
              : "Try another review status, media type, or search term."
          }
          action={
            isGalleryEmpty
              ? { href: "/ugc-clone", label: "Start Clone" }
              : {
                  label: query ? "Clear search" : "Show all review states",
                  onClick: () => {
                    setQuery("");
                    if (!query) {
                      setReviewFilter("all");
                      replaceRouteFilters({ reviewStatus: "all" });
                    }
                  },
                }
          }
          secondaryAction={
            isGalleryEmpty
              ? { href: "/generate", label: "Open Generate" }
              : undefined
          }
          className="min-h-80"
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 px-1">
            <p className="text-[12px] font-medium text-muted-foreground">
              {reviewSummary}
            </p>
          </div>
          {loadError && (
            <GalleryLoadErrorState
              message={loadError}
              onRetry={() => void handleRetryLoad()}
            />
          )}
          <GalleryGrid
            items={filtered}
            view={view}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onDelete={handleSingleDelete}
            onReviewStatusChange={handleReviewStatusChange}
            onHandoff={handleHandoff}
            onFeedback={setFeedback}
          />
          {hasMore && (
            <div className="flex justify-center pt-3">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={isLoadingMore}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[12px] font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore && <Loader2 className="size-3.5 animate-spin" />}
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
}
