import { type ReactNode } from "react";
import { Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MediaPreviewFrame } from "@/components/media-preview";
import { CloneSourceEmptyState } from "@/components/clone/source-empty-state";
import type { CloneReferenceWorkspace } from "@/components/clone/view-models";
import { cn } from "@/lib/utils";

export function CloneReferenceInputs({
  workspace,
}: {
  workspace: CloneReferenceWorkspace;
}) {
  const {
    sourceReady,
    videoInfo,
    sourcePreviewSrc,
    durationSec,
    selectedCollectionAssetId,
    selectedSavedReference,
    selectedRef,
    selectedRefIndex,
    primaryAvatarReference,
    identityPack,
    isStartingIdentityPack,
    onClearCollection,
    onClearSavedReference,
  } = workspace;
  return (
    <div
      data-reference-comparison-stage="true"
      className="rounded-lg border border-border bg-muted/40 p-3 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-foreground">Inputs</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Source motion and selected identity
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          Side by side
        </span>
      </div>

      <div className="grid grid-cols-2 items-start gap-3 sm:gap-4">
        <div
          data-reference-source-preview="true"
          className="h-full min-w-0 rounded-lg border border-border bg-card p-2.5 sm:p-3"
        >
          {sourceReady && videoInfo && sourcePreviewSrc ? (
            <>
              <ReferencePortraitFrame>
                <MediaPreviewFrame
                  type="video"
                  src={sourcePreviewSrc}
                  width={videoInfo.width}
                  height={videoInfo.height}
                  alt={videoInfo.label || "Selected source preview"}
                  variant="card"
                  frameAspectRatio="9/16"
                  className="size-full"
                  mediaClassName="rounded-none"
                />
              </ReferencePortraitFrame>
              <div className="mt-3 min-w-0">
                <span className="block text-[11px] font-medium">Selected source</span>
                <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                  {durationSec.toFixed(1)}s • {videoInfo.width}x{videoInfo.height}
                </span>
              </div>
            </>
          ) : (
            <ReferencePortraitFrame className="flex-col items-center justify-center border border-dashed border-[var(--pf-border-strong)] bg-[var(--pf-active)] p-4 text-center">
              <CloneSourceEmptyState />
            </ReferencePortraitFrame>
          )}
        </div>

        <div className="h-full min-w-0 rounded-lg border border-border bg-card p-2.5 sm:p-3">
          {selectedCollectionAssetId ? (
            <>
              <ReferencePortraitFrame>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${encodeURIComponent(selectedCollectionAssetId)}`}
                  alt="Selected collection reference"
                  className="size-full object-contain"
                />
              </ReferencePortraitFrame>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] font-medium">Collection reference</span>
                <button
                  type="button"
                  onClick={onClearCollection}
                  className="text-[12px] font-bold text-accent-coral"
                >
                  Change
                </button>
              </div>
            </>
          ) : selectedSavedReference ? (
            <>
              <ReferencePortraitFrame>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedSavedReference.previewUrl}
                  alt="Selected reference"
                  className="size-full object-contain"
                />
              </ReferencePortraitFrame>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] font-medium">Saved reference</span>
                <button
                  type="button"
                  onClick={onClearSavedReference}
                  className="text-[12px] font-bold text-accent-coral"
                >
                  Change
                </button>
              </div>
            </>
          ) : selectedRef?.status === "generating" ? (
            <ReferencePortraitFrame className="flex-col items-center justify-center bg-[var(--pf-active)] p-4 text-center">
              <Loader2 className="size-7 animate-spin text-accent-coral" />
              <span className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Generating reference
              </span>
              <span className="mt-1 max-w-[180px] text-[12px] leading-4 text-muted-foreground/70">
                Creating a still from the selected source and identity.
              </span>
            </ReferencePortraitFrame>
          ) : selectedRef?.status === "failed" ? (
            <ReferencePortraitFrame className="flex-col items-center justify-center bg-destructive/10 p-4 text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-destructive">
                Reference failed
              </span>
              {selectedRef.error && (
                <span className="mt-2 min-w-0 max-w-[220px] break-words text-[12px] leading-4 text-destructive/80 [overflow-wrap:anywhere]">
                  {selectedRef.error}
                </span>
              )}
            </ReferencePortraitFrame>
          ) : selectedRef?.status === "completed" && selectedRef.fileId ? (
            <>
              <ReferencePortraitFrame>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${selectedRef.fileId}`}
                  alt="Generated reference"
                  className="size-full object-contain"
                />
              </ReferencePortraitFrame>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium">Generated reference</span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                    Variant #{selectedRefIndex + 1}
                  </span>
                </div>
                <Badge variant="outline" className="border-accent-coral/30 bg-accent-coral/10 text-accent-coral">
                  Ready
                </Badge>
              </div>
            </>
          ) : primaryAvatarReference ? (
            <>
              <ReferencePortraitFrame>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={primaryAvatarReference.previewUrl}
                  alt={primaryAvatarReference.label}
                  className="size-full object-contain"
                />
              </ReferencePortraitFrame>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium">Identity preview</span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                    {primaryAvatarReference.label} • {primaryAvatarReference.detail}
                  </span>
                </div>
                {identityPack?.status === "queued" || identityPack?.status === "processing" || isStartingIdentityPack ? (
                  <Badge variant="outline" className="border-accent-green/30 bg-accent-green/10 text-accent-green">
                    Preparing
                  </Badge>
                ) : null}
              </div>
            </>
          ) : (
            <ReferencePortraitFrame className="flex-col items-center justify-center border border-dashed border-[var(--pf-border-strong)] bg-[var(--pf-active)] p-4 text-center">
              <Users className="size-6 text-muted-foreground/60" />
              <span className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Choose identity
              </span>
              <span className="mt-1 max-w-[180px] text-[12px] leading-4 text-muted-foreground/60">
                Identity preview appears here.
              </span>
            </ReferencePortraitFrame>
          )}
        </div>
      </div>
    </div>
  );
}


function ReferencePortraitFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-reference-portrait-frame="true"
      className={cn(
        "mx-auto flex aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-lg bg-zinc-950",
        className
      )}
    >
      {children}
    </div>
  );
}