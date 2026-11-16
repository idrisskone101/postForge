import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export type RailStep = {
  id: string;
  name: string;
};

type StepRailProps = {
  steps: readonly RailStep[];
  /** Id of the current step. Steps before it are done. */
  current: string;
  /** When set, done and current steps become buttons. */
  onSelect?: (id: string) => void;
  /** Dot diameter. 30 with a 12px gap (Automation builder), 28 with a 14px gap (Clone). */
  size?: 30 | 28;
  className?: string;
};

/** Number and name per step: ember ring on the current one, filled check on done ones. */
export function StepRail({ steps, current, onSelect, size = 30, className }: StepRailProps) {
  const currentIndex = steps.findIndex((step) => step.id === current);
  return (
    <ol className={cn("wb-step-rail", className)} data-size={size === 28 ? "28" : undefined}>
      {steps.map((step, index) => {
        const state = stepState(index, currentIndex);
        const body = (
          <>
            <span className="wb-step-dot">
              {state === "done" ? <Icon name="check" size={14} strokeWidth={2.5} /> : index + 1}
            </span>
            {step.name}
          </>
        );
        return (
          <Fragment key={step.id}>
            {index > 0 && <li aria-hidden="true" className="wb-step-line" />}
            <li className="contents">
              {onSelect && state !== "upcoming" ? (
                <button
                  type="button"
                  className="wb-step"
                  data-state={state}
                  aria-current={state === "current" ? "step" : undefined}
                  onClick={() => onSelect(step.id)}
                >
                  {body}
                </button>
              ) : (
                <span
                  className="wb-step"
                  data-state={state}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  {body}
                </span>
              )}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

function stepState(index: number, currentIndex: number) {
  if (index < currentIndex) return "done";
  return index === currentIndex ? "current" : "upcoming";
}
