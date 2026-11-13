"use client";

import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonClass } from "@/components/workbench/button";
import { Icon } from "@/components/workbench/icon";
import { iconButtonClass } from "@/components/workbench/icon-button";
import { KeyValueList } from "@/components/workbench/key-value-list";
import { StatusChip } from "@/components/workbench/status-chip";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { buildCloneSourceUrlHandoffHref } from "@/lib/ugc-clone-handoff";
import type { InspirationVideoCard } from "@/lib/inspiration/types";
import {
  formatDuration,
  formatMetric,
  formatPublishedDate,
  getInspirationThumbnailSrc,
  inspirationSourceStatusLabel,
  inspirationStatusTone,
} from "./inspiration-models";
import type { InspirationWorkspace } from "./types";

export function InspirationPreviewDialog({ workspace }: { workspace: InspirationWorkspace }) {
  const { setSelectedVideoId, selectedVideo } = workspace;

  return (
    <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideoId(null)}>
      <DialogContent
        showCloseButton={false}
        data-source-preview-drawer="true"
        className="w-[calc(100vw-2rem)] max-w-[880px] gap-0 overflow-y-auto p-0 sm:max-w-[880px] lg:h-[min(680px,calc(100dvh-2rem))] lg:overflow-hidden"
      >
        {selectedVideo && <PreviewBody video={selectedVideo} workspace={workspace} />}
      </DialogContent>
    </Dialog>
  );
}

const STATUS_CHIP_TONE = { used: "ok", rejected: "bad", fresh: "neutral" } as const;

