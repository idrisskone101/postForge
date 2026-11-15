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
  const failed = identityPack?.status === "failed";

  return (
    <div className="flex min-w-0 items-center gap-2">
      {avatarReady && identityPack?.status === "completed" && !isBackfillingHairstyles ? (
        <StatusChip tone="ok" icon="check">
          {identityPack.images.length} identity references ready
        </StatusChip>
      ) : null}
      {avatarReady && !failed && (preparing || isBackfillingHairstyles) ? (
        <StatusChip tone="live">
          <span className="wb-live-dot" />
          {isBackfillingHairstyles ? "Generating hairstyles" : "Preparing identity references, original avatar remains usable"}
        </StatusChip>
      ) : null}
      {canGenerateHairstyles && (
        <Button size={32} className="shrink-0" onClick={onGenerateHairstyles}>
          Generate hairstyles
        </Button>
      )}
      {failed && (
        <Button size={32} className="shrink-0" onClick={onRetry} disabled={isStartingIdentityPack}>
          {isStartingIdentityPack ? "Retrying" : "Retry identity prep"}
        </Button>
      )}
      {/* The sentence sits beside the button inside the row the step reserves, so a failed identity does
          not push Back and Continue down. The tile already reads "Failed", so phones keep only the reason. */}
      {failed || error ? (
        <p className="min-w-0 text-[13px] leading-4 text-bad [overflow-wrap:anywhere]">
          {avatarReady && failed ? <strong className="font-semibold max-sm:hidden">Reference prep failed. </strong> : null}
          {avatarReady && failed ? <span className="max-sm:hidden">The original avatar is still usable. </span> : null}
          {error}
        </p>
      ) : null}
    </div>
  );
}
