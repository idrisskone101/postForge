"use client";

import { useMemo, useState } from "react";
import { Archive, ArrowRight, LoaderCircle, Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  CARD,
  CARD_HOVER,
  INPUT,
  PREVIEW_ASPECT,
} from "./studio-ui";
import type { SlideshowProject } from "./types";
import type { StudioHomeView } from "./view-models";

export function DraftsView({ home }: { home: StudioHomeView }) {
  const {
    projects,
    loadingProjects: loading,
    projectsError: error,
    onOpenDraft: onOpen,
    onCreate,
  } = home;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: projects.length };
    projects.forEach((project) => {
      base[project.status] = (base[project.status] ?? 0) + 1;
    });
    return base;
  }, [projects]);

  const visible = projects.filter((project) => {
    const matchesQuery = project.title.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || project.status === status;
    return matchesQuery && matchesStatus;
  });

  const statusFilters: Array<{ id: string; label: string }> = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "ready", label: "Ready" },
    { id: "generating", label: "Generating" },
    { id: "failed", label: "Failed" },
  ];

  return (
    <div className="animate-content-enter">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[230px] flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search drafts"
            className={cn(INPUT, "h-9 pl-9")}
          />
        </div>
        <div className="flex rounded-lg bg-[var(--pf-active)] p-1" role="tablist" aria-label="Filter drafts by status">
          {statusFilters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={status === id}
              onClick={() => setStatus(id)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-all",
                status === id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  status === id ? "text-[var(--pf-orange)]" : "text-muted-foreground",
                )}
              >
                {counts[id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-[6px] bg-destructive/10 p-4 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={cn(CARD, "overflow-hidden")}>
              <div className="grid grid-cols-3 gap-1 p-3 pb-0">
                {Array.from({ length: 3 }).map((_, cell) => (
                  <div key={cell} className="aspect-[9/16] animate-pulse rounded-lg bg-[var(--pf-active)]" />
                ))}
              </div>
              <div className="space-y-2 p-4">
                <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--pf-active)]" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-[var(--pf-active)]" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <article key={project.id} className={cn(CARD, CARD_HOVER, "overflow-hidden")}>
              <button
                type="button"
                onClick={() => onOpen(project)}
                className="block w-full text-left"
                aria-label={`Open ${project.title}`}
              >
                <div className="grid grid-cols-3 gap-1 p-3 pb-0">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className={cn("relative overflow-hidden rounded-lg bg-[var(--pf-active)]", PREVIEW_ASPECT[project.aspectRatio] ?? "aspect-[9/16]")}>
                      {project.previewImageUrls[index] ? <img src={project.previewImageUrls[index] ?? ""} alt="" className="size-full object-cover" /> : null}
                      {index === 0 ? <span className="absolute left-1 top-1 z-10 rounded-full bg-black/45 px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.08em] text-white/90">{project.slideCount} slides</span> : null}
                    </div>
                  ))}
                </div>
              </button>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <ProjectStatusPill status={project.status} />
                  {project.successfulExportCount ? (
                    <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                      {project.successfulExportCount} export{project.successfulExportCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2.5 line-clamp-2 text-[13px] font-semibold leading-[1.3] text-foreground">
                  {project.title}
                </p>
                {project.status === "generating" ? (
                  <div className="mt-3">
                    <div className="h-1 overflow-hidden rounded-full bg-[var(--pf-active)]">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-blue" />
                    </div>
                    <p className="mt-1.5 text-[12px] text-muted-foreground">
                      Rendering slide visuals. This draft updates when the jobs finish.
                    </p>
                  </div>
                ) : null}
                {project.status === "failed" ? (
                  <div className="mt-3 rounded-lg bg-destructive/10 p-2.5">
                    <p className="text-[12px] leading-4 text-destructive">
                      An image job failed while rendering this draft. Open it to retry the failed slide.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpen(project)}
                      className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-lg bg-destructive px-2.5 text-[12px] font-bold text-white transition hover:brightness-105 active:scale-[0.97]"
                    >
                      Open to retry
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[12px] text-muted-foreground">
                    Updated {new Date(project.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpen(project)}
                    className="flex items-center gap-1 text-[13px] font-semibold text-foreground transition hover:text-[var(--pf-orange)]"
                  >
                    Open
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="pf-empty-stage relative mt-5 grid min-h-[320px] place-items-center overflow-hidden rounded-lg border border-dashed border-[var(--pf-border-strong)] p-8 text-center">
          <div className="relative">
            <span className="mx-auto grid size-11 place-items-center rounded-[6px] bg-white text-muted-foreground shadow-[var(--pf-shadow-2xs)]">
              <Archive className="size-5" />
            </span>
            <p className="mt-4 text-[13px] font-semibold text-foreground">
              {projects.length ? "No drafts match these filters" : "No slideshow drafts yet"}
            </p>
            <p className="mx-auto mt-1.5 max-w-[300px] text-[11px] leading-4 text-muted-foreground">
              {projects.length
                ? "Clear the search or pick another status to see more drafts."
                : "Start from an idea or a format. Autosaved work appears here."}
            </p>
            {!projects.length ? (
              <button type="button" onClick={onCreate} className="pf-button-primary mt-4">
                <Plus className="size-3.5" />
                New slideshow
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}


function ProjectStatusPill({ status }: { status: SlideshowProject["status"] }) {
  const map: Record<string, { cls: string; label: string; spinning?: boolean }> = {
    ready: { cls: "bg-accent-green/10 text-accent-green", label: "Ready" },
    exported: { cls: "bg-accent-green/10 text-accent-green", label: "Exported" },
    published: { cls: "bg-accent-green/10 text-accent-green", label: "Published" },
    generating: {
      cls: "bg-accent-blue/10 text-accent-blue",
      label: "Generating",
      spinning: true,
    },
    scheduled: { cls: "bg-accent-blue/10 text-accent-blue", label: "Scheduled" },
    failed: { cls: "bg-destructive/10 text-destructive", label: "Failed" },
    archived: { cls: "bg-[var(--pf-active)] text-muted-foreground", label: "Archived" },
    draft: { cls: "bg-[var(--pf-active)] text-muted-foreground", label: "Draft" },
  };
  const { cls, label, spinning } = map[status] ?? map.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[12px] font-bold",
        cls,
      )}
    >
      {spinning ? <LoaderCircle className="size-2.5 animate-spin" /> : null}
      {label}
    </span>
  );
}