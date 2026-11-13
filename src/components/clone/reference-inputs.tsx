import { type ReactNode } from "react";
import { FileImage } from "@/components/file-image";
import { MediaPreviewFrame } from "@/components/media-preview";
import { Button, Icon, StatusChip } from "@/components/workbench";
import { CloneSourceEmptyState } from "@/components/clone/source-empty-state";
import { useCloneReference } from "@/components/clone/clone-reference-provider";
import { cn } from "@/lib/utils";

export function CloneReferenceInputs() {
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
    isGenerating,
    referenceReady,
    onClearCollection,
    onClearSavedReference,
  } = useCloneReference();
  const preparing =
    identityPack?.status === "queued" ||
    identityPack?.status === "processing" ||
    isStartingIdentityPack;

  return (
    <div data-reference-comparison-stage="true" className="flex min-w-0 flex-col gap-2.5">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="clone-reference-heading" className="wb-panel-title">
          Set the look
        </h2>
        {isGenerating ? (
          <StatusChip tone="live">
            <span className="wb-live-dot" />
            Generating reference
          </StatusChip>
        ) : referenceReady ? (
          <StatusChip tone="ok" icon="check">
            Reference ready
          </StatusChip>
        ) : null}
      </div>

      <div className="wb-well items-start gap-3.5 p-5 max-sm:p-3">
        <div data-reference-source-preview="true" className={SLOT}>
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
              <SlotCaption title="Source">
                <span className="wb-mono text-fg-muted">
                  {durationSec.toFixed(1)}s · {videoInfo.width}x{videoInfo.height}
                </span>
              </SlotCaption>
            </>
          ) : (
            <ReferencePortraitFrame className="items-center justify-center border border-dashed border-edge bg-transparent">
              <CloneSourceEmptyState />
            </ReferencePortraitFrame>
          )}
        </div>

        <div className={SLOT}>
          {selectedCollectionAssetId ? (
            <>
              <ReferencePortraitFrame>
                <FileImage
                  src={`/api/files/${encodeURIComponent(selectedCollectionAssetId)}`}
                  alt="Selected collection reference"
                  sizes="220px"
                  fit="contain"
                />
              </ReferencePortraitFrame>
              <SlotCaption
                title="Collection reference"
                action={
                  <Button variant="link" onClick={onClearCollection}>
                    Change
                  </Button>
                }
              />
            </>
          ) : selectedSavedReference ? (
            <>
              <ReferencePortraitFrame>
                <FileImage
                  src={selectedSavedReference.previewUrl}
                  alt="Selected reference"
                  sizes="220px"
                  fit="contain"
                />
              </ReferencePortraitFrame>
              <SlotCaption
                title="Saved reference"
                action={
                  <Button variant="link" onClick={onClearSavedReference}>
                    Change
                  </Button>
                }
              />
            </>
          ) : selectedRef?.status === "generating" ? (
            <>
              <ReferencePortraitFrame className="items-center justify-center bg-raised">
                <span className="wb-live-dot" />
              </ReferencePortraitFrame>
              <SlotCaption title="Generating reference" />
            </>
          ) : selectedRef?.status === "failed" ? (
            <>
              <ReferencePortraitFrame className="flex-col items-center justify-center gap-2 bg-bad-tint p-3 text-center">
                <Icon name="x" size={18} strokeWidth={2.5} className="text-bad" />
                {selectedRef.error && (
                  <span className="min-w-0 max-w-full text-[12px] leading-4 text-fg-secondary [overflow-wrap:anywhere]">
                    {selectedRef.error}
                  </span>
                )}
              </ReferencePortraitFrame>
              <SlotCaption title="Reference failed" tone="bad" />
            </>
          ) : selectedRef?.status === "completed" && selectedRef.fileId ? (
            <>
              <ReferencePortraitFrame>
                <FileImage
                  src={`/api/files/${selectedRef.fileId}`}
                  alt="Generated reference"
                  sizes="220px"
                  fit="contain"
                />
              </ReferencePortraitFrame>
              <SlotCaption title="Generated reference">
                <span className="text-[12px] leading-4 text-fg-muted">
                  Variant {selectedRefIndex + 1}
                </span>
              </SlotCaption>
            </>
          ) : primaryAvatarReference ? (
            <>
              <ReferencePortraitFrame>
                <FileImage
                  src={primaryAvatarReference.previewUrl}
                  alt={primaryAvatarReference.label}
                  sizes="220px"
                  fit="contain"
                />
              </ReferencePortraitFrame>
              <SlotCaption
                title="Identity preview"
                action={preparing ? <StatusChip tone="warn">Preparing</StatusChip> : null}
              >
                <span className="truncate text-[12px] leading-4 text-fg-muted">
                  {primaryAvatarReference.label} · {primaryAvatarReference.detail}
                </span>
              </SlotCaption>
            </>
          ) : (
            <>
              <ReferencePortraitFrame className="items-center justify-center border border-dashed border-edge bg-transparent text-fg-muted">
                <Icon name="characters" size={20} />
              </ReferencePortraitFrame>
              <SlotCaption title="Choose identity" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const SLOT = "flex w-full min-w-0 max-w-[180px] flex-col gap-2";

function SlotCaption({
  title,
  tone,
  action,
  children,
}: {
  title: string;
  tone?: "bad";
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col">
        <span
          className={cn(
            "truncate text-[13px] font-semibold leading-4",
            tone === "bad" ? "text-bad" : "text-fg"
          )}
        >
          {title}
        </span>
        {children}
      </div>
      {action}
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
        "relative flex aspect-[9/16] w-full overflow-hidden rounded-lg bg-media",
        className
      )}
    >
      {children}
    </div>
  );
}
