import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/workbench";
import { CLONE_SETUP_STEPS } from "@/components/clone/constants";
import type { CloneDraft } from "@/components/clone/view-models";

export function CloneStepFooter({
  draft,
  children,
}: {
  draft: CloneDraft;
  children?: ReactNode;
}) {
  const { activeSetupStep, onSelectStep } = draft;
  const index = CLONE_SETUP_STEPS.findIndex((step) => step.id === activeSetupStep);
  const previous = CLONE_SETUP_STEPS[index - 1];
  const next = CLONE_SETUP_STEPS[index + 1];
  if (!previous && !next) return null;

  return (
    <div
      data-clone-step-footer="true"
      className="flex items-center justify-between gap-3 border-t border-hairline pt-4"
    >
      {previous ? (
        <Button size={40} onClick={() => onSelectStep(previous.id)}>
          Back
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button
          variant="primary"
          size={40}
          className="gap-2 pl-[18px] [&>svg]:size-4"
          onClick={() => onSelectStep(next.id)}
        >
          <span>Continue</span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Button>
      ) : (
        children
      )}
    </div>
  );
}
