import { MediaPreviewFrame } from "@/components/media-preview";
import { Button, Field, IconButton, Panel, StatusBadge, StatusChip } from "@/components/workbench";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { cloneSourceTitle } from "@/components/clone/clone-source-title";
import { CloneProductionStatePanel } from "@/components/clone/production-state";
import type { CloneReferenceWorkspace } from "@/components/clone/view-models";

export function CloneReferenceReview({
  workspace,
}: {
  workspace: CloneReferenceWorkspace;
}) {
  const {
    modelName,
    videoInfo,
    sourcePreviewSrc,
    durationSec,
    refImages,
    selectedRef,
    selectedRefIndex,
    selectedRefFileId,
    refPrompt,
    totalRefCost,
    referenceBatchCost,
    videoCost,
    textErasureCost,
    isSubmitting,
    isGenerating,
    hasAnyCompleted,
    submitError,
    onBack,
    onSelectVariant,
    onRefPromptChange,
    onRegenerate,
    onApprove,
  } = workspace;
  const busy = isSubmitting || isGenerating;

  const sourceName = cloneSourceTitle(videoInfo?.label);
  return (
    <div className="flex min-w-0 gap-3 max-xl:flex-col">
      <Panel pad="roomy" className="min-w-0 flex-1 gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <IconButton icon="chevron-left" label="Back to setup" size={34} onClick={onBack} />
            <h2 className="wb-panel-title truncate">Review reference</h2>
          </div>
          <StatusChip>{modelName}</StatusChip>
        </div>

        <div className="wb-well items-start gap-3.5 p-5 max-sm:flex-col max-sm:items-center">
          {videoInfo && sourcePreviewSrc && (
            <div className="flex w-[180px] shrink-0 flex-col gap-2">
              <MediaPreviewFrame
                type="video"
                src={sourcePreviewSrc}
                width={videoInfo.width}
                height={videoInfo.height}
                alt={sourceName?.title ?? "Selected source preview"}
                variant="work"
                showMetadata
              />
              <p className="truncate text-[13px] font-semibold leading-4 text-fg">
                {sourceName?.title ?? "Selected TikTok source"}
              </p>
              <p className="wb-mono text-fg-muted">
                {sourceName?.shortId ? `${sourceName.shortId}  ` : null}
                {durationSec}s · {videoInfo.width}x{videoInfo.height}
              </p>
            </div>
          )}
          <div className="flex min-h-[320px] min-w-0 flex-1 items-center justify-center">
            {selectedRef?.status === "generating" && (
              <StatusChip tone="live">
                <span className="wb-live-dot" />
                Generating reference image
              </StatusChip>
            )}
            {selectedRef?.status === "failed" && (
              <p className="wb-notice min-w-0 [overflow-wrap:anywhere]" data-tone="bad">
                <span className="min-w-0">
                  <strong className="font-semibold text-bad">Generation failed.</strong>{" "}
                  {selectedRef.error}
                </span>
              </p>
            )}
            {selectedRef?.status === "completed" && selectedRef.fileId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/files/${selectedRef.fileId}`}
                alt="Reference image, avatar in video environment"
                className="max-h-[560px] max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        </div>

        {refImages.length > 1 && (
          <div className="-m-1 flex gap-2.5 overflow-x-auto p-1">
            {refImages.map((entry, i) => (
              <button
                key={entry.jobId}
                type="button"
                onClick={() => onSelectVariant(i)}
                aria-pressed={selectedRefIndex === i}
                aria-label={`Variant ${i + 1}, ${entry.status}`}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-lg bg-media transition-shadow duration-[160ms] ease-pf",
                  "aria-pressed:shadow-[0_0_0_2px_var(--pf-panel),0_0_0_4px_var(--pf-ember)]"
                )}
              >
                {entry.status === "completed" && entry.fileId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${entry.fileId}`} alt="" className="size-full object-cover" />
                ) : entry.status === "generating" ? (
                  <span className="grid size-full place-items-center bg-raised">
                    <span className="wb-live-dot" />
                  </span>
                ) : (
                  <span className="grid size-full place-items-center bg-raised">
                    <StatusBadge tone="bad" label="Failed" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <Field label="Reference image prompt" htmlFor="clone-reference-prompt">
          <textarea
            id="clone-reference-prompt"
            placeholder="The person is wearing a casual blue hoodie, sitting at a coffee shop table, warm afternoon light"
            value={refPrompt}
            onChange={(e) => onRefPromptChange(e.target.value.slice(0, 500))}
            maxLength={500}
            className="wb-input min-h-[104px] resize-none py-3"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="wb-mono text-fg-muted">{refPrompt.length} / 500</span>
            <Button size={32} onClick={onRegenerate} disabled={busy}>
              {busy ? "Generating" : "Regenerate"}
            </Button>
          </div>
        </Field>

        {selectedRef?.prompt ? (
          <p className="min-w-0 text-[13px] leading-[18px] text-fg-secondary [overflow-wrap:anywhere]">
            <span className="wb-label mr-2">Prompt used for variant {selectedRefIndex + 1}</span>
            {selectedRef.prompt}
          </p>
        ) : null}

        {submitError && (
          <p role="alert" className="wb-notice min-w-0 [overflow-wrap:anywhere]" data-tone="bad">
            <span className="min-w-0">{submitError}</span>
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
          <Button size={40} onClick={onBack}>
            Back
          </Button>
          <Button
            variant="primary"
            size={40}
            onClick={onApprove}
            disabled={!hasAnyCompleted || !selectedRefFileId || isSubmitting}
          >
            {isSubmitting ? "Starting" : "Approve and generate"}
            {!isSubmitting && (
              <span className="wb-mono opacity-70">
                {formatCost((totalRefCost || referenceBatchCost) + videoCost + textErasureCost)}
              </span>
            )}
          </Button>
        </div>
      </Panel>

      <div className="w-[380px] shrink-0 max-xl:w-full">
        <CloneProductionStatePanel production={workspace} />
      </div>
    </div>
  );
}
