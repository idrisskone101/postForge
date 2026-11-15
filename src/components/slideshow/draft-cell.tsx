"use client";

import { Icon } from "@/components/workbench/icon";
import { MediaImage } from "@/components/workbench/media-image";
import { Meter } from "@/components/workbench/meter";
import { StatusChip } from "@/components/workbench/status-chip";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";

import type { SlideshowProjectListItem } from "./types";

export function DraftCell({
  project,
  onOpen,
  size = "list",
  thumbs = 3,
  className,
}: {
  project: SlideshowProjectListItem;
  onOpen: (project: SlideshowProjectListItem) => void;
  size?: "list" | "recent";
  thumbs?: number;
  className?: string;
}) {
  const status = STATUS[project.status];
  // A slide with no image yet keeps its frame, so the text column starts at the same x in every row.
  const frames: (string | null)[] = project.previewImageUrls.slice(0, Math.max(1, thumbs));
  if (frames.length === 0) frames.push(null);
  const noImages = frames.every((url) => !url);
  return (
    <button
      type="button"
      onClick={() => onOpen(project)}
      aria-label={`Open ${project.title}`}
      data-slideshow-draft={project.id}
      className={cn(
        "group flex min-w-0 items-center gap-3.5 rounded-lg text-left outline-none focus-visible:shadow-[0_0_0_2px_var(--pf-panel),0_0_0_4px_var(--pf-ember)]",
        className,
      )}
    >
      <span
        className={cn(
          "flex shrink flex-wrap gap-1 overflow-hidden",
          size === "recent" ? "h-[110px] min-w-[88px]" : "h-[76px] min-w-[60px]",
        )}
      >
        {frames.map((url, index) => (
          <span
            key={index}
            className={cn(
              "grid shrink-0 place-items-center overflow-hidden rounded-lg bg-media text-fg-muted",
              url && "transition-opacity duration-[160ms] ease-pf group-hover:opacity-85",
              size === "recent" ? "h-[110px] w-[88px]" : "h-[76px] w-[60px]",
            )}
          >
            {url ? (
              <MediaImage src={url} alt="" loading="lazy" className="size-full object-cover" />
            ) : noImages && index === 0 ? (
              <Icon name="gallery" size={20} />
            ) : null}
          </span>
        ))}
      </span>
      <span className="flex min-w-[132px] flex-1 flex-col gap-1.5">
        <span title={project.title} className="line-clamp-2 text-[14px] font-semibold leading-[18px] text-fg">
          {project.title}
        </span>
        <span className="truncate text-[13px] leading-4 text-fg-secondary">
          {project.slideCount} {project.slideCount === 1 ? "slide" : "slides"} -{" "}
          {formatRelativeDate(project.updatedAt)}
        </span>
        {status || project.successfulExportCount ? (
          <span className="flex min-w-0 items-center gap-2">
            {status ? (
              <StatusChip tone={status.tone}>
                {status.tone === "live" ? (
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-ember" />
                ) : null}
                {status.label}
              </StatusChip>
            ) : null}
            {project.status === "generating" ? (
              <Meter label="Rendering slide visuals" value={40} running className="max-w-24" />
            ) : null}
            {project.successfulExportCount ? (
              <span className="wb-mono truncate text-fg-muted">
                {project.successfulExportCount}{" "}
                {project.successfulExportCount === 1 ? "export" : "exports"}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </button>
  );
}

type ChipTone = "ok" | "warn" | "bad" | "neutral" | "live";

const STATUS: Partial<
  Record<SlideshowProjectListItem["status"], { tone: ChipTone; label: string }>
> = {
  ready: { tone: "ok", label: "Ready" },
  exported: { tone: "ok", label: "Exported" },
  published: { tone: "ok", label: "Published" },
  generating: { tone: "live", label: "Generating" },
  scheduled: { tone: "neutral", label: "Scheduled" },
  failed: { tone: "bad", label: "Image failed" },
  archived: { tone: "neutral", label: "Archived" },
};
