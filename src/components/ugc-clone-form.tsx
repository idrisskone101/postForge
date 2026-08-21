"use client";

import { CloneActionBar } from "@/components/clone/action-bar";
import { CloneIdentityStep } from "@/components/clone/identity-step";
import { CloneLiveComposition } from "@/components/clone/live-composition";
import { CloneProductionStatePanel } from "@/components/clone/production-state";
import { CloneReferenceReview } from "@/components/clone/reference-review";
import { CloneReferenceStep } from "@/components/clone/reference-step";
import { CloneSetupNav } from "@/components/clone/setup-nav";
import { CloneSourceEmptyState } from "@/components/clone/source-empty-state";
import { CloneIdentityStatusPanel } from "@/components/clone/identity-status";
import { CloneSourceStep } from "@/components/clone/source-step";
import type { RefImageEntry } from "@/components/clone/types";
import { useCloneForm } from "@/app/ugc-clone/use-clone-form";

export type { RefImageEntry };
export { CloneSourceEmptyState, CloneIdentityStatusPanel, CloneProductionStatePanel };

export function UGCCloneForm() {
  const { phase, draft, workspace, action } = useCloneForm();

  if (phase === "reviewing") {
    return <CloneReferenceReview workspace={workspace} />;
  }

  if (phase !== "input" && phase !== "submitted") {
    const _exhaustive: never = phase;
    return _exhaustive;
  }

  return (
    <>
      <div
        data-clone-production-state="true"
        data-active-clone-step={draft.activeSetupStep}
        className="space-y-4 pb-28"
      >
        <CloneSetupNav draft={draft} />

        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(420px,45fr)_minmax(0,55fr)]">
          <CloneSourceStep draft={draft} hidden={draft.activeSetupStep !== "source"} />
          <CloneIdentityStep draft={draft} hidden={draft.activeSetupStep !== "identity"} />
          <CloneReferenceStep
            workspace={workspace}
            hidden={draft.activeSetupStep !== "reference"}
          />
          <CloneLiveComposition draft={draft} />
        </div>
      </div>

      <CloneActionBar action={action} />
    </>
  );
}
