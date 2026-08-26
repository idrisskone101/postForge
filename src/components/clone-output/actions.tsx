import { AlertCircle, Check, Loader2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CloneOutputReviewView } from "@/components/clone-output/types";

export function CloneOutputReviewActions({
  review,
}: {
  review: CloneOutputReviewView;
}) {
  const {
    featured,
    pendingReviewStatus = null,
    actionFeedback = null,
    onReviewStatusChange,
    onNewClone,
  } = review;
  return (
    <>
      {actionFeedback && (
        <div
          role={actionFeedback.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex min-w-0 items-start gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium",
            actionFeedback.tone === "success"
              ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {actionFeedback.tone === "success" ? (
            <Check className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            {actionFeedback.message}
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => featured && onReviewStatusChange?.(featured, "approved_output")}
          disabled={!featured || pendingReviewStatus !== null}
          aria-pressed={featured?.reviewStatus.value === "approved_output"}
          className={cn(
            "flex items-center justify-between rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60",
            featured?.reviewStatus.value === "approved_output"
              ? "border-[var(--pf-success)] bg-[var(--pf-success)]/10"
              : "border-border"
          )}
        >
          <span>
            <span className="block text-sm font-semibold">
              Approve Output
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Ready for handoff
            </span>
          </span>
          {pendingReviewStatus === "approved_output" ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-[var(--pf-success)]" />
          ) : (
            <Check className="size-5 shrink-0 text-[var(--pf-success)]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => featured && onReviewStatusChange?.(featured, "rejected_output")}
          disabled={!featured || pendingReviewStatus !== null}
          aria-pressed={featured?.reviewStatus.value === "rejected_output"}
          className={cn(
            "flex items-center justify-between rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60",
            featured?.reviewStatus.value === "rejected_output"
              ? "border-destructive bg-destructive/10"
              : "border-border"
          )}
        >
          <span>
            <span className="block text-sm font-semibold">
              Reject Output
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Not usable
            </span>
          </span>
          {pendingReviewStatus === "rejected_output" ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-destructive" />
          ) : (
            <X className="size-5 shrink-0 text-destructive" />
          )}
        </button>
        <button
          type="button"
          onClick={onNewClone}
          className="pf-button-secondary flex items-center justify-between rounded-lg border border-dashed p-4 text-left"
        >
          <span>
            <span className="block text-sm font-semibold">New Clone</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Return to Clone
            </span>
          </span>
          <Users className="size-5 shrink-0" />
        </button>
      </div>
    </>
  );
}
