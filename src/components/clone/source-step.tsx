import { cn } from "@/lib/utils";
import { MediaPreviewFrame } from "@/components/media-preview";
import { TikTokInput, type TikTokVideoInfo } from "@/components/tiktok-input";
import { VideoTrimmer } from "@/components/video-trimmer";

export function CloneSourceStep({
  hidden,
  sourceReady,
  videoInfo,
  originalVideoInfo,
  sourcePreviewSrc,
  showTrimmer,
  sourceToolsOpen,
  shouldShowSourceTools,
  sourcesRefreshKey,
  pendingSourceId,
  onToggleTrim,
  onTogglePicker,
  onTrimmed,
  onCancelTrim,
  onVideoDownloaded,
  onPreselectedSourceResolved,
}: {
  hidden: boolean;
  sourceReady: boolean;
  videoInfo: TikTokVideoInfo | null;
  originalVideoInfo: TikTokVideoInfo | null;
  sourcePreviewSrc: string | null;
  showTrimmer: boolean;
  sourceToolsOpen: boolean;
  shouldShowSourceTools: boolean;
  sourcesRefreshKey: number;
  pendingSourceId: string | null;
  onToggleTrim: () => void;
  onTogglePicker: () => void;
  onTrimmed: (info: {
    localPath: string;
    filename: string;
    durationSec: number;
    width: number;
    height: number;
  }) => void;
  onCancelTrim: () => void;
  onVideoDownloaded: (info: TikTokVideoInfo | null) => void;
  onPreselectedSourceResolved: (result: {
    status: "selected" | "missing";
    sourceId: string;
  }) => void;
}) {
  return (
    <section
      data-clone-source-section="true"
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)] sm:p-5",
        hidden && "hidden"
      )}
    >
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Source &amp; trim
            </h2>
            <p className="text-xs text-muted-foreground">
              Choose the clip and trim the part to clone.
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
            className="text-xs font-semibold text-accent-blue transition-colors hover:text-accent-blue/80"
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
              onPreselectedSourceResolved={onPreselectedSourceResolved}
            />
          </div>
        )}
      </div>
    </section>
  );
}
