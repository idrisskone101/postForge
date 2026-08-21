import { Badge } from "@/components/ui/badge";
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

  const detail = avatarReady
    ? identityPack?.status === "completed"
      ? isBackfillingHairstyles
        ? "Generating extra hairstyle options; existing references stay usable."
        : `${identityPack.images.length} identity references ready.`
      : identityPack?.status === "failed"
        ? "Reference prep failed; the original avatar is still usable."
        : identityPack?.status === "queued" || identityPack?.status === "processing" || isStartingIdentityPack
          ? "Preparing identity references; original avatar remains usable."
          : "Original avatar is available."
    : "Choose a saved identity, upload one, or create a new one.";
  const error = identityPackError || identityPack?.error;

  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 max-w-xl flex-1">
        <p className="text-xs leading-5 text-muted-foreground">
          {detail}
        </p>
        {error && (
          <p className="mt-2 min-w-0 break-words text-xs text-destructive [overflow-wrap:anywhere]">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {(canGenerateHairstyles || isBackfillingHairstyles) && (
          <button
            type="button"
            onClick={onGenerateHairstyles}
            disabled={!canGenerateHairstyles}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-[var(--pf-active)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBackfillingHairstyles ? "Generating hairstyles..." : "Generate hairstyles"}
          </button>
        )}
        {identityPack?.status === "failed" && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isStartingIdentityPack}
            className="rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-1.5 text-[12px] font-semibold text-[var(--pf-danger)] transition-colors hover:bg-[var(--pf-danger)]/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStartingIdentityPack ? "Retrying..." : "Retry identity prep"}
          </button>
        )}
        {avatarReady && (
          <Badge variant="outline" className="border-accent-green/30 bg-accent-green/10 text-accent-green">
            Active
          </Badge>
        )}
      </div>
    </div>
  );
}
