"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Icon } from "@/components/workbench/icon";
import { Segmented } from "@/components/workbench/segmented";
import { Skeleton } from "@/components/workbench/skeleton";
import { cn } from "@/lib/utils";
import {
  INSPIRATION_VIDEO_PAGE_SIZE,
  parseInspirationSourceSort,
  type InspirationSourceFeedFilter,
} from "@/lib/inspiration/types";
import {
  emptyLibraryTitle,
  SOURCE_FEED_FILTERS,
  TRACK_CREATOR_INPUT_ID,
} from "./inspiration-models";
import { InspirationVideoCard, TILE_ASPECT_CLASS } from "./inspiration-video-card";
import type { InspirationWorkspace } from "./types";

export function InspirationSourceLibrary({
  workspace,
  loadFailed,
}: {
  workspace: InspirationWorkspace;
  loadFailed: boolean;
}) {
  const {
    videoItems,
    videoCursor,
    videoHasMore,
    videoTotal,
    isLoadingMore,
    remainingVideoCount,
    handleLoadMore,
  } = workspace;

  return (
    <section
      aria-labelledby="source-library-heading"
      className="wb-panel @container min-w-0 flex-1 gap-3.5 p-4 max-sm:gap-3 sm:p-5"
    >
      <h2 id="source-library-heading" className="sr-only">
        Source library
      </h2>
      <LibraryToolbar workspace={workspace} />
      <LibraryBody workspace={workspace} loadFailed={loadFailed} />
      {videoHasMore && videoItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <span className="wb-mono text-fg-muted">
            {videoItems.length} / {videoTotal}
          </span>
          <button
            type="button"
            onClick={() => void handleLoadMore()}
            disabled={isLoadingMore || !videoCursor}
            data-inspiration-load-more="true"
            className={buttonClass("quiet", 36)}
          >
            {isLoadingMore
              ? "Loading"
              : `Load ${Math.min(INSPIRATION_VIDEO_PAGE_SIZE, remainingVideoCount)} more`}
          </button>
        </div>
      )}
    </section>
  );
}

