"use client";

import type { ReactNode } from "react";
import { MediaImage } from "@/components/workbench/media-image";
import { MediaTile } from "@/components/workbench/media-tile";
import { cn } from "@/lib/utils";
import { buildCloneSourceUrlHandoffHref } from "@/lib/ugc-clone-handoff";
import type { InspirationVideoCard as InspirationVideo } from "@/lib/inspiration/types";
import {
  formatDuration,
  formatMetric,
  getInspirationThumbnailSrc,
  inspirationStatusBadge,
  inspirationStatusTone,
  inspirationVideoTitle,
} from "./inspiration-models";
import type { InspirationWorkspace } from "./types";

export function InspirationVideoCard({
  video,
  workspace,
}: {
  video: InspirationVideo;
  workspace: InspirationWorkspace;
}) {
  const {
    thumbnailErrorIds,
    updatingRejectionIds,
    setSelectedVideoId,
    handleSetVideoRejection,
    markThumbnailError,
    clearThumbnailError,
  } = workspace;
  const thumbnailFailed = thumbnailErrorIds.includes(video.id);
  const tone = inspirationStatusTone(video);
  const isUpdating = updatingRejectionIds.includes(video.id);
  const title = inspirationVideoTitle(video);
  const preview = () => setSelectedVideoId(video.id);

  return (
    <article
      data-inspiration-video-id={video.id}
      data-source-decision={video.sourceDecision.status}
      className="wb-tile-cell"
    >
      <MediaTile
        className={workspace.largeTiles ? "aspect-[9/16]" : TILE_ASPECT_CLASS}
        state={{ status: inspirationStatusBadge(video), duration: formatDuration(video.durationSec) }}
        actions={
          <>
            <button type="button" className="wb-tile-action" onClick={preview}>
              Preview
            </button>
            {tone === "rejected" ? (
              <a
                href={video.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="wb-tile-action"
                aria-label={`Open original source from ${video.creatorHandle}`}
              >
                Open
              </a>
            ) : (
              <button
                type="button"
                data-source-action="reject"
                className="wb-tile-action"
                disabled={isUpdating}
                aria-label={`Reject source from ${video.creatorHandle}`}
                onClick={() => void handleSetVideoRejection(video, true)}
              >
                {isUpdating ? "Rejecting" : "Reject"}
              </button>
            )}
          </>
        }
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Preview source from ${video.creatorHandle}`}
          onClick={preview}
          data-source-preview-frame="portrait"
          className="relative block size-full cursor-pointer"
        >
          {thumbnailFailed ? (
            <span
              data-inspiration-thumbnail="missing"
              className="flex size-full flex-col items-center justify-center gap-2 bg-media px-3"
            >
              <span aria-hidden="true" className="text-fg-muted">
                <PlayGlyph size={28} />
              </span>
              <span className="max-w-full truncate text-[12px] leading-4 text-fg-secondary">
                {video.creatorHandle}
              </span>
            </span>
          ) : (
            <>
              <MediaImage
                src={getInspirationThumbnailSrc(video.id, video.updatedAt)}
                alt=""
                loading="lazy"
                decoding="async"
                className="block size-full object-cover"
                onError={() => markThumbnailError(video.id)}
                onLoad={() => clearThumbnailError(video.id)}
              />
              <span
                aria-hidden="true"
                className="absolute bottom-2 left-2 flex size-[26px] items-center justify-center rounded-full bg-[var(--pf-scrim)] text-[var(--pf-on-media)]"
              >
                <PlayGlyph />
              </span>
            </>
          )}
        </button>
      </MediaTile>

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="wb-tile-title" title={title}>
          {title}
        </span>
        <span className="flex items-center gap-2.5 text-[12px] leading-4 text-fg-secondary">
          <Metric label="Views" value={video.viewCount} glyph={<EyeGlyph />} />
          <Metric label="Likes" value={video.likeCount} glyph={<HeartGlyph />} />
        </span>
      </div>

      <TileFootAction video={video} workspace={workspace} />
    </article>
  );
}

export const TILE_ASPECT_CLASS = "aspect-[9/16] @[680px]:aspect-[129/266]";

const FOOT_CLASS =
  "inline-flex h-[30px] w-full items-center justify-center rounded-full text-[12px] leading-4 font-semibold transition-[background-color,transform] duration-[var(--pf-dur-feedback)] ease-pf active:scale-[0.98] disabled:cursor-default disabled:text-fg-disabled [@media(hover:none)]:h-10";

const OUTLINE_FOOT_CLASS =
  "text-fg-secondary shadow-[inset_0_0_0_1px_var(--pf-outline)] hover:bg-raised dark:shadow-[inset_0_0_0_1px_var(--pf-strong)]";

function TileFootAction({
  video,
  workspace,
}: {
  video: InspirationVideo;
  workspace: InspirationWorkspace;
}) {
  const tone = inspirationStatusTone(video);
  const isUpdating = workspace.updatingRejectionIds.includes(video.id);

  if (tone === "rejected") {
    return (
      <button
        type="button"
        data-source-action="restore"
        disabled={isUpdating}
        onClick={() => void workspace.handleSetVideoRejection(video, false)}
        className={cn(FOOT_CLASS, OUTLINE_FOOT_CLASS)}
      >
        {isUpdating ? "Restoring" : "Restore"}
      </button>
    );
  }

  return (
    <a
      href={buildCloneSourceUrlHandoffHref(video.originalUrl)}
      data-source-action="use-in-clone"
      aria-label={`${tone === "used" ? "Use again" : "Use in Clone"}: source from ${video.creatorHandle}`}
      className={cn(
        FOOT_CLASS,
        tone === "used"
          ? OUTLINE_FOOT_CLASS
          : "bg-raised text-fg hover:bg-raised-strong"
      )}
    >
      {tone === "used" ? "Use again" : "Use in Clone"}
    </a>
  );
}

function Metric({ label, value, glyph }: { label: string; value: number | null; glyph: ReactNode }) {
  return (
    <span className="flex items-center gap-1" title={label}>
      <span aria-hidden="true" className="text-fg-muted">
        {glyph}
      </span>
      {formatMetric(value)}
      <span className="sr-only">{label.toLowerCase()}</span>
    </span>
  );
}

function PlayGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M8 5.5l10.5 6.5L8 18.5z" />
    </svg>
  );
}

function EyeGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function HeartGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M12 19.5s-7-4.3-7-9.3A3.9 3.9 0 0 1 12 7.9a3.9 3.9 0 0 1 7 2.3c0 5-7 9.3-7 9.3z" />
    </svg>
  );
}
