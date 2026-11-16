import type { CloneOutputReviewJob } from "@/components/clone-output/types";

export type RunStepId = "queued" | "preparing" | "generating" | "saving";

export const RUN_STEPS: readonly { id: RunStepId; name: string }[] = [
  { id: "queued", name: "Queued" },
  { id: "preparing", name: "Preparing" },
  { id: "generating", name: "Generating" },
  { id: "saving", name: "Saving output" },
];

const STAGE_TO_STEP: Record<string, RunStepId> = {
  queued: "queued",
  preparing: "preparing",
  submitted: "generating",
  downloading: "saving",
};

/**
 * `failedAt` is null when the worker overwrote the stage on failure: the job
 * left the queue, but the step it failed on was not recorded.
 */
export type CloneRunState =
  | { kind: "active"; current: RunStepId }
  | { kind: "failed"; failedAt: RunStepId | null; reason: string | null }
  | { kind: "completed" };

export function cloneRunState(
  job: Pick<CloneOutputReviewJob, "status" | "queueStage" | "startedAt" | "error">
): CloneRunState {
  const stageStep = job.queueStage ? STAGE_TO_STEP[job.queueStage] : undefined;
  switch (job.status) {
    case "queued":
      return { kind: "active", current: "queued" };
    case "processing":
      return { kind: "active", current: stageStep ?? "preparing" };
    case "failed":
      return {
        kind: "failed",
        failedAt: job.startedAt ? (stageStep ?? null) : "queued",
        reason: job.error,
      };
    case "completed":
      return { kind: "completed" };
    default: {
      const exhaustive: never = job.status;
      return exhaustive;
    }
  }
}

export function runStepName(id: RunStepId) {
  return RUN_STEPS.find((step) => step.id === id)?.name ?? id;
}

export function formatClockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function formatRunDuration(durationMs: number | null) {
  if (durationMs === null) return "-";
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} min ${seconds} s` : `${seconds} s`;
}
