import { cn } from "@/lib/utils";
import { AvatarPicker } from "@/components/avatar-picker";
import { CloneIdentityStatusPanel } from "@/components/clone/identity-status";
import type { AvatarIdentityPack } from "@/components/clone/types";

export function CloneIdentityStep({
  hidden,
  avatarId,
  avatarReady,
  identityPack,
  isStartingIdentityPack,
  isGeneratingHairstyles,
  identityPackError,
  onGenerateHairstyles,
  onRetry,
  onSelectAvatar,
}: {
  hidden: boolean;
  avatarId: string | null;
  avatarReady: boolean;
  identityPack: AvatarIdentityPack | null;
  isStartingIdentityPack: boolean;
  isGeneratingHairstyles: boolean;
  identityPackError: string | null;
  onGenerateHairstyles: () => void;
  onRetry: () => void;
  onSelectAvatar: (nextAvatarId: string) => void;
}) {
  return (
    <section
      data-clone-identity-section="true"
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)] sm:p-5",
        hidden && "hidden"
      )}
    >
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Identity
          </h2>
          <p className="text-xs text-muted-foreground">Choose who appears in the clone.</p>
        </div>
      </div>

      <div className="space-y-4">
        <CloneIdentityStatusPanel
          avatarReady={avatarReady}
          identityPack={identityPack}
          isStartingIdentityPack={isStartingIdentityPack}
          isGeneratingHairstyles={isGeneratingHairstyles}
          onGenerateHairstyles={onGenerateHairstyles}
          identityPackError={identityPackError}
          onRetry={onRetry}
        />
        <AvatarPicker
          selectedId={avatarId}
          onSelect={onSelectAvatar}
        />
      </div>
    </section>
  );
}
