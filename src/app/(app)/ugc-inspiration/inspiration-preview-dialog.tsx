"use client";

import {
  Ban,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  Sparkles,
  Undo2,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDuration,
  formatMetric,
  formatPublishedDate,
  getInspirationThumbnailSrc,
  inspirationSourceStatusLabel,
  inspirationStatusPillClass,
} from "./inspiration-models";
import type { InspirationWorkspace } from "./types";

export function InspirationPreviewDialog({
  workspace,
}: {
  workspace: InspirationWorkspace;
}) {
  const {
    setSelectedVideoId,
    selectedVideo,
    embedState,
    setEmbedState,
    thumbnailErrorIds,
    updatingRejectionIds,
    copiedVideoId,
    handleSetVideoRejection,
    handleUseInClone,
    handleCopySourceUrl,
    markThumbnailError,
    clearThumbnailError,
  } = workspace;
  const statusLabel = selectedVideo
    ? inspirationSourceStatusLabel(selectedVideo)
    : null;
  const isRejected = selectedVideo?.sourceDecision.status === "rejected";
  const isUpdatingRejection = selectedVideo
    ? updatingRejectionIds.includes(selectedVideo.id)
    : false;

  return (
    <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideoId(null)}>
      <DialogContent
        showCloseButton
        data-source-preview-drawer="true"
        className="!w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto rounded-[8px] p-0 sm:!max-w-6xl lg:overflow-hidden [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:z-20"
      >
        <DialogTitle className="sr-only">Source preview</DialogTitle>
        {selectedVideo && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="relative flex min-h-[300px] items-center justify-center bg-[#09090B] lg:min-h-[560px]">
              {embedState !== "failed" && (
                <iframe
                  key={selectedVideo.id}
                  src={
                    selectedVideo.embedUrl ??
                    `https://www.tiktok.com/embed/v3/${selectedVideo.externalVideoId}`
                  }
                  title={`TikTok preview for ${selectedVideo.creatorHandle}`}
                  className={cn(
                    "size-full min-h-[300px] lg:min-h-[560px]",
                    embedState === "loading" && "opacity-0"
                  )}
                  allow="encrypted-media; picture-in-picture"
                  allowFullScreen
                  onLoad={() => setEmbedState("ready")}
                  onError={() => setEmbedState("failed")}
                />
              )}

              {embedState === "loading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                  <Loader2 className="size-6 animate-spin" />
                  <p className="text-[13px] font-medium">Loading TikTok preview...</p>
                </div>
              )}

              {embedState === "failed" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
                  {!thumbnailErrorIds.includes(selectedVideo.id) ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getInspirationThumbnailSrc(
                          selectedVideo.id,
                          selectedVideo.updatedAt
                        )}
                        alt={
                          selectedVideo.caption ||
                          `${selectedVideo.creatorHandle} TikTok`
                        }
                        className="max-h-[42dvh] max-w-full object-contain lg:max-h-[calc(100dvh-8rem)]"
                        onError={() => markThumbnailError(selectedVideo.id)}
                        onLoad={() => clearThumbnailError(selectedVideo.id)}
                      />
                    </>
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-[8px] bg-white/10">
                      <Play className="size-8" />
                    </div>
                  )}
                  <div>
                    <p className="text-[15px] font-semibold">
                      TikTok preview unavailable
                    </p>
                    <p className="mt-1.5 max-w-md text-[13px] text-white/60">
                      The embed could not load for this post. You can still
                      open it on TikTok or send it directly into Clone.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-[var(--pf-border)] bg-[var(--pf-surface)] p-5 lg:max-h-[calc(100dvh-2rem)] lg:border-l lg:border-t-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    inspirationStatusPillClass(selectedVideo)
                  )}
                >
                  {statusLabel}
                </span>
                <span className="pf-data text-[12px] text-[var(--pf-muted)]">
                  {formatDuration(selectedVideo.durationSec)} ·{" "}
                  {formatRelativeDate(
                    selectedVideo.publishedAt ?? selectedVideo.createdAt
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  <AvatarImage
                    src={selectedVideo.creatorAvatarUrl ?? undefined}
                    alt={selectedVideo.creatorHandle}
                  />
                  <AvatarFallback>
                    {selectedVideo.creatorHandle.slice(1, 3).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--pf-ink)]">
                    {selectedVideo.creatorDisplayName || selectedVideo.creatorHandle}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--pf-muted)]">
                    {selectedVideo.creatorHandle}
                  </p>
                </div>
              </div>

              {selectedVideo.caption && (
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)]">
                    Caption
                  </p>
                  <p className="mt-1.5 min-w-0 break-words text-[13px] leading-5 text-[var(--pf-ink)]/80 [overflow-wrap:anywhere] line-clamp-5">
                    {selectedVideo.caption}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["Views", selectedVideo.viewCount],
                    ["Likes", selectedVideo.likeCount],
                    ["Comments", selectedVideo.commentCount],
                    ["Shares", selectedVideo.shareCount],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="pf-card flex items-baseline justify-between gap-2 px-3 py-2"
                  >
                    <p className="truncate text-[11px] text-[var(--pf-muted)]">{label}</p>
                    <p className="pf-data text-[13px] font-semibold tabular-nums text-[var(--pf-ink)]">
                      {formatMetric(value)}
                    </p>
                  </div>
                ))}
              </div>

              <dl className="divide-y divide-[var(--pf-border)] border-y border-[var(--pf-border)]">
                <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                  <dt className="text-[var(--pf-muted)]">Published</dt>
                  <dd className="pf-data text-[var(--pf-ink)]">
                    {formatPublishedDate(selectedVideo.publishedAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                  <dt className="text-[var(--pf-muted)]">Source use</dt>
                  <dd className="text-[var(--pf-ink)]">
                    {selectedVideo.sourceUsage.status === "used" &&
                    selectedVideo.sourceUsage.usedAt
                      ? `Used ${formatRelativeDate(selectedVideo.sourceUsage.usedAt)}`
                      : "Not used yet"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                  <dt className="text-[var(--pf-muted)]">Decision</dt>
                  <dd className="text-[var(--pf-ink)]">
                    {selectedVideo.sourceDecision.status === "rejected" &&
                    selectedVideo.sourceDecision.rejectedAt
                      ? `Rejected ${formatRelativeDate(selectedVideo.sourceDecision.rejectedAt)}`
                      : "Approved"}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto flex flex-col gap-2 border-t border-[var(--pf-border)] pt-4">
                {isRejected ? (
                  <button
                    type="button"
                    onClick={() => void handleSetVideoRejection(selectedVideo, false)}
                    disabled={isUpdatingRejection}
                    className="pf-button-secondary h-10 text-[13px]"
                  >
                    {isUpdatingRejection ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Restoring source...
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
                    onClick={() => handleUseInClone(selectedVideo)}
                    className="pf-button-primary h-10"
                  >
                    Use in Clone
                    <Sparkles className="size-4" />
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopySourceUrl(selectedVideo)}
                    className="pf-button-secondary h-10 text-[13px]"
                  >
                    {copiedVideoId === selectedVideo.id ? (
                      <>
                        Copied
                        <CheckCircle2 className="size-4" />
                      </>
                    ) : (
                      <>
                        Copy URL
                        <Copy className="size-4" />
                      </>
                    )}
                  </button>
                  <a
                    href={selectedVideo.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="pf-button-secondary h-10 text-[13px]"
                  >
                    Open
                    <ExternalLink className="size-4" />
                  </a>
                </div>

                {selectedVideo.sourceDecision.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => void handleSetVideoRejection(selectedVideo, true)}
                    disabled={isUpdatingRejection}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] text-[12px] font-medium text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingRejection ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Rejecting source...
                      </>
                    ) : (
                      <>
                        Reject Source
                        <Ban className="size-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
