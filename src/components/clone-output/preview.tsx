import { FileImage } from "@/components/file-image";
import { Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";
import { CloneOutputPanelHead } from "@/components/clone-output/header";
import { CloneOutputPlayer } from "@/components/clone-output/player";
import { CloneRunRail } from "@/components/clone-output/rail";
import {
  cloneRunState,
  formatClockTime,
  runStepName,
  type CloneRunState,
} from "@/components/clone-output/run-state";
import type { CloneOutputReviewView } from "@/components/clone-output/types";

export function CloneOutputReviewPreview({ review }: { review: CloneOutputReviewView }) {
  const { job, featured } = review;
  const run = cloneRunState(job);
  const showMedia = run.kind === "completed" && featured;

  return (
    <section
      aria-label="Clone output preview"
      className="wb-panel min-w-0 flex-1 max-sm:px-4 max-sm:pb-4"
    >
      <CloneOutputPanelHead review={review} />
      <CloneRunRail model={run} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg bg-well p-4 sm:min-h-[596px] sm:flex-row sm:gap-5 sm:px-0 sm:py-6">
        {showMedia ? (
          <>
            <CloneOutputPlayer review={review} />
            <VariantRail review={review} />
          </>
        ) : (
          <RunStage run={run} job={job} />
        )}
      </div>
    </section>
  );
}

function VariantRail({ review }: { review: CloneOutputReviewView }) {
  const { job, featured, onSelectVariant } = review;
  if (job.outputs.length < 2) return null;
  const featuredIndex = job.outputs.findIndex((output) => output.id === featured?.id);
  return (
    <div className="flex w-full max-w-[315px] items-center gap-2.5 sm:w-[84px] sm:flex-col sm:items-start">
      <div className="-m-1 flex gap-2.5 overflow-x-auto p-1 sm:max-h-[568px] sm:flex-col sm:overflow-y-auto">
        {job.outputs.map((output, index) => {
          const selected = output.id === featured?.id;
          return (
            <button
              key={output.id}
              type="button"
              onClick={() => onSelectVariant(index)}
              aria-label={`View variant ${index + 1}`}
              aria-pressed={selected}
              className={cn(
                "relative aspect-[84/149] w-14 shrink-0 overflow-hidden rounded-lg bg-media transition-[box-shadow] duration-[var(--pf-dur-feedback)] ease-pf focus-visible:outline-none sm:w-[84px]",
                selected
                  ? "shadow-[0_0_0_2px_var(--pf-well),0_0_0_4px_var(--pf-ember)]"
                  : "hover:shadow-[0_0_0_2px_var(--pf-well),0_0_0_4px_var(--pf-outline)] focus-visible:shadow-[0_0_0_2px_var(--pf-well),0_0_0_4px_var(--pf-outline)]"
              )}
            >
              {output.type === "image" ? (
                <FileImage src={`/api/files/${output.id}`} alt="" sizes="84px" />
              ) : (
                <video
                  src={`/api/files/${output.id}`}
                  muted
                  preload="metadata"
                  className="size-full object-cover"
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="ml-auto shrink-0 text-[12px] leading-4 text-fg-secondary sm:ml-0">
        {featuredIndex + 1} / {job.outputs.length}
      </p>
    </div>
  );
}

function RunStage({
  run,
  job,
}: {
  run: CloneRunState;
  job: CloneOutputReviewView["job"];
}) {
  return (
    <div className="flex aspect-[9/16] w-full max-w-[292px] flex-col items-center justify-center gap-3 rounded-lg bg-media px-7 text-center">
      <RunStageBody run={run} job={job} />
    </div>
  );
}

function RunStageBody({
  run,
  job,
}: {
  run: CloneRunState;
  job: CloneOutputReviewView["job"];
}) {
  if (run.kind === "active") {
    return (
      <>
        <p className="flex items-center gap-2 text-[14px] font-semibold leading-[18px] text-fg">
          <span className="wb-live-dot" aria-hidden="true" />
          {runStepName(run.current)}
        </p>
        <p className="font-mono text-[12px] leading-4 text-fg-secondary">
          {job.startedAt
            ? `Started ${formatClockTime(job.startedAt)}`
            : `Queued ${formatClockTime(job.createdAt)}`}
        </p>
      </>
    );
  }
  if (run.kind === "failed") {
    return (
      <>
        <span className="grid size-11 place-items-center rounded-full bg-bad-tint text-bad">
          <Icon name="x" size={18} strokeWidth={2} />
        </span>
        <p className="text-[14px] font-semibold leading-[18px] text-fg">Clone failed</p>
        {run.reason ? (
          <p className="min-w-0 max-w-full break-words text-[13px] leading-[18px] text-fg-secondary [overflow-wrap:anywhere]">
            {run.reason}
          </p>
        ) : null}
      </>
    );
  }
  return <p className="text-[13px] leading-[18px] text-fg-secondary">No output file was saved</p>;
}
