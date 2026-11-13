import { cn } from "@/lib/utils";
import { MediaPreviewFrame } from "@/components/media-preview";
import { TikTokInput } from "@/components/tiktok-input";
import { VideoTrimmer } from "@/components/video-trimmer";
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
  const trimming = sourceReady && showTrimmer && originalVideoInfo && videoInfo;
  return (
    <section
      data-clone-source-section="true"
      aria-label="Source"
      className={cn("flex min-w-0 flex-col gap-3", hidden && "hidden")}
    >
      {trimming ? (
        <VideoTrimmer
          key={originalVideoInfo.localPath}
          videoPath={originalVideoInfo.localPath}
          durationSec={originalVideoInfo.durationSec}
          width={originalVideoInfo.width}
          height={originalVideoInfo.height}
          sourceId={videoInfo.id}
          onTrimmed={onTrimmed}
          onCancel={onCancelTrim}
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
            onDownloaded={onVideoDownloaded}
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
