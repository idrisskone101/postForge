import { AlertCircle, Download, Loader2 } from "lucide-react";
import { MediaPreviewFrame } from "@/components/media-preview";
import { cn } from "@/lib/utils";
import type {
  CloneOutputReviewJob,
  CloneOutputReviewView,
} from "@/components/clone-output/types";

export function CloneOutputReviewPreview({
  review,
}: {
  review: CloneOutputReviewView;
}) {
  const {
    job,
    featured,
    featuredSize,
    previewWidth,
    previewHeight,
    isActive,
    isFailed,
    isCompleted,
    onDownload,
    onSelectVariant,
  } = review;
  return (
    <div className="pf-card p-4 sm:p-6">
      <div className={cn("grid items-center justify-center gap-4", job.outputs.length > 1 && "sm:grid-cols-[minmax(0,1fr)_78px]")}>
        <div className="relative min-w-0">
          {isCompleted && featured ? (
            <MediaPreviewFrame
              type={featured.type === "image" ? "image" : "video"}
              src={`/api/files/${featured.id}`}
              width={previewWidth ?? undefined}
              height={previewHeight ?? undefined}
              alt={job.prompt}
              variant="detail"
              showMetadata
              className="w-full rounded-lg"
              actions={
                <button
                  type="button"
                  onClick={() => onDownload(featured)}
                  className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
                >
                  <Download className="size-3.5 shrink-0" />
                  Download
                </button>
              }
            />
          ) : (
            <ClonePreviewStage
              isActive={isActive}
              isFailed={isFailed}
              status={job.status}
              error={job.error}
            />
          )}
        </div>

        {job.outputs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
            <p className="max-sm:hidden text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:block">
              Variants
            </p>
            {job.outputs.map((output, index) => (
              <button
                key={output.id}
                type="button"
                onClick={() => onSelectVariant(index)}
                aria-label={`View variant ${index + 1}`}
                aria-pressed={featured?.id === output.id}
                className={cn(
                  "relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-[#09090B] p-0.5 transition-colors",
                  featured?.id === output.id
                    ? "border-[var(--pf-orange)] ring-1 ring-[var(--pf-orange)]/25"
                    : "border-border hover:border-[var(--pf-orange)]/50"
                )}
              >
                {output.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/files/${output.id}`}
                    alt=""
                    className="size-full rounded-md object-cover"
                  />
                ) : (
                  <video
                    src={`/api/files/${output.id}`}
                    muted
                    preload="metadata"
                    className="size-full rounded-md object-cover"
                  />
                )}
                <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 py-0.5 text-[13px] font-semibold text-white">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {featured && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {featured.filename}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[featuredSize, job.model].filter(Boolean).join(" | ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ClonePreviewStage({
  isActive,
  isFailed,
  status,
  error,
}: {
  isActive: boolean;
  isFailed: boolean;
  status: CloneOutputReviewJob["status"];
  error: string | null;
}) {
  return (
    <div className="flex min-h-[min(720px,calc(100dvh-20rem))] flex-col items-center justify-center rounded-lg bg-[#09090B] px-6 text-center">
      <ClonePreviewStageBody
        isActive={isActive}
        isFailed={isFailed}
        status={status}
        error={error}
      />
    </div>
  );
}

function ClonePreviewStageBody({
  isActive,
  isFailed,
  status,
  error,
}: {
  isActive: boolean;
  isFailed: boolean;
  status: CloneOutputReviewJob["status"];
  error: string | null;
}) {
  if (isActive) {
    return (
      <>
        <Loader2 className="mb-4 size-10 animate-spin text-[var(--pf-lamp-amber)]" />
        <p className="text-sm font-semibold text-white">
          {clonePreviewActiveLabel(status)}
        </p>
        <p className="mt-1 text-xs text-white/50">
          This may take a few minutes
        </p>
      </>
    );
  }
  if (isFailed) {
    return (
      <>
        <AlertCircle className="size-8 shrink-0 text-[var(--pf-danger)]" />
        <p className="mt-4 text-sm font-semibold text-white">Clone Failed</p>
        {error ? (
          <p className="mx-auto mt-1 min-w-0 max-w-sm break-words text-xs text-white/70 [overflow-wrap:anywhere]">
            {error}
          </p>
        ) : null}
      </>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      Output preview will appear here.
    </p>
  );
}

function clonePreviewActiveLabel(status: CloneOutputReviewJob["status"]) {
  switch (status) {
    case "queued":
      return "Waiting in queue...";
    case "processing":
    case "completed":
    case "failed":
      return "Cloning motion...";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

