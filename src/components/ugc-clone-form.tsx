"use client";

import { CloneActionBar } from "@/components/clone/action-bar";
import { CloneGenerateButton, CloneReadinessAction } from "@/components/clone/generate-button";
import { CloneIdentityStep } from "@/components/clone/identity-step";
import { CloneLiveComposition } from "@/components/clone/live-composition";
import { CloneProductionStatePanel } from "@/components/clone/production-state";
import { CloneReferenceReview } from "@/components/clone/reference-review";
import { CloneReferenceStep } from "@/components/clone/reference-step";
import { CloneSetupNav } from "@/components/clone/setup-nav";
import { CloneSourceEmptyState } from "@/components/clone/source-empty-state";
import { CloneIdentityStatusPanel } from "@/components/clone/identity-status";
import { CloneSourceStep } from "@/components/clone/source-step";
import { CloneSourceSummary } from "@/components/clone/source-summary";
import { CloneStepFooter } from "@/components/clone/step-footer";
import type { RefImageEntry } from "@/components/clone/types";
import { Panel } from "@/components/workbench";
import { useCloneForm } from "@/app/(app)/ugc-clone/use-clone-form";

export type { RefImageEntry };

export function UGCCloneForm() {
  const { phase, draft, workspace, action } = useCloneForm();

  if (phase === "reviewing") {
    return <CloneReferenceReview workspace={workspace} />;
  }

  if (phase !== "input" && phase !== "submitted") {
    const _exhaustive: never = phase;
    return _exhaustive;
  }

  const onLastStep = draft.activeSetupStep === "reference";

  return (
    <div
      data-clone-production-state="true"
      data-active-clone-step={draft.activeSetupStep}
      className="wb-fade-in flex min-w-0 gap-3 max-xl:flex-col"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Panel pad="roomy" className="gap-5 max-sm:p-4">
          <CloneSetupNav draft={draft} />
          <CloneSourceSummary draft={draft} />
          <CloneSourceStep draft={draft} hidden={draft.activeSetupStep !== "source"} />
          <CloneIdentityStep draft={draft} hidden={draft.activeSetupStep !== "identity"} />
          <CloneReferenceStep workspace={workspace} hidden={!onLastStep} />
          <CloneStepFooter draft={draft}>
            <CloneGenerateButton action={action} className="xl:hidden" />
          </CloneStepFooter>
        </Panel>
        <CloneActionBar action={action} />
      </div>

      <div className="flex w-[380px] shrink-0 flex-col gap-3 max-xl:w-full">
        <CloneLiveComposition draft={draft} />
        <CloneProductionStatePanel production={draft}>
          {onLastStep ? (
            <CloneGenerateButton action={action} className="w-full max-xl:hidden" />
          ) : (
            <CloneReadinessAction action={action} className="w-full" />
          )}
        </CloneProductionStatePanel>
      </div>
    </div>
  );
}

export { CloneSourceEmptyState, CloneIdentityStatusPanel, CloneProductionStatePanel };
