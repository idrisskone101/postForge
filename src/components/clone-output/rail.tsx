import { Fragment } from "react";
import { Icon, StepRail } from "@/components/workbench";
import {
  RUN_STEPS,
  type CloneRunState,
  type RunStepId,
} from "@/components/clone-output/run-state";

type FailedRun = Extract<CloneRunState, { kind: "failed" }>;

export function CloneRunRail({ model }: { model: CloneRunState }) {
  if (model.kind === "completed") return null;
  return (
    <div className="-mx-1 shrink-0 overflow-x-auto px-1 py-0.5">
      {model.kind === "active" ? (
        <StepRail
          steps={RUN_STEPS}
          current={model.current}
          className="min-w-[540px]"
        />
      ) : (
        <FailedRail failedAt={model.failedAt} />
      )}
    </div>
  );
}

function FailedRail({ failedAt }: { failedAt: FailedRun["failedAt"] }) {
  const steps = failedSteps(failedAt);
  return (
    <ol className="wb-step-rail" aria-label="Clone steps">
      {steps.map((step, index) => (
        <Fragment key={step.id}>
          {index > 0 && <li aria-hidden="true" className="wb-step-line" />}
          <li className="contents">
            <span
              className={
                step.state === "failed" ? "wb-step font-bold text-bad" : "wb-step"
              }
              data-state={step.state === "failed" ? undefined : step.state}
              aria-current={step.state === "failed" ? "step" : undefined}
            >
              <span
                className={
                  step.state === "failed"
                    ? "wb-step-dot text-bad shadow-[inset_0_0_0_2px_var(--pf-bad)]"
                    : "wb-step-dot"
                }
              >
                {step.state === "upcoming" ? (
                  index + 1
                ) : (
                  <Icon name={step.state === "done" ? "check" : "x"} size={14} strokeWidth={2.5} />
                )}
              </span>
              {step.name}
              {step.state === "failed" && <span className="sr-only">, failed</span>}
            </span>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

type FailedStep = {
  id: string;
  name: string;
  state: "done" | "failed" | "upcoming";
};

function failedSteps(failedAt: RunStepId | null): FailedStep[] {
  if (failedAt === null) {
    return [
      { id: "queued", name: "Queued", state: "done" },
      { id: "processing", name: "Processing", state: "failed" },
    ];
  }
  const failedIndex = RUN_STEPS.findIndex((step) => step.id === failedAt);
  return RUN_STEPS.map((step, index) => ({
    ...step,
    state: index < failedIndex ? "done" : stepAfterDone(index === failedIndex),
  }));
}

function stepAfterDone(isFailed: boolean): FailedStep["state"] {
  return isFailed ? "failed" : "upcoming";
}
