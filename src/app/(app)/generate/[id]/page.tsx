"use client";

import { useState } from "react";
import { AlertCircle, Copy, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  buildCloneHandoffHref,
  buildContinueVideoHref,
  buildGenerateSimilarHref,
  clampPreviewZoom,
} from "@/lib/generation-editor";
import {
  ENHANCEMENT_TOOLS,
  asString,
  jobDetailFlags,
  type InspectorTab,
  type JobDetailActions,
  type JobDetailViewModel,
} from "../job-enhancements";
import { JobDetailHeader } from "../job-header";
import {
  JobDetailsPanel,
  JobEnhancePanel,
  JobInspectorTabs,
} from "../job-inspector";
import { JobInspectorFooter } from "../job-inspector-footer";
import {
  JobPreviewBody,
  JobPreviewToolbar,
  JobVariationStrip,
} from "../job-preview-body";
import { useJobDetail } from "../use-job-detail";

export default function JobDetailPage() {
  const detail = useJobDetail();
  const [activeTab, setActiveTab] = useState<InspectorTab>("enhance");
  const {
    router,
    previewStageRef,
    job,
    isLoading,
    error,
    featuredIdx,
    setFeaturedIdx,
    previewZoom,
    setPreviewZoom,
    cropMode,
    setCropMode,
    isFullscreen,
    selectedEnhancement,
    setSelectedEnhancement,
    enhancementInstruction,
    setEnhancementInstruction,
    editStrength,
    setEditStrength,
    preserveSubject,
    setPreserveSubject,
    feedback,
    showSuccess,
  } = detail;

  if (isLoading && !job) return <EditorLoadingState />;

  if (error && !job) {
    return (
      <div className="pf-content-viewport grid min-w-0 place-items-center px-5">
        <div className="w-full min-w-0 max-w-md rounded-lg border border-[var(--pf-danger)]/40 bg-white p-6 text-center">
          <span className="mx-auto grid size-10 shrink-0 place-items-center rounded-full bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]">
            <AlertCircle className="size-5 shrink-0" />
          </span>
          <h1 className="mt-4 text-[15px] font-semibold">Generation could not load</h1>
          <p className="mt-2 min-w-0 break-words text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            {error.message}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/generate")}
              className="shrink-0"
            >
              Back to Generate
            </Button>
            <Button className="shrink-0" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const { isActive, isCompleted, canDiscard, isFailed } = jobDetailFlags(job);
  const featured = job.outputs[featuredIdx] ?? job.outputs[0];
  const input = job.input ?? {};
  const negativePrompt = asString(input.negativePrompt);

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
    previewZoom,
    selectedEnhancement,
    enhancementInstruction,
    editStrength,
    preserveSubject,
    feedback,
    error,
  };

  const actions: JobDetailActions = {
    onBack: () => router.back(),
    onShare: () => void detail.handleShare(featured),
    onGallery: () => router.push(`/gallery?type=${job.type}`),
    onDownload: () => featured && void detail.handleDownload(featured),
    onRetry: () => void detail.handleRetry(),
    onGenerateSimilar: () => router.push(buildGenerateSimilarHref(job)),
    onSelectTool: (id) => {
      setSelectedEnhancement(id);
      const tool = ENHANCEMENT_TOOLS.find((item) => item.id === id);
      if (tool) setEnhancementInstruction(tool.instruction);
    },
    onInstructionChange: setEnhancementInstruction,
    onEditStrengthChange: setEditStrength,
    onPreserveSubjectChange: setPreserveSubject,
    onApply: () => featured && void detail.handleApplyEnhancement(featured),
    onSaveToGallery: () => router.push(`/gallery?type=${job.type}`),
    onUseInClone: () =>
      featured && router.push(buildCloneHandoffHref(featured.id)),
    onAddToAutomation: () =>
      featured &&
      router.push(
        `/automations/new?sourceFileId=${encodeURIComponent(featured.id)}`
      ),
    onDiscard: () => void detail.handleDiscard(),
    onLeave: () => router.push("/generate"),
  };

  const setTab = (tab: InspectorTab) => {
    switch (tab) {
      case "enhance":
      case "details":
      case "prompts":
        setActiveTab(tab);
        return;
      default: {
        const exhaustive: never = tab;
        return exhaustive;
      }
    }
  };

  return (
    <div className="pf-content-viewport min-w-0">
      <JobDetailHeader view={view} actions={actions} />

      <section className="grid items-start gap-4 p-3 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-5 lg:p-6 xl:grid-cols-[minmax(0,1fr)_392px]">
        <div className="min-w-0 overflow-hidden rounded-[8px] border border-border bg-white">
          <JobPreviewToolbar
            view={{
              previewZoom,
              cropMode,
              isFullscreen,
              isCompleted,
              featured,
              onZoomOut: () => setPreviewZoom((zoom) => clampPreviewZoom(zoom - 10)),
              onZoomIn: () => setPreviewZoom((zoom) => clampPreviewZoom(zoom + 10)),
              onToggleCrop: () => {
                setCropMode((current) => !current);
                showSuccess(cropMode ? "Fit preview restored." : "Crop preview enabled.");
              },
              onFullscreen: () => void detail.handleFullscreen(),
            }}
          />

          <div
            ref={previewStageRef}
            className={cn(
              "relative grid min-h-[460px] place-items-center overflow-auto p-4 sm:min-h-[620px] sm:p-8 fullscreen:min-h-dvh",
              isCompleted && featured ? "bg-[#09090B]" : "bg-[var(--pf-active)]"
            )}
          >
            <JobPreviewBody view={view} actions={actions} />
          </div>

          {isCompleted && (
            <JobVariationStrip
              job={job}
              featured={featured}
              onSelect={setFeaturedIdx}
              onNewVariation={() => router.push(buildGenerateSimilarHref(job))}
            />
          )}
        </div>

        <aside className="min-w-0 overflow-hidden rounded-[8px] border border-border bg-white xl:sticky xl:top-4">
          <JobInspectorTabs activeTab={activeTab} onTabChange={setTab} />

          {activeTab === "enhance" && (
            <JobEnhancePanel view={view} actions={actions} />
          )}

          {activeTab === "details" && (
            <JobDetailsPanel job={job} featured={featured} />
          )}

          {activeTab === "prompts" && (
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Prompt record
                  </p>
                  <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                    Recreate or remix
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void detail.handleCopyPrompt()}
                  className="h-7 rounded-lg border-border bg-white px-2 text-[12px]"
                >
                  <Copy className="size-3" /> Copy
                </Button>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-muted-foreground">Main prompt</p>
                <div className="min-w-0 break-words rounded-lg border border-border bg-[var(--pf-active)] p-3 text-[12px] leading-5 text-foreground [overflow-wrap:anywhere]">
                  {job.prompt}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-muted-foreground">
                  Negative prompt
                </p>
                <div className="min-w-0 break-words rounded-lg border border-border bg-[var(--pf-canvas)] p-3 text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                  {negativePrompt ?? "No negative prompt was used."}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    job.type === "video" &&
                      !job.tags.includes("video-swap")
                      ? buildContinueVideoHref(job, featured?.id)
                      : buildGenerateSimilarHref(job)
                  )
                }
                className="h-10 w-full rounded-lg border-border bg-white text-[12px]"
              >
                <Redo2 className="size-3.5" />{" "}
                {job.type === "video"
                  ? job.tags.includes("video-swap")
                    ? "Remix in Generate Studio"
                    : "Continue this video"
                  : "Remix in Generate Studio"}
              </Button>
            </div>
          )}

          <JobInspectorFooter view={view} actions={actions} />
        </aside>
      </section>
    </div>
  );
}


function EditorLoadingState() {
  return (
    <div className="pf-content-viewport px-5 py-8">
      <div className="mx-auto w-full max-w-md max-w-full text-center">
        <h1 className="text-[15px] font-semibold">Loading generation</h1>
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          Fetching the job, outputs, and inspector.
        </p>
        <Skeleton className="mx-auto mt-5 h-10 w-40 rounded-lg" />
      </div>
    </div>
  );
}