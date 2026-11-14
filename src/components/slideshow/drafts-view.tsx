"use client";

import { useState } from "react";

import { Button } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Icon } from "@/components/workbench/icon";
import { Skeleton } from "@/components/workbench/skeleton";

import { DraftCell } from "./draft-cell";
import { useSlideshowHome } from "./slideshow-home-provider";

export function DraftsView() {
  const {
    projects,
    loadingProjects: loading,
    projectsError: error,
    onOpenDraft: onOpen,
    onCreate,
    draftPages,
  } = useSlideshowHome();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const serverCounts = loading || error ? null : draftPages.statusCounts;
  const counts: Record<string, number> | null =
    serverCounts && draftPages.total !== null
      ? { ...serverCounts, all: draftPages.total }
      : null;

  const visible = projects.filter((project) => {
    const matchesQuery = project.title.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || project.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <section
      aria-label="Slideshow drafts"
      className="wb-panel @container gap-5 px-4 pb-6 pt-[18px] sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="wb-input-wrap w-full sm:w-[300px]" data-size="36">
          <Icon name="search" size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search drafts"
            aria-label="Search drafts"
          />
        </label>
        <div role="tablist" aria-label="Filter drafts by status" className="wb-segmented">
          {STATUS_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={status === id}
              onClick={() => setStatus(id)}
              className="wb-segment"
            >
              {label}
              {counts ? (
                <span className="text-[12px] font-semibold tabular-nums text-fg-muted">
                  {counts[id] ?? 0}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="wb-notice" data-tone="bad">
          <strong>Drafts could not load.</strong> {error}
        </p>
      ) : null}

      {loading && !projects.length ? (
        <div className={GRID} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3.5">
              <div className="flex shrink-0 gap-1">
                {[0, 1, 2].map((cell) => (
                  <Skeleton key={cell} shape="tile" className="h-[76px] w-[60px]" />
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length ? (
        <div className={`${GRID} wb-fade-in`}>
          {visible.map((project) => (
            <DraftCell key={project.id} project={project} onOpen={onOpen} />
          ))}
        </div>
      ) : projects.length ? (
        <EmptyState icon="search" title="No drafts match">
          <Button
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
          >
            Clear filters
          </Button>
        </EmptyState>
      ) : error ? null : (
        <EmptyState icon="slideshow" title="No slideshow drafts yet">
          <Button variant="strong" onClick={onCreate}>
            New slideshow
          </Button>
        </EmptyState>
      )}
      {draftPages.hasMore ? (
        <div className="flex items-center justify-center gap-3">
          <Button disabled={draftPages.loadingMore} onClick={() => void draftPages.onLoadMore()}>
            {draftPages.loadingMore ? "Loading" : "Load more"}
          </Button>
          <span className="wb-mono text-fg-muted" aria-label="Drafts loaded">
            {draftPages.total === null
              ? draftPages.loaded
              : `${draftPages.loaded} / ${draftPages.total}`}
          </span>
        </div>
      ) : null}
    </section>
  );
}

const GRID = "grid grid-cols-1 gap-x-4 gap-y-5 lg:grid-cols-2 @[1034px]:grid-cols-3";

const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "ready", label: "Ready" },
  { id: "generating", label: "Generating" },
  { id: "failed", label: "Failed" },
];
