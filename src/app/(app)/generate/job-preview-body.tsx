"use client";

import type { Ref } from "react";
import { MediaPreview, MediaPreviewFrame } from "@/components/media-preview";
import { EmptyState, Icon, Meter } from "@/components/workbench";
import { humanizeGenerationFailure } from "@/lib/ai/prompt-presentation";
import { getGenerationStatusCopy, type JobDetail, type JobOutput } from "@/lib/generation-editor";
import { cn } from "@/lib/utils";
import { JobIcon } from "./job-icons";
import { JobStatusChip } from "./job-status-badge";
import type { JobDetailViewModel, JobPreviewToolbarView } from "./job-enhancements";

export function JobStage({
  view,
  toolbar,
  stageRef,
}: {
  view: JobDetailViewModel;
  toolbar: JobPreviewToolbarView;
  stageRef: Ref<HTMLDivElement>;
}) {
  const { job, featured, isCompleted } = view;
  const hasMedia = isCompleted && Boolean(featured);
  return (
    <section
      ref={stageRef}
      aria-label="Preview"
      className="flex min-h-[420px] min-w-0 flex-1 flex-col gap-3.5 rounded-xl bg-floor p-3.5 shadow-[inset_0_0_0_1px_var(--pf-hairline)] sm:min-h-[520px] xl:min-h-0"
    >
      <div className="flex min-h-10 flex-none flex-wrap items-center justify-between gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex min-w-0">
          <JobStatusChip status={job.status} queueStage={job.queueStage} />
        </div>
        {hasMedia && (
          <div className="order-last flex w-full justify-center sm:order-none sm:w-auto">
            <JobPreviewToolbar view={toolbar} />
          </div>
        )}
        <span className="wb-mono text-right text-fg-secondary sm:col-start-3 sm:justify-self-end">
          {hasMedia && formatDimensions(featured)}
        </span>
      </div>
      <div className={`relative min-h-0 w-full flex-1 overflow-auto rounded-lg ${SCROLL_FOCUS_RING}`}>
        <JobStageBody view={view} />
      </div>
    </section>
  );
}

function JobStageBody({ view }: { view: JobDetailViewModel }) {
  const { job, featured, isActive, isFailed, isCompleted, cropMode, previewZoom } = view;
  const statusCopy = getGenerationStatusCopy(job.status, job.queueStage);

  if (isCompleted && featured) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center py-3 transition-transform duration-[var(--pf-dur-state)] ease-pf"
        style={{ transform: `scale(${previewZoom / 100})` }}
      >
        <MediaPreviewFrame
          type={job.type}
          src={`/api/files/${featured.id}`}
          width={featured.width ?? undefined}
          height={featured.height ?? undefined}
          alt={job.prompt}
          variant="detail"
          cover={cropMode}
          mediaClassName={cropMode ? undefined : "h-auto w-auto"}
          className="size-full bg-transparent [&>div]:h-full [&>div]:max-h-none [&>div]:min-h-0"
        />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <EmptyState
          icon="alert"
          tone="error"
          title="No output was returned"
          detail="The job completed without a media file. Remix it from the saved prompt."
          className="max-w-md flex-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-auto rounded-lg px-6 text-center ${SCROLL_FOCUS_RING}`}
    >
      {isFailed && (
        <span className="grid size-11 flex-none place-items-center rounded-full bg-bad-tint text-bad">
          <Icon name="x" size={20} />
        </span>
      )}
      {job.status === "queued" && (
        <span className="grid size-11 flex-none place-items-center rounded-full bg-raised text-fg-secondary">
          <Icon name="clock" size={20} />
        </span>
      )}
      <h2 className="wb-panel-title">{statusCopy.title}</h2>
      <p
        className={cn(
          "max-w-[340px] text-[13px] leading-[18px] [overflow-wrap:anywhere]",
          isFailed ? "text-fg-secondary" : "text-fg-muted"
        )}
      >
        {isFailed ? humanizeGenerationFailure(job.error, statusCopy.description) : statusCopy.description}
      </p>
      {isActive && job.status === "processing" && (
        <Meter label="Generation in progress" value={100} running className="h-1.5 w-60 flex-none" />
      )}
    </div>
  );
}

