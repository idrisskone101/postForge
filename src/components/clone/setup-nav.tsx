import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLONE_SETUP_STEPS } from "@/components/clone/constants";
import type { CloneSetupStep } from "@/components/clone/types";

export function CloneSetupNav({
  activeSetupStep,
  completedSetupSteps,
  onSelectStep,
}: {
  activeSetupStep: CloneSetupStep;
  completedSetupSteps: Set<CloneSetupStep>;
  onSelectStep: (step: CloneSetupStep) => void;
}) {
  return (
    <nav
      aria-label="Clone setup progress"
      className="grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-[var(--pf-active)] p-1 shadow-[var(--pf-shadow-2xs)]"
    >
      {CLONE_SETUP_STEPS.map((step) => {
        const isActive = activeSetupStep === step.id;
        const isComplete = completedSetupSteps.has(step.id);

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelectStep(step.id)}
            aria-label={`${step.number}. ${step.label}`}
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "group flex min-w-0 items-center gap-1.5 rounded-md px-2 py-2.5 text-left transition-colors duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-3 sm:px-4",
              isActive
                ? "bg-[var(--pf-surface)] text-foreground shadow-[var(--pf-shadow-2xs)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg border pf-data text-[12px] font-semibold transition-colors duration-[180ms] sm:size-8",
                isComplete
                  ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                  : isActive
                    ? "border-transparent bg-accent-coral text-white shadow-[var(--pf-shadow-2xs)]"
                    : "border-border bg-card text-muted-foreground"
              )}
            >
              {isComplete ? <CheckCircle2 className="size-3.5" /> : step.number}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold sm:text-sm">
                {step.shortLabel}
              </span>
              <span className="mt-0.5 hidden truncate text-[12px] text-muted-foreground sm:block">
                {step.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
