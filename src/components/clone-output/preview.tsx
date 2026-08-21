import { AlertCircle, Download, Loader2 } from "lucide-react";
import { MediaPreviewFrame } from "@/components/media-preview";
import { cn } from "@/lib/utils";
import type {
  CloneOutputReviewJob,
  CloneOutputReviewOutput,
} from "@/components/clone-output/types";

export function CloneOutputReviewPreview({
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
}: {
  job: CloneOutputReviewJob;
  featured: CloneOutputReviewOutput | undefined;
  featuredSize: string | null;
  previewWidth: number | null | undefined;
  previewHeight: number | null | undefined;
  isActive: boolean;
  isFailed: boolean;
  isCompleted: boolean;
  onDownload: (output: CloneOutputReviewOutput) => void;
  onSelectVariant: (index: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className={cn("grid items-center justify-center gap-4", job.outputs.length > 1 && "sm:grid-cols-[minmax(0,1fr)_78px]")}>
        <div className="relative min-w-0">
          {isActive && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-card/80 text-center backdrop-blur-sm">
              <Loader2 className="mb-4 size-10 animate-spin text-accent-blue" />
              <p className="text-sm font-semibold">
                {job.status === "queued"
                  ? "Waiting in queue..."
                  : "Cloning motion..."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This may take a few minutes
              </p>
            </div>
          )}

          {isFailed && (
            <div className="absolute inset-0 z-10 flex min-w-0 flex-col items-center justify-center gap-4 rounded-lg bg-card/90 p-6 text-center">
              <AlertCircle className="size-8 shrink-0 text-destructive" />
              <div className="w-full min-w-0">
                <p className="text-sm font-semibold text-destructive">
                  Clone Failed
                </p>
                {job.error && (
                  <p className="mx-auto mt-1 min-w-0 max-w-sm break-words text-xs text-destructive/80 [overflow-wrap:anywhere]">
                    {job.error}
                  </p>
                )}
              </div>
            </div>
          )}

          {isCompleted && featured ? (
            <MediaPreviewFrame
              type={featured.type === "image" ? "image" : "video"}
              src={`/api/files/${featured.id}`}
              width={previewWidth}
              height={previewHeight}
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
            <div className="flex min-h-[min(720px,calc(100dvh-20rem))] items-center justify-center rounded-lg bg-zinc-950 text-sm text-muted-foreground">
              Output preview will appear here.
            </div>
          )}
        </div>

        {job.outputs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:block">
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
                  "relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-black p-0.5 transition-colors",
                  featured?.id === output.id
                    ? "border-accent-coral"
                    : "border-white hover:border-accent-coral/50"
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
