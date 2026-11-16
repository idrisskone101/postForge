"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MediaPreviewFrame } from "@/components/media-preview";
import { TikTokInput } from "@/components/tiktok-input";
import { VideoTrimmer } from "@/components/video-trimmer";
import {
  CLONE_STEP_FOCUS_CLASS,
  focusCloneStep,
  useCloneStepEntry,
} from "@/components/clone/use-clone-step-entry";
import type { CloneDraft } from "@/components/clone/view-models";

export function CloneSourceStep({
  draft,
  hidden,
}: {
  draft: CloneDraft;
  hidden: boolean;
}) {
  const {
    sourceReady,
    videoInfo,
    originalVideoInfo,
    sourcePreviewSrc,
    showTrimmer,
    shouldShowSourceTools,
    sourcesRefreshKey,
    pendingSourceId,
    pendingSourceUrl,
    onTrimmed,
    onCancelTrim,
    onVideoDownloaded,
    onPreselectedSourceResolved,
  } = draft;
  const stepEntry = useCloneStepEntry("source", hidden);
  const trimming = sourceReady && showTrimmer && originalVideoInfo && videoInfo;

  // Choosing a source, applying a trim or cancelling one swaps the tools for the trimmer or back, and
  // the control that was pressed leaves with them. Focus then goes to the step, not to the body.
  const focusLeaving = useRef(false);
  function keepingFocus<Args extends unknown[]>(handler: (...args: Args) => void) {
    return (...args: Args) => {
      focusLeaving.current = stepEntry.ref.current?.contains(document.activeElement) ?? false;
      handler(...args);
    };
  }
  useLayoutEffect(() => {
    const step = stepEntry.ref.current;
    if (!focusLeaving.current || !step) return;
    if (hidden) {
      focusLeaving.current = false;
      return;
    }
    if (step.contains(document.activeElement)) return;
    focusLeaving.current = false;
    if (document.activeElement === document.body) focusCloneStep(step);
  });
  return (
    <section
      {...stepEntry}
      data-clone-source-section="true"
      className={cn("flex min-w-0 flex-col gap-3", CLONE_STEP_FOCUS_CLASS, hidden && "hidden")}
    >
      {trimming ? (
        <VideoTrimmer
          key={originalVideoInfo.localPath}
          videoPath={originalVideoInfo.localPath}
          durationSec={originalVideoInfo.durationSec}
          width={originalVideoInfo.width}
          height={originalVideoInfo.height}
          sourceId={videoInfo.id}
          onTrimmed={keepingFocus(onTrimmed)}
          onCancel={keepingFocus(onCancelTrim)}
        />
      ) : null}

      {!trimming && !shouldShowSourceTools && videoInfo && sourcePreviewSrc ? (
        <div className="wb-well">
          <div data-clone-source-selected-preview="true" className="w-full max-w-[236px]">
            <MediaPreviewFrame
              type="video"
              src={sourcePreviewSrc}
              width={videoInfo.width}
              height={videoInfo.height}
              alt={videoInfo.label || "Selected source preview"}
              variant="card"
              frameAspectRatio="9/16"
              className="w-full"
              mediaClassName="rounded-none"
            />
          </div>
        </div>
      ) : null}

      {shouldShowSourceTools && (
        <>
          <h2 className="wb-panel-title">
            {sourceReady ? "Replace the source" : "Choose a source"}
          </h2>
          <TikTokInput
            onDownloaded={keepingFocus(onVideoDownloaded)}
            videoInfo={videoInfo}
            refreshKey={sourcesRefreshKey}
            preselectedSourceId={sourceReady ? null : pendingSourceId}
            handoffSourceUrl={sourceReady ? null : pendingSourceUrl}
            onPreselectedSourceResolved={onPreselectedSourceResolved}
          />
        </>
      )}
    </section>
  );
}
