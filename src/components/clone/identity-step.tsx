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
      className={cn(
        "pf-card p-4 sm:p-5",
        hidden && "hidden"
      )}
    >
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h2 className="pf-section-title">Identity</h2>
          <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
            Choose who appears in the clone.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <CloneIdentityStatusPanel identity={draft} />
        <AvatarPicker
          selectedId={draft.avatarId}
          onSelect={draft.onSelectAvatar}
        />
      </div>
    </section>
  );
}
