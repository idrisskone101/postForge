"use client";

import {
  AlertCircle,
  Clock3,
  Crop,
  Loader2,
  Maximize2,
  Plus,
  Redo2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { MediaPreview, MediaPreviewFrame } from "@/components/media-preview";
import { Button } from "@/components/ui/button";
import { humanizeGenerationFailure } from "@/lib/ai/prompt-presentation";
import {
  getGenerationStatusCopy,
  type JobDetail,
  type JobOutput,
} from "@/lib/generation-editor";
import { cn } from "@/lib/utils";
import type { JobDetailActions, JobDetailViewModel } from "./job-enhancements";

export type JobPreviewToolbarView = {
  previewZoom: number;
  cropMode: boolean;
  isFullscreen: boolean;
  isCompleted: boolean;
  featured: JobOutput | undefined;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onToggleCrop: () => void;
  onFullscreen: () => void;
};

export function JobPreviewToolbar({
  view,
}: {
  view: JobPreviewToolbarView;
}) {
  const {
    previewZoom,
    cropMode,
    isFullscreen,
    isCompleted,
    featured,
    onZoomOut,
    onZoomIn,
    onToggleCrop,
    onFullscreen,
  } = view;

  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={onZoomOut}
          disabled={previewZoom <= 50}
          className="grid size-7 place-items-center rounded-lg border border-border bg-white text-muted-foreground hover:bg-[var(--pf-active)] disabled:opacity-35"
        >
          <ZoomOut className="size-3.5" />
        </button>
        <span className="w-12 text-center text-[12px] font-semibold text-muted-foreground">
          {previewZoom}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={onZoomIn}
          disabled={previewZoom >= 150}
          className="grid size-7 place-items-center rounded-lg border border-border bg-white text-muted-foreground hover:bg-[var(--pf-active)] disabled:opacity-35"
        >
          <ZoomIn className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        {isCompleted && featured && (
          <button
            type="button"
            aria-pressed={cropMode}
            onClick={onToggleCrop}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[12px] font-semibold transition-colors",
              cropMode
                ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)] text-foreground"
                : "border-border bg-white text-muted-foreground hover:bg-[var(--pf-active)]"
            )}
          >
            <Crop className="size-3.5" /> {cropMode ? "Fit" : "Crop"}
          </button>
        )}
        <button
          type="button"
          onClick={onFullscreen}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-white px-2 text-[12px] font-semibold text-muted-foreground hover:bg-[var(--pf-active)]"
        >
          <Maximize2 className="size-3.5" />
          {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
      </div>
    </div>
  );
}

export function JobPreviewBody({
  view,
  actions,
}: {
  view: JobDetailViewModel;
  actions: JobDetailActions;
}) {
  const {
    job,
    featured,
    isActive,
    isFailed,
    isCompleted,
    isRetrying,
    cropMode,
    previewZoom,
  } = view;
  const { onRetry, onGenerateSimilar } = actions;
  const statusCopy = getGenerationStatusCopy(job.status, job.queueStage);

  return (
    <>
      {isActive && (
        <div className="flex max-w-sm flex-col items-center px-5 text-center">
          {job.status === "processing" ? (
            <Loader2 className="size-8 animate-spin text-[var(--pf-orange)]" />
          ) : (
            <span className="grid size-10 place-items-center rounded-full bg-card text-muted-foreground shadow-sm">
              <Clock3 className="size-5" />
            </span>
          )}
          <h2 className="mt-4 text-[15px] font-semibold text-foreground">
            {statusCopy.title}
          </h2>
          <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
            {statusCopy.description}
          </p>
          <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-[var(--pf-border)]">
            <span
              className={cn(
                "block h-full rounded-full bg-[var(--pf-orange)]",
                job.status === "queued" ? "w-[18%]" : "w-[64%] animate-pulse"
              )}
            />
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex w-full min-w-0 max-w-sm flex-col items-center px-5 text-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]">
            <AlertCircle className="size-5 shrink-0" />
          </span>
          <h2 className="mt-4 text-[15px] font-semibold text-foreground">
            {statusCopy.title}
          </h2>
          <p className="mt-1.5 min-w-0 break-words text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            {humanizeGenerationFailure(job.error, statusCopy.description)}
          </p>
          <Button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-4 h-9 shrink-0 rounded-lg bg-[var(--pf-orange)] px-4 text-[12px] text-white hover:brightness-[0.93]"
          >
            {isRetrying ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 shrink-0" />
            )}
            {isRetrying ? "Retrying…" : "Try again"}
          </Button>
        </div>
      )}

      {isCompleted && featured && (
        <div
          className="w-full max-w-[760px] transition-transform duration-150"
          style={{ transform: `scale(${previewZoom / 100})` }}
        >
          <MediaPreviewFrame
            type={job.type}
            src={`/api/files/${featured.id}`}
            width={featured.width ?? undefined}
            height={featured.height ?? undefined}
            alt={job.prompt}
            variant="detail"
            fill={cropMode}
            showMetadata
            className="w-full rounded-lg shadow-[var(--pf-shadow-lg)]"
          />
        </div>
      )}

      {isCompleted && !featured && (
        <div className="flex max-w-sm flex-col items-center text-center">
          <AlertCircle className="size-7 text-[var(--pf-danger)]" />
          <h2 className="mt-3 text-[13px] font-semibold">No output was returned</h2>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
            The job completed without a media file. Recreate it from the saved prompt.
          </p>
          <Button
            type="button"
            onClick={onGenerateSimilar}
            className="mt-4 h-9 rounded-lg"
          >
            <Redo2 className="size-3.5" /> Generate similar
          </Button>
        </div>
      )}
    </>
  );
}

export function JobVariationStrip({
  job,
  featured,
  onSelect,
  onNewVariation,
}: {
  job: JobDetail;
  featured: JobOutput | undefined;
  onSelect: (index: number) => void;
  onNewVariation: () => void;
}) {
  return (
    <div className="flex min-h-[92px] items-center gap-2 overflow-x-auto border-t border-border px-3 py-2.5">
      <div className="mr-1 w-20 shrink-0">
        <span className="block text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Variations
        </span>
        <strong className="mt-1 block text-[12px] font-semibold text-foreground">
          {job.outputs.length} output{job.outputs.length === 1 ? "" : "s"}
        </strong>
      </div>
      {job.outputs.map((output, index) => (
        <button
          key={output.id}
          type="button"
          aria-label={`Select variation ${index + 1}`}
          aria-pressed={featured?.id === output.id}
          onClick={() => onSelect(index)}
          className={cn(
            "relative h-[68px] w-[54px] shrink-0 overflow-hidden rounded-lg border-2 bg-[var(--pf-active)] transition-colors",
            featured?.id === output.id
              ? "border-[var(--pf-orange)]"
              : "border-transparent hover:border-[var(--pf-border-strong)]"
          )}
        >
          <MediaPreview
            type={job.type}
            src={`/api/files/${output.id}`}
            width={output.width ?? undefined}
            height={output.height ?? undefined}
            fill
            className="size-full rounded-lg"
          />
          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[12px] font-semibold text-white">
            {String(index + 1).padStart(2, "0")}
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onNewVariation}
        className="flex h-[68px] w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--pf-border-strong)] text-[13px] font-semibold text-muted-foreground hover:border-[var(--pf-orange)] hover:text-[var(--pf-orange)]"
      >
        <Plus className="size-4" /> New variation
      </button>
    </div>
  );
}
