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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import type { InspirationVideoCard } from "@/lib/inspiration/types";
import {
  formatDuration,
  formatMetric,
  getInspirationThumbnailSrc,
  inspirationSourceStatusLabel,
} from "./inspiration-models";
import type { InspirationWorkspace } from "./use-inspiration-workspace";

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

  return (
    <article
      data-inspiration-video-id={video.id}
      data-source-decision={video.sourceDecision.status}
      className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--pf-shadow-2xs)] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-foreground/20 hover:shadow-[var(--pf-shadow-md)]"
    >
      <button
        type="button"
        aria-label={`Preview source from ${video.creatorHandle}`}
        onClick={() => setSelectedVideoId(video.id)}
        className="relative block w-full overflow-hidden bg-black text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div
          data-source-preview-frame="portrait"
          className="aspect-[9/16] bg-zinc-950"
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
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Play className="size-8" />
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="flex max-w-[70%] flex-wrap gap-1.5">
            <span
              className={cn(
                "rounded-full border px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm",
                isRejected
                  ? "border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/90"
                  : video.sourceUsage.status === "used"
                    ? "border-[var(--pf-success)]/40 bg-[var(--pf-success)]/85"
                    : "border-white/15 bg-black/65"
              )}
            >
              {statusLabel}
            </span>
          </span>
          <span className="rounded-full bg-black/65 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {formatRelativeDate(video.publishedAt ?? video.createdAt)}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent px-3 pb-3 pt-14 text-white">
          <div className="grid grid-cols-2 gap-2 text-[11px] text-white/85">
            <div className="flex items-center gap-1.5">
              <Play className="size-3" />
              <span>{formatDuration(video.durationSec)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="size-3" />
              <span>{formatMetric(video.likeCount)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="size-3" />
              <span>{formatMetric(video.commentCount)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Repeat2 className="size-3" />
              <span>{formatMetric(video.shareCount)}</span>
            </div>
          </div>
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            <AvatarImage src={video.creatorAvatarUrl ?? undefined} alt={video.creatorHandle} />
            <AvatarFallback>{video.creatorHandle.slice(1, 3).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">{video.creatorHandle}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{formatRelativeDate(video.publishedAt ?? video.createdAt)}</span>
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">{formatMetric(video.viewCount)} views</span>
        </div>
        <p className="line-clamp-2 min-h-10 text-xs leading-5 text-foreground/80">
          {video.caption || "No caption provided."}
        </p>
        {video.sourceUsage.status === "used" && video.sourceUsage.usedAt && (
          <p className="rounded-md border border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 px-2.5 py-1.5 text-[11px] font-medium text-[var(--pf-success)]">
            Used as a source {formatRelativeDate(video.sourceUsage.usedAt)}
          </p>
        )}

        {isRejected && video.sourceDecision.rejectedAt && (
          <p className="rounded-md border border-[var(--pf-danger)]/30 bg-[var(--pf-danger)]/10 px-2.5 py-1.5 text-[11px] font-medium text-[var(--pf-danger)]">
            Rejected as a source {formatRelativeDate(video.sourceDecision.rejectedAt)}
          </p>
        )}

        {isRejected ? (
          <Button
            type="button"
            variant="outline"
            data-source-action="restore"
            onClick={() => void handleSetVideoRejection(video, false)}
            disabled={isUpdatingRejection}
            className="mt-auto h-9 w-full rounded-md border-border bg-background text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
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
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => handleUseInClone(video)}
            className="mt-auto h-9 w-full rounded-md bg-[var(--pf-orange)] text-xs font-semibold text-white hover:brightness-[0.93]"
          >
            Use in Clone
            <Sparkles className="size-4" />
          </Button>
        )}

        <div
          className={cn(
            "grid gap-1.5",
            isRejected
              ? "grid-cols-[minmax(0,1fr)_2rem_2rem]"
              : "grid-cols-[minmax(0,1fr)_2rem_2rem_2rem_2rem]"
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedVideoId(video.id)}
            className="h-8 min-w-0 rounded-md px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <Eye className="size-3.5" />
            Preview
          </Button>

          {!isRejected && (
            <Button
              type="button"
              variant="outline"
              data-source-action="reject"
              onClick={() => void handleSetVideoRejection(video, true)}
              disabled={isUpdatingRejection}
              aria-label={`Reject source from ${video.creatorHandle}`}
              size="icon-sm"
              className="size-8 rounded-md border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdatingRejection ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Ban className="size-3.5" />
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            onClick={() => void handleCopySourceUrl(video)}
            aria-label={
              copiedVideoId === video.id
                ? `Copied source URL for ${video.creatorHandle}`
                : `Copy source URL for ${video.creatorHandle}`
            }
            className="size-8 rounded-md text-muted-foreground hover:text-foreground"
          >
            {copiedVideoId === video.id ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>

          <a
            href={video.originalUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open original source from ${video.creatorHandle}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-lg" }),
              "size-8 rounded-md text-muted-foreground hover:text-foreground"
            )}
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
