import { Fragment } from "react";
import { Icon } from "@/components/workbench";
import { CLONE_SETUP_STEPS } from "@/components/clone/constants";
import type { CloneDraft } from "@/components/clone/view-models";

export function CloneSetupNav({
  draft,
}: {
  draft: CloneDraft;
}) {
  const { activeSetupStep, completedSetupSteps, onSelectStep } = draft;
  return (
    <nav aria-label="Clone setup progress">
      <ol className="wb-step-rail">
        {CLONE_SETUP_STEPS.map((step, index) => {
          const state =
            activeSetupStep === step.id
              ? "current"
              : completedSetupSteps.has(step.id)
                ? "done"
                : "upcoming";
          return (
            <Fragment key={step.id}>
              {index > 0 && <li aria-hidden="true" className="wb-step-line" />}
              <li className="contents">
                <button
                  type="button"
                  className="wb-step rounded-full outline-offset-4"
                  data-state={state}
                  aria-label={`${index + 1}. ${step.label}${state === "done" ? ", ready" : ""}`}
                  aria-current={state === "current" ? "step" : undefined}
                  onClick={() => onSelectStep(step.id)}
                >
                  <span className="wb-step-dot">
                    {state === "done" ? (
                      <Icon name="check" size={14} strokeWidth={2.5} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className={state === "current" ? undefined : "max-sm:hidden"}>
                    {step.label}
                  </span>
                </button>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
