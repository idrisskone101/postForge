"use client";

import { GalleryGrid, type GalleryGridSession } from "@/components/gallery-grid";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { WorkspaceState, WorkspaceStateSkeleton } from "@/components/workspace-state";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Grid2X2,
  Images,
  List,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GalleryBulkBar } from "./gallery-bulk-bar";
import { GalleryHeaderControls } from "./gallery-header-controls";
import { GalleryLoadErrorState } from "./gallery-load-error-state";
import {
  filterOptions,
  reviewFilters,
  type GalleryItemInput,
  type GalleryPage,
  type GallerySortOrder,
  type GalleryTypeFilter,
  type ReviewFilter,
} from "./gallery-models";
import { useGalleryWorkspace } from "./use-gallery-workspace";

export interface GalleryPageClientProps {
  initialPage: Omit<GalleryPage, "items"> & { items: GalleryItemInput[] };
  initialType?: GalleryTypeFilter;
  initialSort?: GallerySortOrder;
  initialReviewStatus?: ReviewFilter;
}

export function GalleryPageClient(props: GalleryPageClientProps) {
  const workspace = useGalleryWorkspace(props);
  const {
    reviewFilter,
    typeFilter,
    sortOrder,
    view,
    query,
    filtered,
    selectedIds,
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
    replaceRouteFilters,
    toggleSelection,
    handleSingleDelete,
    handleReviewStatusChange,
    handleHandoff,
    handleLoadMore,
    handleRetryLoad,
  } = workspace;

  const gridSession: GalleryGridSession = {
    items: filtered,
    view,
    selectedIds,
    onToggleSelect: toggleSelection,
    onDelete: handleSingleDelete,
    onReviewStatusChange: handleReviewStatusChange,
    onHandoff: handleHandoff,
    onFeedback: setFeedback,
  };

  return (
    <>
      <WorkspaceHeaderAccessory>
        <GalleryHeaderControls />
      </WorkspaceHeaderAccessory>

      <div
        data-gallery-page="true"
        className="mx-auto min-w-0 max-w-[1280px] space-y-4 p-5 sm:p-6 lg:p-8"
      >

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

      <section
        data-gallery-toolbar="true"
        className="rounded-lg border border-border bg-card p-2 shadow-[var(--pf-shadow-2xs)]"
      >
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div
            data-gallery-filters="true"
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
                  data-gallery-count="true"
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

          <div data-gallery-tools="true" className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label
              data-gallery-search="true"
              className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-muted-foreground sm:w-56"
            >
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

            <div
              data-gallery-tool-row="true"
              className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden"
            >
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

      <GalleryBulkBar workspace={workspace} />

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
          className="h-[340px] overflow-hidden"
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
          <GalleryGrid session={gridSession} />
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
