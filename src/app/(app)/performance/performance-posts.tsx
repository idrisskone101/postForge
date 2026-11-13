"use client";

import { useState, type ReactNode } from "react";
import { BrowserLocalText } from "@/components/browser-local-text";
import { Button } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Icon } from "@/components/workbench/icon";
import { Panel } from "@/components/workbench/panel";
import { Segmented } from "@/components/workbench/segmented";
import type { PerformancePostView } from "@/lib/performance/metrics";
import { cn } from "@/lib/utils";
import { metricText, postSubline, shortDate } from "./performance-helpers";
import type { PerformancePostsModel, PerformancePostsView } from "./types";

export function PerformancePosts({ model }: { model: PerformancePostsModel }) {
  const { posts, view, search, onSearch, onView } = model;
  return (
    <Panel pad="none" className="min-w-0 gap-0 p-5 max-md:p-4" aria-labelledby="performance-posts-title">
      <div className="flex flex-wrap items-center gap-3 pb-3">
        <h2 id="performance-posts-title" className="wb-panel-title min-w-0 flex-1">
          Top posts
        </h2>
        <label className="wb-input-wrap w-[240px] rounded-full px-3 max-md:order-last max-md:w-full" data-size="36">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search posts"
            aria-label="Search posts"
          />
        </label>
        <Segmented
          label="Post layout"
          value={view}
          onChange={onView}
          options={VIEW_OPTIONS}
          className="h-9 p-[3px] max-md:hidden"
        />
      </div>
      {posts.length === 0 ? <PostsEmpty model={model} /> : null}
      {posts.length > 0 ? (
        <PostsTable model={model} className={view === "grid" ? "md:hidden" : undefined} />
      ) : null}
      {posts.length > 0 && view === "grid" ? <PostsGrid model={model} /> : null}
    </Panel>
  );
}

function PostsEmpty({ model }: { model: PerformancePostsModel }) {
  if (model.search.trim()) {
    return (
      <EmptyState icon="search" title="No posts match this search" className="min-h-60">
        <Button variant="strong" onClick={() => model.onSearch("")}>
          Clear search
        </Button>
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="performance" title={`No posts in the last ${model.range} days`} className="min-h-60">
      {model.range < 90 ? (
        <Button variant="strong" onClick={() => model.onRange(90)}>
          Show 90 days
        </Button>
      ) : null}
    </EmptyState>
  );
}

function PostsTable({ model, className }: { model: PerformancePostsModel; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="wb-table-head max-md:hidden" aria-hidden="true">
        <span className="min-w-0 flex-1">Post</span>
        <span className="w-[76px] shrink-0">Published</span>
        {METRIC_COLUMNS.map((column) => (
          <span
            key={column.key}
            className={cn("shrink-0 text-right", column.width, column.wide && "max-lg:hidden")}
          >
            {column.label}
          </span>
        ))}
      </div>
      <ul className="flex min-w-0 flex-col">
        {model.posts.map((post) => (
          <PostRow key={post.id} post={post} />
        ))}
      </ul>
    </div>
  );
}

function PostRow({ post }: { post: PerformancePostView }) {
  return (
    <li className="wb-row min-h-14 transition-[background-color] duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised/60 max-md:gap-3 max-md:px-0 md:h-14">
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <PostThumb post={post} className="size-9" />
        <span className="flex min-w-0 flex-col">
          <PostTitle post={post} />
          <span className="truncate text-[12px] leading-4 text-fg-muted">
            {postSubline(post)}
            <BrowserLocalText className="md:hidden">{` - ${shortDate(post.publishedAt)}`}</BrowserLocalText>
          </span>
        </span>
      </span>
      <BrowserLocalText className="wb-mono w-[76px] shrink-0 whitespace-nowrap text-fg-secondary max-md:hidden">
        {shortDate(post.publishedAt)}
      </BrowserLocalText>
      {METRIC_COLUMNS.map((column) => {
        const value = post.metrics[column.key];
        return (
          <span
            key={column.key}
            className={cn(
              "wb-mono shrink-0 whitespace-nowrap text-right",
              column.width,
              column.strong && "font-semibold",
              value === null ? "text-fg-muted" : "text-fg",
              column.wide && "max-lg:hidden",
              !column.strong && "max-md:hidden",
              column.strong && "max-md:w-auto",
            )}
          >
            {metricText(value)}
          </span>
        );
      })}
    </li>
  );
}

function PostTitle({ post }: { post: PerformancePostView }) {
  const className = "truncate text-[14px] font-semibold leading-[19px] text-fg";
  if (!post.permalink) return <span className={className}>{post.title}</span>;
  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noreferrer"
      className={cn(className, "rounded-sm underline-offset-[3px] hover:underline")}
    >
      {post.title}
    </a>
  );
}

function PostsGrid({ model }: { model: PerformancePostsModel }) {
  return (
    <ul className="grid grid-cols-3 gap-3 max-md:hidden xl:grid-cols-5">
      {model.posts.map((post) => (
        <li key={post.id} className="wb-tile-cell min-w-0">
          <PostThumb post={post} className="h-[236px] w-full max-xl:h-[200px]" />
          <span className="flex min-w-0 flex-col">
            <PostTitle post={post} />
            <span className="wb-tile-meta truncate">
              {tileMeta(post, model.youtubeRawOnly)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function PostThumb({ post, className }: { post: PerformancePostView; className: string }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : post.thumbnailUrl;
  return (
    <span
      className={cn(
        "block shrink-0 overflow-hidden rounded-lg bg-media",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- provider-hosted thumbnail on a third-party CDN
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : null}
    </span>
  );
}

const VIEW_OPTIONS = [
  { value: "table", label: <Icon name="list" size={16} />, ariaLabel: "Table view" },
  { value: "grid", label: <Icon name="grid" size={16} />, ariaLabel: "Grid view" },
] as const satisfies readonly { value: PerformancePostsView; label: ReactNode; ariaLabel: string }[];

const METRIC_COLUMNS = [
  { key: "views", label: "Views", width: "w-[72px]", strong: true, wide: false },
  { key: "likes", label: "Likes", width: "w-[72px]", strong: false, wide: false },
  { key: "comments", label: "Comments", width: "w-[84px]", strong: false, wide: false },
  { key: "shares", label: "Shares", width: "w-[92px]", strong: false, wide: true },
  { key: "saves", label: "Saves", width: "w-[92px]", strong: false, wide: true },
] as const;

function tileMeta(post: PerformancePostView, youtube: boolean) {
  const second = youtube
    ? { value: post.metrics.likes, noun: "likes" }
    : { value: post.metrics.saves, noun: "saves" };
  const views = `${metricText(post.metrics.views)} views`;
  return second.value === null ? views : `${views} - ${metricText(second.value)} ${second.noun}`;
}