function PreviewBody({
  video,
  workspace,
}: {
  video: InspirationVideoCard;
  workspace: InspirationWorkspace;
}) {
  const {
    updatingRejectionIds,
    copiedVideoId,
    handleSetVideoRejection,
    handleCopySourceUrl,
  } = workspace;
  const tone = inspirationStatusTone(video);
  const isUpdating = updatingRejectionIds.includes(video.id);

  return (
    <div className="grid min-h-0 lg:h-full lg:grid-cols-[minmax(0,1fr)_320px]">
      <PreviewStage video={video} workspace={workspace} />
      <aside className="flex min-h-0 min-w-0 flex-col gap-3.5 px-5 pt-[18px] pb-5 lg:overflow-y-auto">
        <div className="wb-panel-head">
          <DialogTitle className="wb-panel-title">Preview</DialogTitle>
          <DialogClose className={iconButtonClass("quiet", 30)} aria-label="Close preview">
            <Icon name="x" size={14} />
          </DialogClose>
        </div>

        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-media text-[12px] font-semibold text-fg-secondary">
            {video.creatorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.creatorAvatarUrl} alt="" className="size-full object-cover" />
            ) : (
              video.creatorHandle.slice(1, 3).toUpperCase()
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] leading-[18px] font-semibold text-fg">
              {video.creatorDisplayName || video.creatorHandle}
            </span>
            <span className="truncate text-[12px] leading-4 text-fg-muted">{video.creatorHandle}</span>
          </span>
          <StatusChip tone={STATUS_CHIP_TONE[tone]}>{inspirationSourceStatusLabel(video)}</StatusChip>
        </div>

        {video.caption ? (
          <p className="line-clamp-5 min-w-0 text-[13px] leading-[18px] break-words text-fg-secondary [overflow-wrap:anywhere]">
            {video.caption}
          </p>
        ) : null}

        <KeyValueList
          rows={[
            { label: "Views", value: formatMetric(video.viewCount), mono: true },
            { label: "Likes", value: formatMetric(video.likeCount), mono: true },
            { label: "Comments", value: formatMetric(video.commentCount), mono: true },
            { label: "Shares", value: formatMetric(video.shareCount), mono: true },
            { label: "Duration", value: formatDuration(video.durationSec) ?? "-", mono: true },
            { label: "Published", value: formatPublishedDate(video.publishedAt), mono: true },
            { label: "Source use", value: sourceUseLabel(video) },
          ]}
        />

        <div className="mt-auto flex flex-col gap-2 border-t border-hairline pt-4">
          <div className="flex gap-2">
            <Button size={38} className="flex-1 px-0" onClick={() => void handleCopySourceUrl(video)}>
              {copiedVideoId === video.id ? "Copied" : "Copy URL"}
            </Button>
            <a
              href={video.originalUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonClass("quiet", 38), "flex-1 px-0")}
            >
              Open
            </a>
            {tone === "rejected" ? (
              <Button
                size={38}
                className="flex-1 px-0"
                disabled={isUpdating}
                onClick={() => void handleSetVideoRejection(video, false)}
              >
                {isUpdating ? "Restoring" : "Restore"}
              </Button>
            ) : (
              <Button
                variant="danger"
                size={38}
                className="flex-1 px-0"
                disabled={isUpdating}
                onClick={() => void handleSetVideoRejection(video, true)}
              >
                {isUpdating ? "Rejecting" : "Reject"}
              </Button>
            )}
          </div>
          {tone !== "rejected" && (
            <a
              href={buildCloneSourceUrlHandoffHref(video.originalUrl)}
              data-source-action="use-in-clone"
              className={cn(buttonClass("primary", 40, true), "flex-none")}
            >
              {tone === "used" ? "Use again" : "Use in Clone"}
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}

function sourceUseLabel(video: InspirationVideoCard) {
  if (video.sourceDecision.status === "rejected" && video.sourceDecision.rejectedAt) {
    return `Rejected ${formatRelativeDate(video.sourceDecision.rejectedAt)}`;
  }
  if (video.sourceUsage.status === "used" && video.sourceUsage.usedAt) {
    return `Used ${formatRelativeDate(video.sourceUsage.usedAt)}`;
  }
  return "Not used yet";
}

function PreviewStage({
  video,
  workspace,
}: {
  video: InspirationVideoCard;
  workspace: InspirationWorkspace;
}) {
  const { embedState, setEmbedState, thumbnailErrorIds, markThumbnailError, clearThumbnailError } =
    workspace;
  const thumbnailFailed = thumbnailErrorIds.includes(video.id);

  return (
    <div className="flex min-h-[320px] min-w-0 items-center justify-center bg-well p-4 lg:p-6">
      <div className="relative aspect-[9/16] h-[min(60dvh,560px)] max-w-full overflow-hidden rounded-lg bg-media lg:h-full">
        {embedState !== "failed" && (
          <iframe
            key={video.id}
            src={video.embedUrl ?? `https://www.tiktok.com/embed/v3/${video.externalVideoId}`}
            title={`TikTok preview for ${video.creatorHandle}`}
            className={cn(
              "size-full transition-opacity duration-[var(--pf-dur-state)] ease-pf",
              embedState === "loading" ? "opacity-0" : "opacity-100"
            )}
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            onLoad={() => setEmbedState("ready")}
            onError={() => setEmbedState("failed")}
          />
        )}

        {embedState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-fg-secondary">
            <span className="flex size-11 items-center justify-center rounded-full bg-[var(--pf-scrim)] text-[var(--pf-on-media)]">
              <Icon name="clock" size={18} />
            </span>
            <p className="text-[13px] font-medium">Loading TikTok preview</p>
          </div>
        )}

        {embedState === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-end">
            {!thumbnailFailed && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getInspirationThumbnailSrc(video.id, video.updatedAt)}
                alt=""
                className="absolute inset-0 size-full object-cover"
                onError={() => markThumbnailError(video.id)}
                onLoad={() => clearThumbnailError(video.id)}
              />
            )}
            <p className="relative m-3 rounded-full bg-[var(--pf-scrim)] px-3 py-1.5 text-[12px] font-semibold text-[var(--pf-on-media)]">
              TikTok preview unavailable
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
