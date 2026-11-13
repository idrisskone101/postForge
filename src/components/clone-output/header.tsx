import { ArrowRight } from "lucide-react";
import { Button, Icon, IconButton } from "@/components/workbench";
import { cloneSourceTitle } from "@/components/clone/clone-source-title";
import type {
  CloneOutputHandoffState,
  CloneOutputReviewView,
} from "@/components/clone-output/types";

export function CloneOutputPanelHead({ review }: { review: CloneOutputReviewView }) {
  const {
    job,
    featured,
    isCompleted,
    isRetrying,
    handoffState = "idle",
    sourceVideo,
    onRetry,
    onDownload,
    onHandoff,
  } = review;
  const title =
    cloneSourceTitle(sourceVideo?.label ?? job.tikTokSource?.label)?.title ??
    `Clone ${job.id.slice(0, 8)}`;

  return (
    <div className="flex min-h-[34px] shrink-0 flex-wrap items-center justify-between gap-3">
      <h2 className="wb-panel-title min-w-0 truncate">{title}</h2>
      {(featured || isCompleted) && (
        <div className="flex shrink-0 items-center gap-2">
          {featured && (
            <IconButton
              icon="download"
              label="Download output"
              onClick={() => onDownload(featured)}
            />
          )}
          {isCompleted && (
            <Button
              className="h-[34px] gap-2 px-3.5 text-[13px] leading-[18px]"
              disabled={isRetrying}
              onClick={onRetry}
            >
              <Icon name="refresh" size={16} />
              {isRetrying ? "Retrying clone" : "Retry clone"}
            </Button>
          )}
          {featured && (
            <Button
              className="h-[34px] gap-2 px-3.5 text-[13px] leading-[18px]"
              disabled={handoffState === "pending"}
              onClick={() => onHandoff?.(featured)}
            >
              {handoffState === "success" ? (
                <Icon name="check" size={16} />
              ) : (
                <ArrowRight className="size-4" strokeWidth={1.5} />
              )}
              {HANDOFF_LABEL[handoffState]}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const HANDOFF_LABEL: Record<CloneOutputHandoffState, string> = {
  idle: "Handoff",
  pending: "Copying",
  success: "Copied",
  error: "Handoff",
};