/** A scroll region can take keyboard focus, so it draws the same ember ring as a control, inside its edge. */
export const SCROLL_FOCUS_RING =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ember";

function formatDimensions(output: JobOutput | undefined) {
  return output?.width && output.height ? `${output.width} x ${output.height}` : null;
}

function JobPreviewToolbar({ view }: { view: JobPreviewToolbarView }) {
  const { previewZoom, cropMode, isFullscreen, onZoomOut, onZoomIn, onToggleCrop, onFullscreen } = view;
  const tool =
    "inline-flex h-8 flex-none items-center justify-center rounded-full text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong disabled:cursor-not-allowed disabled:text-fg-disabled disabled:hover:bg-transparent aria-pressed:bg-panel aria-pressed:shadow-[0_1px_2px_rgb(0_0_0/0.08)] dark:aria-pressed:bg-strong dark:aria-pressed:shadow-none";
  return (
    <div role="toolbar" aria-label="Preview controls" className="flex h-10 items-center gap-0.5 rounded-[var(--pf-radius-pill)] bg-raised px-1.5">
      <button type="button" aria-label="Zoom out" onClick={onZoomOut} disabled={previewZoom <= 50} className={cn(tool, "w-[34px]")}>
        <JobIcon name="zoom-out" />
      </button>
      <span className="wb-mono w-10 flex-none text-center text-fg" aria-live="polite">
        {previewZoom}%
      </span>
      <button type="button" aria-label="Zoom in" onClick={onZoomIn} disabled={previewZoom >= 150} className={cn(tool, "w-[34px]")}>
        <JobIcon name="zoom-in" />
      </button>
      <span aria-hidden="true" className="h-[18px] w-px flex-none bg-edge" />
      <button
        type="button"
        aria-pressed={!cropMode}
        onClick={() => cropMode && onToggleCrop()}
        className={cn(tool, "px-3 text-[13px] font-semibold leading-4")}
      >
        Fit
      </button>
      <button
        type="button"
        aria-pressed={cropMode}
        onClick={() => !cropMode && onToggleCrop()}
        className={cn(tool, "gap-1.5 px-2.5 text-[13px] font-semibold leading-4")}
      >
        <JobIcon name="crop" />
        Crop
      </button>
      <button
        type="button"
        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        aria-pressed={isFullscreen}
        onClick={onFullscreen}
        className={cn(tool, "w-[34px]")}
      >
        <JobIcon name="fullscreen" />
      </button>
    </div>
  );
}

export function JobVariationStrip({
  job,
  featured,
  onSelect,
}: {
  job: JobDetail;
  featured: JobOutput | undefined;
  onSelect: (index: number) => void;
}) {
  const position = job.outputs.findIndex((output) => output.id === featured?.id) + 1;
  return (
    <section aria-label="Variations" className="wb-panel flex-none gap-3 p-5">
      <div className="flex h-8 items-center gap-2.5">
        <h2 className="wb-panel-title">Variations</h2>
        <span className="font-mono text-[12px] leading-[18px] text-fg-muted">
          {position} / {job.outputs.length}
        </span>
      </div>
      <div className="-m-1 flex gap-3 overflow-x-auto p-1">
        {job.outputs.map((output, index) => {
          const selected = featured?.id === output.id;
          return (
            <button
              key={output.id}
              type="button"
              aria-label={`Select variation ${index + 1}`}
              aria-pressed={selected}
              onClick={() => onSelect(index)}
              className="relative h-[65px] w-[52px] flex-none rounded-lg bg-media transition-shadow duration-[var(--pf-dur-feedback)] ease-pf hover:shadow-[0_0_0_2px_var(--pf-panel),0_0_0_4px_var(--pf-outline)] aria-pressed:shadow-[0_0_0_2px_var(--pf-panel),0_0_0_4px_var(--pf-ember)]"
            >
              <MediaPreview
                type={job.type}
                src={`/api/files/${output.id}`}
                width={output.width ?? undefined}
                height={output.height ?? undefined}
                cover
                className="size-full rounded-lg bg-transparent"
              />
              {selected && (
                <span className="absolute left-1 top-1 grid size-[18px] place-items-center rounded-full bg-ember text-white">
                  <Icon name="check" size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
