import { ArrowLeft, Check, Loader2, PenLine, Sparkles } from "lucide-react";
import { MediaPreviewFrame } from "@/components/media-preview";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
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
  const completedCount = refImages.filter((r) => r.status === "completed").length;
  const promptUsed =
    selectedRef && selectedRef.prompt ? (
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="mb-1 text-[12px] uppercase tracking-widest text-muted-foreground">
          Prompt used for #{selectedRefIndex + 1}
        </p>
        <p className="min-w-0 break-words text-xs italic leading-relaxed text-foreground/80 [overflow-wrap:anywhere] line-clamp-3">
          {selectedRef.prompt || "(no additional prompt)"}
        </p>
      </div>
    ) : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="border-border bg-card py-0 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onBack}
              className="size-8"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight">Review reference</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Check the source and generated still before creating the clone.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit bg-muted/40">
            {modelName}
          </Badge>
        </div>

        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
            {videoInfo && sourcePreviewSrc && (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                  Source
                </p>
                <MediaPreviewFrame
                  type="video"
                  src={sourcePreviewSrc}
                  width={videoInfo.width}
                  height={videoInfo.height}
                  alt={videoInfo.label || "Selected source preview"}
                  variant="work"
                  showMetadata
                />
                <div className="mt-3 min-w-0 text-xs text-muted-foreground">
                  <p className="truncate font-medium text-foreground">
                    {videoInfo.label || "Selected TikTok source"}
                  </p>
                  <p className="mt-1 font-mono text-[12px]">
                    {durationSec}s · {videoInfo.width}x{videoInfo.height}
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">Generated reference</p>
                <span className="text-xs text-muted-foreground">
                  {completedCount} variant{completedCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="relative flex min-h-[420px] items-center justify-center">
                {selectedRef?.status === "generating" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-accent-coral" />
                    </div>
                    <p className="text-sm font-medium">Generating reference image...</p>
                    <p className="text-xs text-muted-foreground">
                      Compositing your avatar into the video&apos;s environment
                    </p>
                  </div>
                )}

                {selectedRef?.status === "failed" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="min-w-0 max-w-full rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-center">
                      <p className="text-sm font-medium text-destructive">Generation failed</p>
                      {selectedRef.error && (
                        <p className="mt-1 min-w-0 break-words text-xs text-destructive/80 [overflow-wrap:anywhere]">
                          {selectedRef.error}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedRef?.status === "completed" && selectedRef.fileId && (
                  <div className="w-full p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/files/${selectedRef.fileId}`}
                      alt="Reference image - avatar in video environment"
                      className="max-w-full max-h-[600px] mx-auto rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {refImages.length > 1 && (
            <div>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                Variants
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {refImages.map((entry, i) => (
                  <button
                    key={entry.jobId}
                    type="button"
                    onClick={() => onSelectVariant(i)}
                    className={cn(
                      "relative shrink-0 size-16 rounded-lg border-2 overflow-hidden transition-all duration-150",
                      selectedRefIndex === i
                        ? "border-accent-coral"
                        : "border-border hover:border-foreground/20 opacity-70 hover:opacity-100"
                    )}
                  >
                    {entry.status === "completed" && entry.fileId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/files/${entry.fileId}`}
                        alt={`Variant ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : entry.status === "generating" ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Loader2 className="size-4 animate-spin text-accent-coral" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-destructive/10">
                        <span className="text-[12px] text-destructive">Failed</span>
                      </div>
                    )}
                    <span className="absolute bottom-0.5 right-1 text-[12px] font-bold text-white drop-shadow-md">
                      #{i + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenLine className="size-3.5 text-muted-foreground" />
                <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                  Reference Image Prompt
                </p>
              </div>
              <span className="font-mono text-[12px] text-muted-foreground">
                {refPrompt.length}/500
              </span>
            </div>
            <Textarea
              placeholder="e.g. The person is wearing a casual blue hoodie, sitting at a coffee shop table, warm afternoon light..."
              value={refPrompt}
              onChange={(e) => onRefPromptChange(e.target.value.slice(0, 500))}
              maxLength={500}
              className="min-h-[120px] resize-none bg-muted/50 border border-border focus:border-accent-coral/20 focus:bg-card rounded-lg p-4 text-sm transition-all duration-150"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Total estimate:{" "}
                <span className="font-mono text-foreground">
                  {formatCost((totalRefCost || referenceBatchCost) + videoCost + textErasureCost)}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={onRegenerate}
                disabled={isSubmitting || isGenerating}
                className="gap-2"
              >
                {isSubmitting || isGenerating ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </div>

          {promptUsed}

          {submitError && (
            <div className="min-w-0 break-words rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive [overflow-wrap:anywhere]">
              {submitError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button
              onClick={onApprove}
              disabled={!hasAnyCompleted || !selectedRefFileId || isSubmitting}
              className="gap-2 bg-accent-coral font-semibold text-white hover:brightness-[0.93]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Approve & Generate
                  <Check className="size-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CloneProductionStatePanel production={workspace} />
    </div>
  );
}
