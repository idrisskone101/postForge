import { Button, StatusChip } from "@/components/workbench";
import type { CloneIdentityModel } from "@/components/clone/view-models";

export function CloneIdentityStatusPanel({
  identity,
}: {
  identity: CloneIdentityModel;
}) {
  const {
    avatarReady,
    identityPack,
    isStartingIdentityPack,
    isGeneratingHairstyles = false,
    onGenerateHairstyles,
    identityPackError,
    onRetry,
  } = identity;
  const isBackfillingHairstyles =
    isGeneratingHairstyles || identityPack?.backfillingHairstyles === true;
  const missingHairstyleCount = identityPack?.missingHairstyleRoles?.length ?? 0;
  const canGenerateHairstyles =
    identityPack?.status === "completed" &&
    missingHairstyleCount > 0 &&
    !isBackfillingHairstyles;
  const preparing =
    identityPack?.status === "queued" ||
    identityPack?.status === "processing" ||
    isStartingIdentityPack;
  const error = identityPackError || identityPack?.error;
  if (!avatarReady && !error) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      {avatarReady && identityPack?.status === "completed" && !isBackfillingHairstyles ? (
        <StatusChip tone="ok" icon="check">
          {identityPack.images.length} identity references ready
        </StatusChip>
      ) : null}
      {avatarReady && identityPack?.status === "failed" ? (
        <StatusChip tone="bad" icon="alert">
          Reference prep failed, original avatar is still usable
        </StatusChip>
      ) : null}
      {avatarReady && identityPack?.status !== "failed" && (preparing || isBackfillingHairstyles) ? (
        <StatusChip tone="live">
          <span className="wb-live-dot" />
          {isBackfillingHairstyles ? "Generating hairstyles" : "Preparing identity references, original avatar remains usable"}
        </StatusChip>
      ) : null}
      {canGenerateHairstyles && (
        <Button size={32} onClick={onGenerateHairstyles}>
          Generate hairstyles
        </Button>
      )}
      {identityPack?.status === "failed" && (
        <Button size={32} onClick={onRetry} disabled={isStartingIdentityPack}>
          {isStartingIdentityPack ? "Retrying" : "Retry identity prep"}
        </Button>
      )}
      {error && (
        <p className="w-full min-w-0 text-right text-[13px] leading-[18px] text-bad [overflow-wrap:anywhere]">
          {error}
        </p>
      )}
    </div>
  );
}
