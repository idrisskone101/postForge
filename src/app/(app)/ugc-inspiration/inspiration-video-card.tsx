"use client";

import {
  Ban,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Play,
  Repeat2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import type { InspirationVideoCard } from "@/lib/inspiration/types";
import {
  formatDuration,
  formatMetric,
  getInspirationThumbnailSrc,
  inspirationSourceStatusLabel,
  inspirationStatusDotClass,
  inspirationStatusPillClass,
  inspirationStatusTone,
} from "./inspiration-models";
import type { InspirationWorkspace } from "./types";

export function InspirationVideoCard({
  video,
  workspace,
}: {
  video: InspirationVideoCard;
  workspace: InspirationWorkspace;
}) {
  const {
    thumbnailErrorIds,
    updatingRejectionIds,
    copiedVideoId,
    setSelectedVideoId,
    handleSetVideoRejection,
    handleUseInClone,
    handleCopySourceUrl,
    markThumbnailError,
    clearThumbnailError,
  } = workspace;
  const thumbnailFailed = thumbnailErrorIds.includes(video.id);
  const isRejected = video.sourceDecision.status === "rejected";
  const isUpdatingRejection = updatingRejectionIds.includes(video.id);
  const statusLabel = inspirationSourceStatusLabel(video);
  const tone = inspirationStatusTone(video);

  return (
    <article
      data-inspiration-video-id={video.id}
      data-source-decision={video.sourceDecision.status}
      className="pf-card pf-card-hover group flex min-w-0 flex-col overflow-hidden"
    >
      <button
        type="button"
        aria-label={`Preview source from ${video.creatorHandle}`}
        onClick={() => setSelectedVideoId(video.id)}
        className="relative block w-full overflow-hidden bg-[#09090B] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/40 focus-visible:ring-inset"
      >
        <div
          data-source-preview-frame="portrait"
          className="aspect-[9/16] bg-[#09090B]"
        >
          {!thumbnailFailed ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getInspirationThumbnailSrc(video.id, video.updatedAt)}
                alt={video.caption || `${video.creatorHandle} TikTok`}
                className="size-full object-contain"
                loading="lazy"
                onError={() => markThumbnailError(video.id)}
                onLoad={() => clearThumbnailError(video.id)}
              />
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-[var(--pf-muted)]">
              <Play className="size-8" />
            </div>
          )}
        </div>

        <span className="pointer-events-none absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          <span
            className={cn("size-1.5 shrink-0 rounded-full", inspirationStatusDotClass(video))}
            aria-hidden="true"
          />
          {statusLabel}
        </span>
        <span className="pf-data pointer-events-none absolute bottom-2 right-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          {formatDuration(video.durationSec)}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-6 shrink-0 overflow-hidden rounded-full border border-[var(--pf-border)]">
            {video.creatorAvatarUrl ? (
              <img
                src={video.creatorAvatarUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center bg-[var(--pf-active)] text-[9px] font-semibold text-[var(--pf-muted)]">
                {video.creatorHandle.slice(1, 3).toUpperCase()}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold text-[var(--pf-ink)]">
              {video.creatorHandle}
            </span>
            <span className="pf-data mt-0.5 block text-[11px] text-[var(--pf-muted)]">
              {formatRelativeDate(video.publishedAt ?? video.createdAt)}
            </span>
          </span>
          <span className="pf-data text-[11px] font-medium text-[var(--pf-muted)]">
            {formatMetric(video.viewCount)} views
          </span>
        </div>
        <p className="line-clamp-2 min-h-10 text-[12px] leading-5 text-[var(--pf-ink)]/80">
          {video.caption || "No caption provided."}
        </p>
        <div className="grid grid-cols-3 gap-2 text-[11px] text-[var(--pf-muted)]">
          <span className="flex items-center gap-1.5">
            <Heart className="size-3" />
            <span className="pf-data">{formatMetric(video.likeCount)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="size-3" />
            <span className="pf-data">{formatMetric(video.commentCount)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Repeat2 className="size-3" />
            <span className="pf-data">{formatMetric(video.shareCount)}</span>
          </span>
        </div>
        {tone === "used" && video.sourceUsage.usedAt ? (
          <p
            className={cn(
              inspirationStatusPillClass(video),
              "inline-flex w-fit items-center rounded-full px-2.5 py-1.5 text-[11px] font-medium"
            )}
          >
            Used as a source {formatRelativeDate(video.sourceUsage.usedAt)}
          </p>
        ) : null}

        {tone === "rejected" && video.sourceDecision.rejectedAt ? (
          <p
            className={cn(
              inspirationStatusPillClass(video),
              "inline-flex w-fit items-center rounded-full px-2.5 py-1.5 text-[11px] font-medium"
            )}
          >
            Rejected as a source {formatRelativeDate(video.sourceDecision.rejectedAt)}
          </p>
        ) : null}

        {isRejected ? (
          <button
            type="button"
            data-source-action="restore"
            onClick={() => void handleSetVideoRejection(video, false)}
            disabled={isUpdatingRejection}
            className="pf-button-secondary mt-auto h-9 w-full text-[12px]"
          >
            {isUpdatingRejection ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                Restore Source
                <Undo2 className="size-4" />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleUseInClone(video)}
            className="pf-button-primary mt-auto h-9 w-full text-[12px]"
          >
            Use in Clone
            <Sparkles className="size-4" />
          </button>
        )}

        <div
          className={cn(
            "grid gap-1.5",
            isRejected
              ? "grid-cols-[minmax(0,1fr)_2rem_2rem]"
              : "grid-cols-[minmax(0,1fr)_2rem_2rem_2rem_2rem]"
          )}
        >
          <button
            type="button"
            onClick={() => setSelectedVideoId(video.id)}
            className="pf-button-secondary h-8 min-w-0 px-2 text-[11px] text-[var(--pf-muted)]"
          >
            <Eye className="size-3.5" />
            Preview
          </button>

          {!isRejected && (
            <button
              type="button"
              data-source-action="reject"
              onClick={() => void handleSetVideoRejection(video, true)}
              disabled={isUpdatingRejection}
              aria-label={`Reject source from ${video.creatorHandle}`}
              className="inline-flex size-8 items-center justify-center rounded-[8px] border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdatingRejection ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Ban className="size-3.5" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleCopySourceUrl(video)}
            aria-label={
              copiedVideoId === video.id
                ? `Copied source URL for ${video.creatorHandle}`
                : `Copy source URL for ${video.creatorHandle}`
            }
            className="inline-flex size-8 items-center justify-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)]"
          >
            {copiedVideoId === video.id ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>

          <a
            href={video.originalUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open original source from ${video.creatorHandle}`}
            className="inline-flex size-8 items-center justify-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)]"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
