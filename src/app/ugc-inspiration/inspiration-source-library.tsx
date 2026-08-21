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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceState } from "@/components/workspace-state";
import { SOURCE_FEED_FILTERS } from "./inspiration-models";
import { InspirationVideoCard } from "./inspiration-video-card";
import type { InspirationWorkspace } from "./use-inspiration-workspace";

export function InspirationSourceLibrary({
  workspace,
}: {
  workspace: InspirationWorkspace;
}) {
  const {
    accounts,
    selectedAccount,
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
    remainingVideoCount,
    activeSourceLabel,
    activeFeedFilterLabel,
    handleLoadMore,
  } = workspace;

  return (
    <>
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
          {videoItems.map((video) => (
            <InspirationVideoCard
              key={video.id}
              video={video}
              workspace={workspace}
            />
          ))}
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
    </>
  );
}
