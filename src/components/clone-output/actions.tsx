import { Button, Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";
import type { CloneOutputReviewView } from "@/components/clone-output/types";

export function CloneOutputReviewActions({ review }: { review: CloneOutputReviewView }) {
  const { isFailed, isRetrying, onRetry, onNewClone } = review;
  return (
    <section aria-label="Review decision" className="wb-panel gap-2.5">
      {isFailed ? (
        <Button
          variant="primary"
          className={cn(DECISION, "font-bold")}
          disabled={isRetrying}
          onClick={onRetry}
        >
          <Icon name="refresh" size={16} strokeWidth={2} />
          {isRetrying ? "Retrying clone" : "Retry clone"}
        </Button>
      ) : (
        <ReviewButtons review={review} />
      )}
      <button
        type="button"
        onClick={onNewClone}
        className="mx-auto inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold leading-4 text-fg-secondary transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:text-fg focus-visible:shadow-[0_0_0_2px_var(--pf-ember)] focus-visible:outline-none"
      >
        <Icon name="plus" size={14} />
        New clone
      </button>
    </section>
  );
}

function ReviewButtons({ review }: { review: CloneOutputReviewView }) {
  const { featured, pendingReviewStatus = null, onReviewStatusChange } = review;
  const status = featured?.reviewStatus.value;
  const approved = status === "approved_output";
  const rejected = status === "rejected_output";
  const locked = !featured || pendingReviewStatus !== null;

  return (
    <>
      <Button
        variant={approved ? "quiet" : "primary"}
        aria-pressed={approved}
        disabled={locked}
        onClick={() => featured && onReviewStatusChange?.(featured, "approved_output")}
        className={cn(
          DECISION,
          "font-bold",
          approved && "bg-ok-tint text-ok hover:bg-ok-tint disabled:bg-ok-tint disabled:text-ok"
        )}
      >
        <Icon name="check" size={16} strokeWidth={2.5} />
        {decisionLabel("approve", pendingReviewStatus === "approved_output", approved)}
      </Button>
      <Button
        variant={rejected ? "quiet" : "outline"}
        aria-pressed={rejected}
        disabled={locked}
        onClick={() => featured && onReviewStatusChange?.(featured, "rejected_output")}
        className={cn(
          "h-11 w-full gap-2 px-[18px] text-[14px] leading-[18px]",
          rejected && "bg-bad-tint text-bad hover:bg-bad-tint disabled:bg-bad-tint disabled:text-bad",
          !rejected && "disabled:bg-transparent disabled:shadow-[inset_0_0_0_1px_var(--pf-hairline)]"
        )}
      >
        {rejected && <Icon name="x" size={16} strokeWidth={2.5} />}
        {decisionLabel("reject", pendingReviewStatus === "rejected_output", rejected)}
      </Button>
    </>
  );
}

const DECISION = "h-12 w-full gap-2 px-[18px] text-[14px] leading-[18px]";

const DECISION_LABELS = {
  approve: { pending: "Approving", active: "Approved", idle: "Approve output" },
  reject: { pending: "Rejecting", active: "Rejected", idle: "Reject output" },
} as const;

function decisionLabel(kind: "approve" | "reject", pending: boolean, active: boolean) {
  const labels = DECISION_LABELS[kind];
  if (pending) return labels.pending;
  return active ? labels.active : labels.idle;
}
