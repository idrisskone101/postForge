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

function EditorLoadingState() {
  return (
    <div className="pf-content-viewport animate-fade-in-up">
      <div className="flex min-h-[92px] flex-col gap-4 border-b border-border px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-72 max-w-[60vw]" />
          </div>
        </div>
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>
      <div className="grid gap-4 p-3 sm:p-5 lg:p-6 xl:grid-cols-[minmax(0,1fr)_392px]">
        <div className="overflow-hidden rounded-[8px] border border-border bg-white">
          <Skeleton className="h-12 w-full rounded-none" />
          <div className="grid min-h-[620px] place-items-center bg-[var(--pf-active)] p-8">
            <Skeleton className="h-[560px] w-[315px] max-w-full rounded-lg" />
          </div>
          <Skeleton className="h-24 w-full rounded-none" />
        </div>
        <Skeleton className="h-[760px] w-full rounded-[8px]" />
      </div>
    </div>
  );
}

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
    <div className="pf-content-viewport min-w-0 animate-fade-in-up">
      <JobDetailHeader
        job={job}
        featured={featured}
        isCompleted={isCompleted}
        isDownloading={detail.isDownloading}
        error={error}
        onBack={() => router.back()}
        onShare={() => void detail.handleShare(featured)}
        onGallery={() => router.push(`/gallery?type=${job.type}`)}
        onDownload={() => featured && void detail.handleDownload(featured)}
      />

      <section className="grid items-start gap-4 p-3 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-5 lg:p-6 xl:grid-cols-[minmax(0,1fr)_392px]">
        <div className="min-w-0 overflow-hidden rounded-[8px] border border-border bg-white">
          <JobPreviewToolbar
            previewZoom={previewZoom}
            cropMode={cropMode}
            isFullscreen={isFullscreen}
            isCompleted={isCompleted}
            featured={featured}
            onZoomOut={() => setPreviewZoom((zoom) => clampPreviewZoom(zoom - 10))}
            onZoomIn={() => setPreviewZoom((zoom) => clampPreviewZoom(zoom + 10))}
            onToggleCrop={() => {
              setCropMode((current) => !current);
              showSuccess(cropMode ? "Fit preview restored." : "Crop preview enabled.");
            }}
            onFullscreen={() => void detail.handleFullscreen()}
          />

          <div
            ref={previewStageRef}
            className={cn(
              "relative grid min-h-[460px] place-items-center overflow-auto p-4 sm:min-h-[620px] sm:p-8 fullscreen:min-h-dvh",
              isCompleted && featured ? "bg-[#09090B]" : "bg-[var(--pf-active)]"
            )}
          >
            <JobPreviewBody
              job={job}
              featured={featured}
              isActive={isActive}
              isFailed={isFailed}
              isCompleted={isCompleted}
              isRetrying={detail.isRetrying}
              cropMode={cropMode}
              previewZoom={previewZoom}
              onRetry={() => void detail.handleRetry()}
              onGenerateSimilar={() => router.push(buildGenerateSimilarHref(job))}
            />
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
            <JobEnhancePanel
              job={job}
              featured={featured}
              selectedEnhancement={selectedEnhancement}
              enhancementInstruction={enhancementInstruction}
              editStrength={editStrength}
              preserveSubject={preserveSubject}
              isCompleted={isCompleted}
              isApplying={detail.isApplying}
              onSelectTool={(id) => {
                setSelectedEnhancement(id);
                const tool = ENHANCEMENT_TOOLS.find((item) => item.id === id);
                if (tool) setEnhancementInstruction(tool.instruction);
              }}
              onInstructionChange={setEnhancementInstruction}
              onEditStrengthChange={setEditStrength}
              onPreserveSubjectChange={setPreserveSubject}
              onApply={() => featured && void detail.handleApplyEnhancement(featured)}
            />
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

          <JobInspectorFooter
            job={job}
            featured={featured}
            isCompleted={isCompleted}
            canDiscard={canDiscard}
            isRetrying={detail.isRetrying}
            isDownloading={detail.isDownloading}
            isDiscarding={detail.isDiscarding}
            feedback={feedback}
            onDownload={() => featured && void detail.handleDownload(featured)}
            onRetry={() => void detail.handleRetry()}
            onSaveToGallery={() => router.push(`/gallery?type=${job.type}`)}
            onUseInClone={() =>
              featured && router.push(buildCloneHandoffHref(featured.id))
            }
            onGenerateSimilar={() => router.push(buildGenerateSimilarHref(job))}
            onAddToAutomation={() =>
              featured &&
              router.push(
                `/automations/new?sourceFileId=${encodeURIComponent(featured.id)}`
              )
            }
            onDiscard={() => void detail.handleDiscard()}
            onLeave={() => router.push("/generate")}
          />
        </aside>
      </section>
    </div>
  );
}
