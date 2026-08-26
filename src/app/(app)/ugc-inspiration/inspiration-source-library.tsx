"use client";

import {
  ArrowRight,
  CheckCircle2,
  Compass,
  ExternalLink,
  LayoutGrid,
  Loader2,
  Search,
} from "lucide-react";
import { INSPIRATION_VIDEO_PAGE_SIZE, parseInspirationSourceSort } from "@/lib/inspiration/types";
import { cn } from "@/lib/utils";
import { WorkspaceState } from "@/components/workspace-state";
import {
  emptyLibraryCopy,
  SOURCE_FEED_FILTERS,
} from "./inspiration-models";
import { InspirationVideoCard } from "./inspiration-video-card";
import type { InspirationWorkspace } from "./types";

export function InspirationSourceLibrary({
  workspace,
}: {
  workspace: InspirationWorkspace;
}) {
  const {
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
    isLoadingMore,
    remainingVideoCount,
    activeSourceLabel,
    activeFeedFilterLabel,
    handleLoadMore,
  } = workspace;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[var(--pf-border)] pt-5">
        <div className="min-w-0">
          <h3
            id="source-library-heading"
            className="pf-section-title"
          >
            Source library
          </h3>
          <p className="mt-1 text-[12px] text-[var(--pf-muted)]">
            {activeSourceLabel} · {videoItems.length} of {videoTotal}{" "}
            {activeFeedFilterLabel.toLowerCase()}
          </p>
        </div>

        <div
          data-source-feed-tabs="true"
          role="tablist"
          aria-label="Source usage filter"
          className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-[8px] bg-[var(--pf-active)] p-1 sm:w-auto"
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
                  "flex min-w-max items-center gap-2 rounded-[6px] px-3 py-2 text-left transition-colors",
                  isActive
                    ? "bg-[var(--pf-surface)] text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
                    : "text-[var(--pf-muted)] hover:text-[var(--pf-ink)]"
                )}
              >
                <span className="text-[12px] font-semibold">{filter.label}</span>
                <span className="sr-only">{filter.description}</span>
                <span
                  className={cn(
                    "pf-data shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    isActive
                      ? "bg-[var(--pf-active)] text-[var(--pf-ink)]"
                      : "bg-[var(--pf-surface)] text-[var(--pf-muted)]"
                  )}
                >
                  {sourceUsageCounts[filter.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pf-card flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--pf-muted)]" />
          <input
            value={sourceSearch}
            onChange={(event) => setSourceSearch(event.target.value)}
            placeholder="Search captions or creators"
            aria-label="Search source library"
            className="h-9 w-full rounded-[8px] border-0 bg-[var(--pf-active)] pl-9 text-[12px] text-[var(--pf-ink)] shadow-none outline-none placeholder:text-[var(--pf-muted)] focus-visible:ring-1 focus-visible:ring-[var(--pf-orange)]/40"
          />
        </label>
        <label className="relative flex h-9 min-w-40 items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-2.5 text-[12px] text-[var(--pf-muted)]">
          <span className="sr-only">Sort source library</span>
          <select
            value={sourceSort}
            onChange={(event) =>
              setSourceSort(parseInspirationSourceSort(event.target.value))
            }
            aria-label="Sort source library"
            className="size-full appearance-none bg-transparent pr-6 text-[12px] font-medium text-[var(--pf-ink)] outline-none"
          >
            <option value="recent">Newest first</option>
            <option value="views">Most viewed</option>
            <option value="engagement">Most engagement</option>
          </select>
          <ArrowRight className="pointer-events-none absolute right-2.5 size-3.5 rotate-90" />
        </label>
        <button
          type="button"
          aria-label={compactGrid ? "Use comfortable source grid" : "Use compact source grid"}
          aria-pressed={compactGrid}
          onClick={() => setCompactGrid((current) => !current)}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)]",
            compactGrid &&
              "bg-[var(--pf-active)] text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
          )}
        >
          <LayoutGrid className="size-4" />
        </button>
      </div>

      <InspirationLibraryBody workspace={workspace} />

      {videoHasMore && (
        <div className="flex flex-col items-center gap-2 border-t border-[var(--pf-border)] pt-5 text-center">
          <p className="text-[11px] text-[var(--pf-muted)]">
            Showing {videoItems.length} of {videoTotal} matching sources
          </p>
          <button
            type="button"
            onClick={() => void handleLoadMore()}
            disabled={isLoadingMore || !videoCursor}
            data-inspiration-load-more="true"
            className="pf-button-secondary h-10 px-5 text-[12px]"
          >
            {isLoadingMore ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              `Load ${Math.min(INSPIRATION_VIDEO_PAGE_SIZE, remainingVideoCount)} more`
            )}
          </button>
        </div>
      )}
    </>
  );
}

function InspirationLibraryBody({
  workspace,
}: {
  workspace: InspirationWorkspace;
}) {
  const {
    accounts,
    selectedAccount,
    sourceFeedFilter,
    sourceSearch,
    compactGrid,
    videoItems,
    videoTotal,
    sourceUsageCounts,
    isLoadingVideos,
  } = workspace;

  if (accounts.length === 0) {
    return (
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
    );
  }

  if (isLoadingVideos && videoItems.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[8px] border border-dashed border-[var(--pf-border)] bg-[var(--pf-surface)] px-6 py-14 text-center">
        <Loader2 className="mb-4 size-6 animate-spin text-[var(--pf-muted)]" />
        <h2 className="pf-section-title">Loading sources</h2>
      </div>
    );
  }

  if (sourceUsageCounts.all === 0 && videoTotal === 0) {
    const emptyDetail = selectedAccount
      ? `${selectedAccount.handleDisplay} is tracked, but there are no recent videos cached yet. Refresh the creator or open the profile on TikTok.`
      : "Tracked creators are present, but no videos are cached yet.";
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[8px] border border-dashed border-[var(--pf-border)] bg-[var(--pf-surface)] px-6 py-14 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-[8px] bg-[var(--pf-success)]/10 text-[var(--pf-success)]">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="pf-section-title">No cached videos yet</h2>
        <p className="mt-2 min-w-0 max-w-md break-words text-[13px] text-[var(--pf-muted)] [overflow-wrap:anywhere]">
          {emptyDetail}
        </p>
        {selectedAccount?.profileUrl ? (
          <a
            href={selectedAccount.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="pf-button-secondary mt-5 h-9 px-3 text-[13px]"
          >
            Open Profile
            <ExternalLink className="size-4 shrink-0" />
          </a>
        ) : null}
      </div>
    );
  }

  if (videoItems.length === 0) {
    const emptyCopy = emptyLibraryCopy(sourceSearch, sourceFeedFilter);
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[8px] border border-dashed border-[var(--pf-border)] bg-[var(--pf-surface)] px-6 py-14 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-[8px] bg-[var(--pf-active)] text-[var(--pf-muted)]">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="pf-section-title">{emptyCopy.title}</h2>
        <p className="mt-2 max-w-md text-[13px] text-[var(--pf-muted)]">
          {emptyCopy.description}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid max-h-[440px] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2",
        compactGrid
          ? "lg:grid-cols-4 2xl:grid-cols-5"
          : "lg:grid-cols-3 2xl:grid-cols-4"
      )}
    >
      {videoItems.map((video) => (
        <InspirationVideoCard
          key={video.id}
          video={video}
          workspace={workspace}
        />
      ))}
    </div>
  );
}
