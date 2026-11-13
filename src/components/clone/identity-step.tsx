import { cn } from "@/lib/utils";
import { AvatarPicker } from "@/components/avatar-picker";
import { CloneIdentityStatusPanel } from "@/components/clone/identity-status";
import type { CloneDraft } from "@/components/clone/view-models";

export function CloneIdentityStep({
  draft,
  hidden,
}: {
  draft: CloneDraft;
  hidden: boolean;
}) {
  return (
    <section
      data-clone-identity-section="true"
      aria-labelledby="clone-identity-heading"
      className={cn("flex min-w-0 flex-col gap-2.5", hidden && "hidden")}
    >
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="clone-identity-heading" className="wb-panel-title">
          Choose who appears
        </h2>
        <CloneIdentityStatusPanel identity={draft} />
      </div>
      <AvatarPicker selectedId={draft.avatarId} onSelect={draft.onSelectAvatar} />
    </section>
  );
}
