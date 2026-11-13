"use client";

import { Button, EmptyState, Skeleton, Toast } from "@/components/workbench";
import {
  buildCloneHandoffHref,
  buildContinueVideoHref,
  buildGenerateSimilarHref,
  clampPreviewZoom,
} from "@/lib/generation-editor";
import {
  ENHANCEMENT_TOOLS,
  jobDetailFlags,
  type JobDetailActions,
  type JobDetailViewModel,
} from "../job-enhancements";
import { JobDetailHeader } from "../job-header";
import { JobDetailsPanel, JobPromptPanel, JobQuickEdits, JobRefinePanel } from "../job-inspector";
import { JobActionDock } from "../job-inspector-footer";
import { JobStage, JobVariationStrip, SCROLL_FOCUS_RING } from "../job-preview-body";
import { useJobDetail } from "../use-job-detail";

export default function JobDetailPage() {
  const detail = useJobDetail();
  const { router, job, isLoading, error, featuredIdx, cropMode, feedback } = detail;

  if (isLoading && !job) return <JobDetailLoading />;

  if (error && !job) {
    return (
      <div className="pf-content-viewport flex min-w-0 items-center justify-center">
        <EmptyState
          icon="alert"
          tone="error"
          title="Generation could not load"
          detail={error.message}
          className="w-full max-w-md flex-none [overflow-wrap:anywhere]"
        >
          <Button variant="strong" onClick={() => router.push("/generate")}>
            Back to Generate
          </Button>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </EmptyState>
      </div>
    );
  }

  if (!job) return null;

  const { isActive, isCompleted, canDiscard, isFailed } = jobDetailFlags(job);
  const featured = job.outputs[featuredIdx] ?? job.outputs[0];
  const showEnhance = isCompleted && Boolean(featured) && job.type === "image";

  const view: JobDetailViewModel = {
    job,
    featured,
    isActive,
    isCompleted,
    isFailed,
    canDiscard,
    isRetrying: detail.isRetrying,
    isDownloading: detail.isDownloading,
    isDiscarding: detail.isDiscarding,
    isApplying: detail.isApplying,
    cropMode,
    previewZoom: detail.previewZoom,
    selectedEnhancement: detail.selectedEnhancement,
    enhancementInstruction: detail.enhancementInstruction,
    editStrength: detail.editStrength,
    preserveSubject: detail.preserveSubject,
    feedback,
    error,
  };

  const actions: JobDetailActions = {
    onBack: () => router.back(),
    onShare: () => void detail.handleShare(featured),
    onDownload: () => featured && void detail.handleDownload(featured),
    onRetry: () => void detail.handleRetry(),
    onGenerateSimilar: () => router.push(buildGenerateSimilarHref(job)),
    onContinueVideo: () => router.push(buildContinueVideoHref(job, featured?.id)),
    onCopyPrompt: () => void detail.handleCopyPrompt(),
    onSelectTool: (id) => {
      detail.setSelectedEnhancement(id);
      const tool = ENHANCEMENT_TOOLS.find((item) => item.id === id);
      if (tool) detail.setEnhancementInstruction(tool.instruction);
    },
    onInstructionChange: detail.setEnhancementInstruction,
    onEditStrengthChange: detail.setEditStrength,
    onPreserveSubjectChange: detail.setPreserveSubject,
    onApply: () => featured && void detail.handleApplyEnhancement(featured),
    onSaveToGallery: () => router.push(`/gallery?type=${job.type}`),
    onUseInClone: () => featured && router.push(buildCloneHandoffHref(featured.id)),
    onAddToAutomation: () =>
      featured &&
      router.push(`/automations/new?sourceFileId=${encodeURIComponent(featured.id)}`),
    onDiscard: () => void detail.handleDiscard(),
    onLeave: () => router.push("/generate"),
  };

  return (
    <div className="pf-content-viewport flex min-w-0 flex-col gap-3 xl:h-[calc(100dvh-2*var(--pf-page-pad))] xl:min-h-[760px]">
      <JobDetailHeader view={view} actions={actions} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row">
        <div className="flex min-w-0 flex-col gap-3 max-xl:contents xl:flex-1">
          <JobStage
            view={view}
            stageRef={detail.previewStageRef}
            toolbar={{
              previewZoom: detail.previewZoom,
              cropMode,
              isFullscreen: detail.isFullscreen,
              isCompleted,
              featured,
              onZoomOut: () => detail.setPreviewZoom((zoom) => clampPreviewZoom(zoom - 10)),
              onZoomIn: () => detail.setPreviewZoom((zoom) => clampPreviewZoom(zoom + 10)),
              onToggleCrop: () => {
                detail.setCropMode((current) => !current);
                detail.showSuccess(cropMode ? "Fit preview restored." : "Crop preview enabled.");
              },
              onFullscreen: () => void detail.handleFullscreen(),
            }}
          />
          {isCompleted && job.outputs.length > 1 && (
            <JobVariationStrip job={job} featured={featured} onSelect={detail.setFeaturedIdx} />
          )}
          <JobActionDock view={view} actions={actions} />
        </div>

        <aside
          aria-label="Inspector"
          className={`flex min-w-0 flex-col gap-3 rounded-xl max-xl:order-1 md:max-xl:grid md:max-xl:grid-cols-2 md:max-xl:items-start xl:-m-1 xl:min-h-0 xl:w-[380px] xl:flex-none xl:overflow-y-auto xl:p-1 ${SCROLL_FOCUS_RING}`}
        >
          {showEnhance && <JobQuickEdits view={view} actions={actions} />}
          {showEnhance && <JobRefinePanel view={view} actions={actions} />}
          <JobDetailsPanel job={job} featured={featured} />
          <JobPromptPanel view={view} actions={actions} />
        </aside>
      </div>

      <div className="wb-toast-region">
        {feedback && (
          <Toast
            key={`${feedback.tone}:${feedback.message}`}
            toast={{
              id: feedback.message,
              tone: feedback.tone === "error" ? "bad" : "ok",
              message: feedback.message,
            }}
            onDismiss={detail.dismissFeedback}
          />
        )}
      </div>
    </div>
  );
}

function JobDetailLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading generation"
      className="pf-content-viewport flex min-w-0 flex-col gap-3 xl:h-[calc(100dvh-2*var(--pf-page-pad))] xl:min-h-[760px]"
    >
      <div className="flex h-14 flex-none items-center gap-5 px-1 max-lg:h-28 max-lg:items-start">
        <Skeleton className="h-10 w-[92px] flex-none" />
        <Skeleton className="h-7 w-full max-w-md" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row">
        <Skeleton shape="panel" className="min-h-[420px] flex-1 bg-floor shadow-[inset_0_0_0_1px_var(--pf-hairline)]" />
        <div className="flex flex-col gap-3 xl:w-[372px] xl:flex-none">
          <Skeleton shape="panel" className="h-[122px]" />
          <Skeleton shape="panel" className="h-[202px]" />
          <Skeleton shape="panel" className="h-[132px]" />
          <Skeleton shape="panel" className="min-h-[160px] flex-1" />
        </div>
      </div>
    </div>
  );
}
