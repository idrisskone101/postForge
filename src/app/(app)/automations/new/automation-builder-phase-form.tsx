"use client";

import { Button, Icon } from "@/components/workbench";
import { automationDestinationLabel } from "@/lib/automations";
import { useStepEntry } from "@/lib/use-step-entry";
import { BUILDER_STEPS, ValidationRow } from "./automation-builder-fields";
import { CloseStep, ContentStep, HookStep } from "./automation-builder-steps";
import type { AutomationBuilderWorkspace } from "./use-automation-builder";

export function AutomationBuilderPhaseForm({
  workspace,
}: {
  workspace: AutomationBuilderWorkspace;
}) {
  const {
    phase,
    phaseIndex,
    setPhase,
    validationOpen,
    setValidationOpen,
    saving,
    socialApprovalMissing,
    record,
    destinationReadiness,
    persist,
    PHASES,
  } = workspace;
  const currentIndex = validationOpen ? PHASES.length : phaseIndex;
  const { markStepChange, stepRef } = useStepEntry();

  function goTo(index: number) {
    markStepChange();
    if (index >= PHASES.length) {
      setValidationOpen(true);
      return;
    }
    setValidationOpen(false);
    setPhase(PHASES[Math.max(0, index)]);
  }

  return (
    <section
      data-automation-form="true"
      aria-label="Automation setup"
      className="flex min-w-0 flex-1 flex-col justify-between gap-6 rounded-xl bg-panel p-6 shadow-panel"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <div className="wb-step-scroll">
          <ol className="wb-step-rail sm:min-w-[420px]">
            {BUILDER_STEPS.map((step, index) => {
              const state =
                index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
              return (
                <li key={step.id} className="contents">
                  {index > 0 && <span aria-hidden="true" className="wb-step-line" />}
                  <button
                    type="button"
                    className="wb-step rounded-full"
                    data-state={state}
                    aria-label={`${index + 1}. ${step.name}${state === "done" ? ", done" : ""}`}
                    aria-current={state === "current" ? "step" : undefined}
                    onClick={() => goTo(index)}
                  >
                    <span className="wb-step-dot">
                      {state === "done" ? <Icon name="check" size={14} strokeWidth={2.5} /> : index + 1}
                    </span>
                    <span className={state === "current" ? undefined : "max-sm:hidden"}>{step.name}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div
          key={validationOpen ? "Review" : phase}
          ref={stepRef}
          tabIndex={-1}
          role="group"
          aria-label={`Step ${currentIndex + 1} of ${BUILDER_STEPS.length}: ${BUILDER_STEPS[currentIndex].name}`}
          data-automation-fields="true"
          className="wb-fade-in flex min-w-0 flex-col gap-6 rounded-lg focus-visible:[outline:2px_solid_var(--pf-ember)] focus-visible:outline-offset-4"
        >
          {validationOpen ? (
            <ReviewStep workspace={workspace} />
          ) : phase === "Hook" ? (
            <HookStep workspace={workspace} />
          ) : phase === "Content" ? (
            <ContentStep workspace={workspace} />
          ) : (
            <CloseStep workspace={workspace} />
          )}
        </div>
      </div>
      <div
        data-automation-footer="true"
        className="flex flex-wrap items-center justify-end gap-2.5 border-t border-hairline pt-4"
      >
        <Button size={40} className="mr-auto" onClick={() => persist("draft")} disabled={saving}>
          {saving ? "Saving" : "Save draft"}
        </Button>
        <Button size={40} onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
          Back
        </Button>
        {validationOpen ? (
          <Button
            variant="primary"
            size={40}
            className={PRIMARY_ROW}
            disabled={saving || socialApprovalMissing}
            onClick={() => {
              setValidationOpen(false);
              persist("create");
            }}
          >
            {record.destination !== "manual" && !destinationReadiness.ready
              ? "Save for connection"
              : "Save reviewed plan"}
          </Button>
        ) : (
          <Button variant="primary" size={40} className={PRIMARY_ROW} onClick={() => goTo(currentIndex + 1)}>
            <span>{phaseIndex === PHASES.length - 1 ? "Review" : "Next"}</span>
            <Icon name="chevron-right" strokeWidth={2} />
          </Button>
        )}
      </div>
    </section>
  );
}

/** Below 480 the footer is two rows on every step: the quiet actions, then the primary across the panel. */
const PRIMARY_ROW = "max-[479.98px]:basis-full";

function ReviewStep({ workspace }: { workspace: AutomationBuilderWorkspace }) {
  const { record, socialApprovalMissing, integrationsLoading, destinationReadiness } = workspace;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="wb-panel-title pb-0.5">
        {socialApprovalMissing ? "Approval is required" : "Creative setup looks good"}
      </h2>
      <div className="flex flex-col rounded-lg bg-raised px-4">
        <ValidationRow ok text="Hook, content, and CTA configured" />
        <ValidationRow
          ok={record.destination === "manual" || record.approvalRequired}
          text={
            record.destination === "manual"
              ? "Local review plan"
              : record.approvalRequired
                ? "Approval required before any provider handoff"
                : "Social handoffs require approval"
          }
        />
        <ValidationRow
          ok={record.destination === "manual" || (!integrationsLoading && destinationReadiness.ready)}
          text={
            record.destination !== "manual" && integrationsLoading
              ? `Checking ${automationDestinationLabel(record.destination)} connection readiness`
              : destinationReadiness.message
          }
        />
      </div>
      <p className="max-w-[68ch] pt-2 text-[13px] leading-[19px] text-fg-secondary">
        Saving creates a paused plan. Manual Review queue schedules can create local drafts. Social publishing stays separate and requires an approved Gallery video, a live provider check, and explicit confirmation for every post.
      </p>
    </div>
  );
}
