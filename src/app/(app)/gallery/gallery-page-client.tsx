"use client";

import { GalleryGrid, type GalleryGridSession } from "@/components/gallery-grid";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { WorkspaceState, WorkspaceStateSkeleton } from "@/components/workspace-state";
import { Button } from "@/components/ui/button";
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
  type GalleryPageClientProps,
} from "./gallery-models";
import { GalleryPanel } from "./gallery-panel";
import { useGalleryWorkspace } from "./use-gallery-workspace";

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
              "flex min-w-0 items-start justify-between gap-3 rounded-[8px] border px-4 py-3 text-sm",
              feedback.tone === "success"
                ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-foreground"
                : "border-[var(--pf-danger)]/30 bg-[var(--pf-danger)]/10 text-foreground"
            )}
          >
            <span className="flex min-w-0 flex-1 items-start gap-2">
              {feedback.tone === "success" ? (
                <CheckCircle2 className="size-4 shrink-0 text-[var(--pf-success)]" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-[var(--pf-danger)]" />
              )}
              <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                {feedback.message}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss notification"
              className="size-7 shrink-0 text-muted-foreground"
            >
              <X className="size-4 shrink-0" />
            </Button>
          </div>
        )}

        <GalleryPanel data-gallery-toolbar="true" className="p-2">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div
              data-gallery-filters="true"
              className="grid grid-cols-2 gap-1 rounded-[8px] bg-muted p-1 sm:flex sm:w-fit sm:items-center"
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
                    "flex h-9 items-center justify-between gap-2 rounded-[6px] px-3 text-[12px] font-medium whitespace-nowrap transition-colors duration-[180ms] ease-[var(--pf-ease)]",
                    reviewFilter === filter.value
                      ? "bg-card text-foreground shadow-[var(--pf-shadow-2xs)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{filter.label}</span>
                  <span
                    data-gallery-count="true"
                    className={cn(
                      "pf-data rounded-full px-1.5 py-0.5 text-[11px]",
                      reviewFilter === filter.value ? "bg-muted" : "bg-card"
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
                className="flex h-9 min-w-0 items-center gap-2 rounded-[8px] border border-border bg-card px-3 text-muted-foreground sm:w-56"
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
                <div className="flex shrink-0 gap-1 rounded-[8px] bg-muted p-1">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setTypeFilter(option.value);
                        replaceRouteFilters({ type: option.value });
                      }}
                      className={cn(
                        "h-9 shrink-0 rounded-[6px] px-3 text-[12px] font-medium transition-colors duration-[180ms] ease-[var(--pf-ease)]",
                        typeFilter === option.value
                          ? "bg-card text-foreground shadow-[var(--pf-shadow-2xs)]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextSort = sortOrder === "newest" ? "oldest" : "newest";
                    setSortOrder(nextSort);
                    replaceRouteFilters({ sort: nextSort });
                  }}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-[8px] border border-border bg-card px-3 text-[12px] font-medium text-foreground transition-colors duration-[180ms] ease-[var(--pf-ease)] hover:bg-muted"
                >
                  <ArrowUpDown className="size-3.5" />
                  {sortOrder === "newest" ? "Newest" : "Oldest"}
                </button>
                <div className="flex shrink-0 gap-1 rounded-[8px] border border-border bg-card p-1">
                  <button
                    type="button"
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                    onClick={() => setView("grid")}
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-[6px] text-muted-foreground transition-colors duration-[180ms] ease-[var(--pf-ease)]",
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
                      "inline-flex size-8 items-center justify-center rounded-[6px] text-muted-foreground transition-colors duration-[180ms] ease-[var(--pf-ease)]",
                      view === "list" && "bg-muted text-foreground"
                    )}
                  >
                    <List className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </GalleryPanel>

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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleLoadMore()}
                  disabled={isLoadingMore}
                  className="h-9 gap-2 px-4 text-[12px]"
                >
                  {isLoadingMore && <Loader2 className="size-3.5 animate-spin" />}
                  {isLoadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
