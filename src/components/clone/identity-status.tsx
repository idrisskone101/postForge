"use client";

import { useId, useState } from "react";
import { Button, Icon, StatusChip, buttonClass } from "@/components/workbench";
import { cn } from "@/lib/utils";
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
  const failed = identityPack?.status === "failed";
  const [reasonOpen, setReasonOpen] = useState(false);
  const reasonId = useId();
  const shown = avatarReady || Boolean(error);

  return (
    <>
      {/* The row is always there and nothing in it wraps past its height, so choosing an identity never
          moves the footer. The reason, of any length, opens below it only when asked for. */}
      <div data-clone-identity-status="true" className="flex min-h-8 min-w-0 items-center gap-2 max-sm:min-h-12">
        {avatarReady && identityPack?.status === "completed" && !isBackfillingHairstyles ? (
          <StatusChip tone="ok" icon="check">
            {identityPack.images.length} identity references ready
          </StatusChip>
        ) : null}
        {avatarReady && !failed && (preparing || isBackfillingHairstyles) ? (
          <StatusChip tone="live">
            <span className="wb-live-dot" />
            {isBackfillingHairstyles ? (
            "Generating hairstyles"
          ) : (
            <>
              {/* The long sentence runs past a phone's row, so phones get the short form of it. */}
              <span className="sm:hidden">Preparing, avatar still usable</span>
              <span className="max-sm:hidden">Preparing identity references, original avatar remains usable</span>
            </>
          )}
          </StatusChip>
        ) : null}
        {shown && canGenerateHairstyles && (
          <Button size={32} className="shrink-0" onClick={onGenerateHairstyles}>
            Generate hairstyles
          </Button>
        )}
        {shown && failed && (
          <Button size={32} className="shrink-0" onClick={onRetry} disabled={isStartingIdentityPack}>
            {isStartingIdentityPack ? "Retrying" : "Retry identity prep"}
          </Button>
        )}
        {error ? (
          <>
            {/* The tile already reads "Failed", so a phone keeps only the buttons. */}
            <p className={cn("min-w-0 text-[13px] leading-4 text-bad", failed && avatarReady && "max-sm:hidden")}>
              <strong className="font-semibold">{failed ? "Reference prep failed." : "Identity prep error."}</strong>
              {avatarReady && failed ? " The original avatar is still usable." : null}
            </p>
            <button
              type="button"
              className={cn(buttonClass("quiet", 32), "shrink-0")}
              aria-expanded={reasonOpen}
              aria-controls={reasonId}
              onClick={() => setReasonOpen((open) => !open)}
            >
              Reason
              <Icon name="chevron-down" size={16} className={cn("transition-transform duration-200 ease-pf", reasonOpen && "rotate-180")} />
            </button>
          </>
        ) : null}
      </div>
      {error ? (
        <p id={reasonId} hidden={!reasonOpen} className="wb-notice text-fg [overflow-wrap:anywhere]" data-tone="bad">
          {error}
        </p>
      ) : null}
    </>
  );
}
