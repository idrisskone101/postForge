import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import type { CloneOutputReviewView } from "@/components/clone-output/types";

export function CloneOutputReviewHeader({
  review,
}: {
  review: CloneOutputReviewView;
}) {
  const {
    job,
    featured,
    isCompleted,
    isFailed,
    isRetrying,
    handoffState = "idle",
    onBack,
    onRetry,
    onDownload,
    onHandoff,
  } = review;
  return (
    <div className="min-w-0 border-b border-border bg-[var(--pf-canvas)] px-5 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-w-0 max-w-[1280px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <button
            type="button"
            onClick={onBack}
            className="pf-button-secondary mt-1 grid size-9 shrink-0 place-items-center px-0"
            aria-label="Back to previous page"
          >
            <ArrowLeft className="size-4 shrink-0" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[20px] font-semibold tracking-[-0.02em] sm:text-[24px]">
                Clone Output
              </h1>
              <span className="shrink-0 rounded-full bg-[var(--pf-active)] px-2.5 py-0.5 pf-data text-[12px] font-medium text-muted-foreground">
                {job.id.slice(0, 8)}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Review and approve your generated media asset.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          {(isCompleted || isFailed) && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="pf-button-secondary inline-flex h-10 shrink-0 items-center gap-2 px-4 text-sm font-semibold disabled:opacity-50"
            >
              {isRetrying ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                <RefreshCw className="size-4 shrink-0" />
              )}
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
          )}
          {featured && (
            <button
              type="button"
              onClick={() => onDownload(featured)}
              className="pf-button-secondary inline-flex h-10 shrink-0 items-center gap-2 px-4 text-sm font-semibold"
            >
              <Download className="size-4 shrink-0" />
              Download
            </button>
          )}
          <button
            type="button"
            onClick={() => featured && onHandoff?.(featured)}
            disabled={!featured || handoffState === "pending"}
            className="pf-button-primary inline-flex h-10 shrink-0 items-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed"
          >
            {handoffState === "pending" ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : handoffState === "success" ? (
              <Check className="size-4 shrink-0" />
            ) : (
              <Send className="size-4 shrink-0" />
            )}
            {handoffState === "pending"
              ? "Copying..."
              : handoffState === "success"
                ? "Copied"
                : "Handoff"}
          </button>
        </div>
      </div>
    </div>
  );
}
