"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  FileSpreadsheet,
  Grid2X2,
  List,
  Search,
} from "lucide-react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import { formatDate, formatMetric } from "@/lib/performance/format";
import {
  accountHandle,
  postEngagementRate,
  type PerformancePostView,
} from "@/lib/performance/metrics";
import { cn } from "@/lib/utils";
import { performanceVariant, POSTS_COLUMN_HEADERS } from "./performance-helpers";
import type { PerformancePostsModel } from "./types";

export function PerformancePosts({ model }: { model: PerformancePostsModel }) {
  const { posts, view, search, youtubeRawOnly, tableFrameClassName, onSearch, onView } =
    model;
  const headers = POSTS_COLUMN_HEADERS[performanceVariant(youtubeRawOnly)];

  return (
    <section className="pf-card mt-3 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="pf-section-title">What is working</h2>
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          <label className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-2">
            <Search className="size-3 text-[var(--pf-muted)]" />
            <span className="sr-only">Search posts</span>
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--pf-ink)] outline-none sm:w-28"
              placeholder="Search posts"
            />
          </label>
          <div
            className="hidden rounded-[8px] bg-[var(--pf-active)] p-1 sm:flex"
            aria-label="Performance post layout"
          >
            <button
              type="button"
              aria-label="Table view"
              aria-pressed={view === "table"}
              onClick={() => onView("table")}
              className={cn(
                "grid size-6 place-items-center rounded-[6px] text-[var(--pf-muted)] transition-colors duration-[180ms]",
                view === "table" &&
                  "bg-[var(--pf-surface)] text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
              )}
            >
              <List className="size-3" />
            </button>
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => onView("grid")}
              className={cn(
                "grid size-6 place-items-center rounded-[6px] text-[var(--pf-muted)] transition-colors duration-[180ms]",
                view === "grid" &&
                  "bg-[var(--pf-surface)] text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
              )}
            >
              <Grid2X2 className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="grid min-h-52 place-items-center text-center">
          <div>
            <Search className="mx-auto size-6 text-[var(--pf-muted)]" />
            <p className="mt-2 text-[12px] text-[var(--pf-muted)]">
              No posts match this source, date range, and search.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:hidden">
            {posts.map((post, index) => (
              <PerformanceGridCard
                key={post.id}
                post={post}
                index={index}
                youtubeRawOnly={youtubeRawOnly}
              />
            ))}
          </div>
          {view === "table" ? (
            <div className={tableFrameClassName}>
              <div className="min-w-[700px]">
                <div className="hidden grid-cols-[2fr_.75fr_.7fr_.8fr_.7fr] gap-3 border-b border-[var(--pf-border)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)] md:grid">
                  <span>Post</span>
                  <span>Published</span>
                  <span>Views</span>
                  <span>{headers.engagement}</span>
                  <span>{headers.trailing}</span>
                </div>
                <div className="divide-y divide-[var(--pf-border)]">
                  {posts.map((post, index) => (
                    <PerformanceTableRow
                      key={post.id}
                      post={post}
                      index={index}
                      youtubeRawOnly={youtubeRawOnly}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-4">
              {posts.map((post, index) => (
                <PerformanceGridCard
                  key={post.id}
                  post={post}
                  index={index}
                  youtubeRawOnly={youtubeRawOnly}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PerformanceTableRow({
  post,
  index,
  youtubeRawOnly,
}: {
  post: PerformancePostView;
  index: number;
  youtubeRawOnly: boolean;
}) {
  const rate = youtubeRawOnly ? null : postEngagementRate(post);
  return (
    <article className="grid min-h-16 grid-cols-[2fr_.75fr_.7fr_.8fr_.7fr] items-center gap-3 px-4 py-3 text-[12px] text-[var(--pf-muted)] transition-colors duration-[180ms] hover:bg-[var(--pf-active)]">
      <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3">
        <PostThumbnail post={post} index={index} compact />
        <div className="min-w-0">
          <b className="block truncate text-[13px] font-semibold text-[var(--pf-ink)]">
            {post.title}
          </b>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--pf-muted)]">
            {post.provider ? (
              <SocialProviderIcon provider={post.provider} className="size-3" />
            ) : null}
            {post.provider ? accountHandle(post.accountUsername) : "Local CSV"}
            {post.permalink ? (
              <Link
                href={post.permalink}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${post.title}`}
              >
                <ExternalLink className="size-2.5" />
              </Link>
            ) : null}
          </span>
        </div>
      </div>
      <span>{formatDate(post.publishedAt)}</span>
      <b
        className={cn(
          "tabular-nums text-[var(--pf-ink)]",
          post.metrics.views === null && "font-normal text-[var(--pf-muted)]"
        )}
      >
        {formatMetric(post.metrics.views)}
      </b>
      <span
        className={cn(
          "tabular-nums",
          likesOrRateUnavailable(youtubeRawOnly, post.metrics.likes, rate) &&
            "text-[var(--pf-muted)]"
        )}
      >
        {likesOrRateLabel(youtubeRawOnly, post.metrics.likes, rate)}
      </span>
      <span
        className={cn(
          "tabular-nums",
          (youtubeRawOnly ? post.metrics.comments : post.metrics.saves) ===
            null && "text-[var(--pf-muted)]"
        )}
      >
        {formatMetric(
          youtubeRawOnly ? post.metrics.comments : post.metrics.saves
        )}
      </span>
    </article>
  );
}

function PerformanceGridCard({
  post,
  index,
  youtubeRawOnly,
}: {
  post: PerformancePostView;
  index: number;
  youtubeRawOnly: boolean;
}) {
  return (
    <article className="rounded-[8px] border border-[var(--pf-border)] p-2">
      <PostThumbnail post={post} index={index} />
      <div className="mt-2 flex items-center gap-1">
        {post.provider ? (
          <SocialProviderIcon provider={post.provider} className="size-3.5" />
        ) : null}
        <span className="truncate text-[11px] text-[var(--pf-muted)]">
          {post.provider ? accountHandle(post.accountUsername) : "Local CSV"}
        </span>
      </div>
      <h3 className="mt-1.5 truncate text-[13px] font-semibold text-[var(--pf-ink)]">
        {post.title}
      </h3>
      <p className="mt-1 text-[11px] text-[var(--pf-muted)]">
        {youtubeRawOnly
          ? `${formatMetric(post.metrics.views)} views · ${formatMetric(post.metrics.likes)} likes · ${formatMetric(post.metrics.comments)} comments`
          : `${formatMetric(post.metrics.views)} views · ${formatMetric(post.metrics.saves)} saves`}
      </p>
      {post.permalink ? (
        <Link
          href={post.permalink}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--pf-link)]"
        >
          Open post <ExternalLink className="size-2.5" />
        </Link>
      ) : null}
    </article>
  );
}

function PostThumbnail({
  post,
  index,
  compact = false,
}: {
  post: PerformancePostView;
  index: number;
  compact?: boolean;
}) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const showThumbnail = Boolean(post.thumbnailUrl) && !thumbnailFailed;
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] text-[var(--pf-muted)]",
        compact ? "size-10" : "h-32 w-full"
      )}
    >
      {showThumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img>
          src={post.thumbnailUrl ?? undefined}
          alt={`Thumbnail for ${post.title}`}
          onError={() => setThumbnailFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <ThumbnailFallback post={post} index={index} compact={compact} />
      )}
    </span>
  );
}

function likesOrRateUnavailable(
  youtubeRawOnly: boolean,
  likes: number | null,
  rate: number | null
) {
  return (youtubeRawOnly ? likes : rate) === null;
}

function likesOrRateLabel(
  youtubeRawOnly: boolean,
  likes: number | null,
  rate: number | null
) {
  if (youtubeRawOnly) return formatMetric(likes);
  if (rate === null) return "—";
  return `${rate.toFixed(1)}%`;
}

function ThumbnailFallback({
  post,
  index,
  compact,
}: {
  post: PerformancePostView;
  index: number;
  compact: boolean;
}) {
  if (post.provider) {
    return (
      <SocialProviderIcon
        provider={post.provider}
        className={compact ? "size-4" : "size-7"}
      />
    );
  }
  if (compact) return `0${index + 1}`;
  return <FileSpreadsheet className="size-6" />;
}
