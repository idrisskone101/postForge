import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import type {
  CloneOutputHandoffState,
  CloneOutputReviewJob,
  CloneOutputReviewOutput,
} from "@/components/clone-output/types";

export function CloneOutputReviewHeader({
  job,
  featured,
  isCompleted,
  isFailed,
  isRetrying,
  handoffState,
  onBack,
  onRetry,
  onDownload,
  onHandoff,
}: {
  job: CloneOutputReviewJob;
  featured: CloneOutputReviewOutput | undefined;
  isCompleted: boolean;
  isFailed: boolean;
  isRetrying: boolean;
  handoffState: CloneOutputHandoffState;
  onBack: () => void;
  onRetry: () => void;
  onDownload: (output: CloneOutputReviewOutput) => void;
  onHandoff?: (output: CloneOutputReviewOutput) => void;
}) {
  return (
    <div className="min-w-0 border-b border-border bg-background px-5 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-w-0 max-w-[1280px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <button
            type="button"
            onClick={onBack}
            className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
            aria-label="Back to previous page"
          >
            <ArrowLeft className="size-4 shrink-0" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-[-0.02em]">
                Clone Output
              </h1>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 pf-data text-[12px] font-medium text-muted-foreground">
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
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
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
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download className="size-4 shrink-0" />
              Download
            </button>
          )}
          <button
            type="button"
            onClick={() => featured && onHandoff?.(featured)}
            disabled={!featured || handoffState === "pending"}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-accent-coral px-4 text-sm font-semibold text-white transition-colors hover:brightness-[0.93] disabled:cursor-not-allowed disabled:opacity-50"
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
