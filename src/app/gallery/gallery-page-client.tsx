"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GalleryGrid } from "@/components/gallery-grid";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Images, Download, Trash2, X, ArrowUpDown, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/utils/download";
import { OUTPUT_REVIEW_STATUSES } from "@/lib/output-review-status";
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
  initialPage: GalleryPage;
}

interface GalleryPage {
  items: GalleryItem[];
  nextCursor: string | null;
  hasMore: boolean;
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
      className="min-h-48"
    />
  );
}

export function GalleryPageClient({ initialPage }: GalleryPageClientProps) {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("needs_review");
  const [typeFilter, setTypeFilter] = useState("video");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const didMountRef = useRef(false);

  const loadPage = useCallback(
    async (cursor?: string | null) => {
      const params = new URLSearchParams({
        type: typeFilter,
        sort: sortOrder,
      });
      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`/api/gallery?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load gallery.");
      }
      return (await response.json()) as GalleryPage;
    },
    [sortOrder, typeFilter]
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

  const filtered = useMemo(() => {
    let result = items.filter((item) => !deletedIds.has(item.id));
    if (reviewFilter !== "all") {
      result = result.filter((item) => item.reviewStatus.value === reviewFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((item) => item.type === typeFilter);
    }
    return result;
  }, [items, reviewFilter, typeFilter, deletedIds]);

  const reviewCounts = useMemo(() => {
    const activeItems = items.filter((item) => !deletedIds.has(item.id));

    return {
      needs_review: activeItems.filter(
        (item) => item.reviewStatus.value === "needs_review"
      ).length,
      approved_output: activeItems.filter(
        (item) => item.reviewStatus.value === "approved_output"
      ).length,
      rejected_output: activeItems.filter(
        (item) => item.reviewStatus.value === "rejected_output"
      ).length,
      all: activeItems.length,
    } satisfies Record<ReviewFilter, number>;
  }, [items, deletedIds]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDownload = () => {
    for (const id of selectedIds) {
      downloadFile(`/api/files/${id}/download`);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/files/${id}`, { method: "DELETE" }).catch(() => {})
      )
    );
    setDeletedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setSelectedIds(new Set());
    setIsDeleting(false);
  };

  const handleSingleDelete = async (id: string) => {
    await fetch(`/api/files/${id}`, { method: "DELETE" }).catch(() => {});
    setDeletedIds((prev) => new Set(prev).add(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleReviewStatusChange = (
    id: string,
    reviewStatus: SerializedOutputReviewStatus
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, reviewStatus } : item
      )
    );
  };

  const handleHandoff = async (item: { id: string }) => {
    const url =
      typeof window === "undefined"
        ? `/api/files/${item.id}`
        : new URL(`/api/files/${item.id}`, window.location.origin).toString();

    await navigator.clipboard?.writeText(url).catch(() => {});
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setLoadError(null);
    try {
      const page = await loadPage(nextCursor);
      setItems((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        return [
          ...prev,
          ...page.items.filter((item) => !existing.has(item.id)),
        ];
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
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
  const activeReviewLabel =
    reviewFilters.find((filter) => filter.value === reviewFilter)?.label ?? "All";
  const reviewSummary =
    reviewFilter === "needs_review"
      ? `${totalCount} Output${totalCount === 1 ? "" : "s"} needs review`
      : `${totalCount} Output${totalCount === 1 ? "" : "s"} in ${activeReviewLabel}`;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-5 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent-coral">
            Gallery
          </p>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Output Review</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Review, approve, reject, download, and hand off Outputs from the
              UGC production loop.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div
            className="grid gap-2 rounded-xl border border-border bg-muted/30 p-1 sm:inline-flex sm:w-auto sm:items-center"
            aria-label="Output review status filters"
          >
            {reviewFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setReviewFilter(filter.value)}
                className={cn(
                  "flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 text-left text-xs font-semibold whitespace-nowrap transition-colors",
                  reviewFilter === filter.value
                    ? "bg-accent-coral text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{filter.label}</span>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px]",
                    reviewFilter === filter.value
                      ? "bg-white/15 text-white"
                      : "bg-background/60 text-muted-foreground"
                  )}
                >
                  {reviewCounts[filter.value]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Media type
            </span>
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTypeFilter(opt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  typeFilter === opt.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
              }
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted"
            >
              <ArrowUpDown className="size-3" />
              {sortOrder === "newest" ? "Newest" : "Oldest"}
            </button>
          </div>
        </div>
      </div>

      {/* Gallery content */}
      {isReloading ? (
        <WorkspaceStateSkeleton
          title="Loading Gallery"
          lines={4}
          actions={2}
          preserveHeightClassName="min-h-80"
        />
      ) : totalCount === 0 ? (
        <WorkspaceState
          tone="empty"
          icon={Images}
          title="No Outputs ready for review"
          description="Generate a clone or asset, then return here to approve and hand it off."
          action={{ href: "/ugc-clone", label: "Start Clone" }}
          secondaryAction={{ href: "/generate", label: "Open Generate" }}
          className="min-h-80"
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onDelete={handleSingleDelete}
            onReviewStatusChange={handleReviewStatusChange}
            onHandoff={handleHandoff}
          />
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground/80 transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore && <Loader2 className="size-3.5 animate-spin" />}
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Bulk action bar — floating, right-aligned */}
      {selectionCount > 0 && (
        <TooltipProvider>
          <div className="fixed bottom-8 right-8 md:right-12 z-50 flex items-center gap-4 bg-card border border-border rounded-xl p-2 px-4 shadow-2xl animate-fade-in-up">
            {/* Left section: count + label */}
            <div className="flex items-center gap-2.5 pr-4 border-r border-border">
              <span className="size-6 rounded-md bg-accent-blue text-white text-[10px] font-extrabold flex items-center justify-center">
                {selectionCount}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                asset{selectionCount !== 1 ? "s" : ""} selected
              </span>
            </div>

            {/* Right section: icon-only action buttons */}
            <div className="flex items-center gap-1">
              {/* Download */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={handleBulkDownload}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    />
                  }
                >
                  <Download className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>

              <div className="h-4 w-px bg-border mx-1" />

              {/* Delete with confirm */}
              <AlertDialog>
                <Tooltip>
                  <AlertDialogTrigger
                    disabled={isDeleting}
                    render={
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className="p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                          />
                        }
                      />
                    }
                  >
                    <Trash2 className="size-4" />
                  </AlertDialogTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete {selectionCount} asset
                      {selectionCount !== 1 ? "s" : ""}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the selected files. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="h-4 w-px bg-border mx-1" />

              {/* Close */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="p-2 text-muted-foreground/40 hover:text-foreground transition-colors"
                    />
                  }
                >
                  <X className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Clear selection</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
