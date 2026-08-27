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
    sourceToolsOpen,
    shouldShowSourceTools,
    sourcesRefreshKey,
    pendingSourceId,
    pendingSourceUrl,
    onToggleTrim,
    onTogglePicker,
    onTrimmed,
    onCancelTrim,
    onVideoDownloaded,
    onPreselectedSourceResolved,
  } = draft;
  return (
    <section
      data-clone-source-section="true"
      className={cn(
        "pf-card p-4 sm:p-5",
        hidden && "hidden"
      )}
    >
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="pf-section-title">Source &amp; trim</h2>
            <p
              data-clone-copy="Choose the clip and trim the part to clone."
              className="mt-1"
            >
              <span className="sr-only">
                Choose the clip and trim the part to clone.
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sourceReady && (
            <button
              type="button"
              onClick={onToggleTrim}
              className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {showTrimmer ? "Close trim" : "Trim source"}
            </button>
          )}
          <button
            type="button"
            onClick={onTogglePicker}
            className="text-xs font-semibold text-[var(--pf-link)] transition-colors hover:underline"
          >
            {sourceReady
              ? sourceToolsOpen
                ? "Close picker"
                : "Replace source"
              : "Choose source"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {sourceReady && videoInfo && sourcePreviewSrc && (
          showTrimmer && originalVideoInfo ? (
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
          ) : (
            <div
              data-clone-source-selected-preview="true"
              className="mx-auto w-full max-w-[320px]"
            >
              <MediaPreviewFrame
                type="video"
                src={sourcePreviewSrc}
                width={videoInfo.width}
                height={videoInfo.height}
                alt={videoInfo.label || "Selected source preview"}
                variant="card"
                frameAspectRatio="9/16"
                className="w-full border border-border"
                mediaClassName="rounded-none"
              />
            </div>
          )
        )}

        {shouldShowSourceTools && (
          <div className="rounded-lg border border-dashed border-border bg-muted/25 p-4">
            <TikTokInput
              onDownloaded={onVideoDownloaded}
              videoInfo={videoInfo}
              refreshKey={sourcesRefreshKey}
              preselectedSourceId={sourceReady ? null : pendingSourceId}
              handoffSourceUrl={sourceReady ? null : pendingSourceUrl}
              onPreselectedSourceResolved={onPreselectedSourceResolved}
            />
          </div>
        )}
      </div>
    </section>
  );
}