function LibraryToolbar({ workspace }: { workspace: InspirationWorkspace }) {
  const {
    sourceFeedFilter,
    setSourceFeedFilter,
    sourceSearch,
    setSourceSearch,
    sourceSort,
    setSourceSort,
    largeTiles,
    setLargeTiles,
    sourceUsageCounts,
  } = workspace;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 @max-[440px]:gap-y-3">
      <Segmented<InspirationSourceFeedFilter>
        label="Source usage filter"
        value={sourceFeedFilter}
        onChange={setSourceFeedFilter}
        className="max-w-full shrink-0 overflow-x-auto"
        options={SOURCE_FEED_FILTERS.map((filter) => ({
          value: filter.value,
          label: (
            <span data-source-feed-filter={filter.value} className="contents">
              {filter.label}
              {filter.value === "unused" && sourceUsageCounts.unused > 0 ? (
                <span className="-mr-1.5 inline-flex h-[18px] min-w-5 items-center justify-center rounded-full bg-raised-strong px-1.5 text-[11px] leading-[14px] font-semibold text-fg">
                  {sourceUsageCounts.unused}
                </span>
              ) : null}
            </span>
          ),
        }))}
      />
      <label className="wb-input-wrap min-w-[208px] flex-1" data-size="36">
        <Icon name="search" size={15} />
        <input
          value={sourceSearch}
          onChange={(event) => setSourceSearch(event.target.value)}
          placeholder="Search captions or creators"
          aria-label="Search source library"
          type="search"
          className="text-ellipsis"
        />
      </label>
      <div className={SORT_WRAP_CLASS}>
        <span aria-hidden="true" className="@max-[440px]:hidden">
          {SORT_LABEL[sourceSort]}
        </span>
        <span aria-hidden="true" className="hidden @max-[440px]:inline">
          {SORT_SHORT_LABEL[sourceSort]}
        </span>
        <select
          value={sourceSort}
          onChange={(event) => setSourceSort(parseInspirationSourceSort(event.target.value))}
          aria-label="Sort source library"
          className={SORT_SELECT_CLASS}
        >
          {SORT_VALUES.map((value) => (
            <option key={value} value={value}>
              {SORT_LABEL[value]}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={14}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg @max-[440px]:hidden"
        />
      </div>
      <Segmented<"dense" | "large">
        label="Tile size"
        value={largeTiles ? "large" : "dense"}
        onChange={(value) => setLargeTiles(value === "large")}
        // Below 440px both sizes draw the same two columns, so the toggle has nothing to change.
        className="shrink-0 @max-[440px]:hidden [&_.wb-segment]:w-8"
        options={[
          { value: "dense", label: <ColumnsGlyph count={3} />, ariaLabel: "Small tiles" },
          { value: "large", label: <ColumnsGlyph count={2} />, ariaLabel: "Large tiles" },
        ]}
      />
    </div>
  );
}

/*
 * The sort is a drawn pill with the native select lying over it, invisible. The select owns the tap,
 * the keyboard and the focus ring, and on touch it reaches 4px past the pill on both sides, a 44px
 * target. Below 440px the pill is Paper's short one ("Newest", no chevron) so the search keeps its row.
 * The search never goes below 208px, the width its placeholder needs; on a 320px phone the pill
 * takes the next row instead.
 */
const SORT_WRAP_CLASS = [
  "relative flex h-9 shrink-0 items-center rounded-full bg-raised pr-8 pl-3.5 text-[13px] leading-4 font-semibold text-fg",
  "transition-[background-color,box-shadow] duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong",
  "has-[:focus-visible]:shadow-[inset_0_0_0_2px_var(--pf-ember)] @max-[440px]:pr-3",
].join(" ");

const SORT_SELECT_CLASS =
  "absolute inset-0 size-full cursor-pointer appearance-none opacity-0 pointer-coarse:-inset-y-1 pointer-coarse:h-auto";

const SORT_VALUES = ["recent", "views", "engagement"] as const;

const SORT_LABEL = {
  recent: "Newest first",
  views: "Most viewed",
  engagement: "Most engagement",
} as const;

const SORT_SHORT_LABEL = { ...SORT_LABEL, recent: "Newest" } as const;

const GRID_DENSE =
  "grid-cols-2 @[440px]:grid-cols-3 @[580px]:grid-cols-4 @[680px]:grid-cols-5 @[800px]:grid-cols-6";
const GRID_LARGE =
  "grid-cols-1 @[300px]:grid-cols-2 @[580px]:grid-cols-3 @[800px]:grid-cols-4";

function LibraryBody({
  workspace,
  loadFailed,
}: {
  workspace: InspirationWorkspace;
  loadFailed: boolean;
}) {
  const {
    accounts,
    selectedAccount,
    sourceFeedFilter,
    sourceSearch,
    setSourceSearch,
    largeTiles,
    videoItems,
    videoTotal,
    sourceUsageCounts,
    isLoadingVideos,
    pageError,
    reloadVideos,
  } = workspace;
  const gridClass = cn("grid gap-x-3 gap-y-3.5", largeTiles ? GRID_LARGE : GRID_DENSE);

  if (accounts.length === 0) {
    return (
      <EmptyState icon="inspiration" title="No creators tracked yet" className="min-h-[320px] flex-none">
        <Button
          variant="strong"
          onClick={() => document.getElementById(TRACK_CREATOR_INPUT_ID)?.focus()}
        >
          Track creator
        </Button>
        <Link href="/ugc-clone" className={buttonClass("quiet", 36)}>
          Start clone
        </Link>
      </EmptyState>
    );
  }

  if (isLoadingVideos && videoItems.length === 0) {
    return (
      <div className={gridClass} aria-busy="true" aria-label="Loading sources">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="wb-tile-cell">
            <Skeleton shape="tile" className={largeTiles ? "aspect-[9/16]" : TILE_ASPECT_CLASS} />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-[30px] rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (loadFailed) {
    return (
      <EmptyState
        icon="exclamation"
        tone="error"
        title="Sources did not load"
        detail={pageError ?? undefined}
        className="min-h-[320px] flex-none"
      >
        <Button variant="strong" onClick={reloadVideos}>
          Try again
        </Button>
      </EmptyState>
    );
  }

  if (sourceUsageCounts.all === 0 && videoTotal === 0) {
    return (
      <EmptyState
        icon="clock"
        title={
          selectedAccount
            ? `No cached posts for ${selectedAccount.handleDisplay} yet`
            : "No cached posts yet"
        }
        className="min-h-[320px] flex-none"
      >
        {selectedAccount?.profileUrl ? (
          <a
            href={selectedAccount.profileUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("strong", 36)}
          >
            Open profile
          </a>
        ) : null}
      </EmptyState>
    );
  }

  if (videoItems.length === 0) {
    return (
      <EmptyState
        icon={sourceSearch.trim() ? "search" : "check"}
        title={emptyLibraryTitle(sourceSearch, sourceFeedFilter)}
        className="min-h-[320px] flex-none"
      >
        {sourceSearch.trim() ? (
          <Button variant="strong" onClick={() => setSourceSearch("")}>
            Clear search
          </Button>
        ) : null}
      </EmptyState>
    );
  }

  return (
    <div className={cn(gridClass, "wb-fade-in")}>
      {videoItems.map((video) => (
        <InspirationVideoCard key={video.id} video={video} workspace={workspace} />
      ))}
    </div>
  );
}

function ColumnsGlyph({ count }: { count: 2 | 3 }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-[15px]">
      {count === 3 ? (
        <>
          <rect x="4" y="4" width="4" height="16" rx="1" />
          <rect x="10" y="4" width="4" height="16" rx="1" />
          <rect x="16" y="4" width="4" height="16" rx="1" />
        </>
      ) : (
        <>
          <rect x="4" y="4" width="7" height="16" rx="1.5" />
          <rect x="13" y="4" width="7" height="16" rx="1.5" />
        </>
      )}
    </svg>
  );
}
