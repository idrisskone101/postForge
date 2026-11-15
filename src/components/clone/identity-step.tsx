import { cn } from "@/lib/utils";
import { AvatarPicker } from "@/components/avatar-picker";
import { CloneIdentityStatusPanel } from "@/components/clone/identity-status";
import { CLONE_STEP_FOCUS_CLASS, useCloneStepEntry } from "@/components/clone/use-clone-step-entry";
import type { CloneDraft } from "@/components/clone/view-models";

export function CloneIdentityStep({
  draft,
  hidden,
}: {
  draft: CloneDraft;
  hidden: boolean;
}) {
  const stepEntry = useCloneStepEntry("identity", hidden);
  return (
    <section
      {...stepEntry}
      data-clone-identity-section="true"
      className={cn("flex min-w-0 flex-col gap-2.5", CLONE_STEP_FOCUS_CLASS, hidden && "hidden")}
    >
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="wb-panel-title">
          Choose who appears
        </h2>
        <CloneIdentityStatusPanel identity={draft} />
      </div>
      <AvatarPicker selectedId={draft.avatarId} onSelect={draft.onSelectAvatar} />
    </section>
  );
}
