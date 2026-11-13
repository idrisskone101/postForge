"use client";

import { Button, Icon } from "@/components/workbench";
import { automationDestinationLabel } from "@/lib/automations";
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

  function goTo(index: number) {
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
        <div className="overflow-x-auto p-0.5">
          <ol className="wb-step-rail min-w-[420px]">
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
                    aria-current={state === "current" ? "step" : undefined}
                    onClick={() => goTo(index)}
                  >
                    <span className="wb-step-dot">
                      {state === "done" ? <Icon name="check" size={14} strokeWidth={2.5} /> : index + 1}
                    </span>
                    {step.name}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div key={validationOpen ? "Review" : phase} data-automation-fields="true" className="wb-fade-in flex min-w-0 flex-col gap-6">
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
          <Button variant="primary" size={40} onClick={() => goTo(currentIndex + 1)}>
            <span>{phaseIndex === PHASES.length - 1 ? "Review" : "Next"}</span>
            <Icon name="chevron-right" strokeWidth={2} />
          </Button>
        )}
      </div>
    </section>
  );
}

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
