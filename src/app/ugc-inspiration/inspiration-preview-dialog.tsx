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
import { Button, buttonVariants } from "@/components/ui/button";
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
} from "./inspiration-models";
import type { InspirationWorkspace } from "./use-inspiration-workspace";

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
    usingVideoId,
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

  return (
    <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideoId(null)}>
      <DialogContent
        showCloseButton
        data-source-preview-drawer="true"
        className="!w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto rounded-[12px] p-0 sm:!max-w-6xl lg:overflow-hidden [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:z-20"
      >
        <DialogTitle className="sr-only">Source preview</DialogTitle>
        {selectedVideo && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="relative flex min-h-[300px] items-center justify-center bg-[#09090B] lg:min-h-[560px]">
              {embedState !== "failed" && (
                <iframe
                  key={selectedVideo.id}
                  src={selectedVideo.embedUrl ?? `https://www.tiktok.com/embed/v3/${selectedVideo.externalVideoId}`}
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
                        alt={selectedVideo.caption || `${selectedVideo.creatorHandle} TikTok`}
                        className="max-h-[42dvh] max-w-full object-contain lg:max-h-[calc(100dvh-8rem)]"
                        onError={() => markThumbnailError(selectedVideo.id)}
                        onLoad={() => clearThumbnailError(selectedVideo.id)}
                      />
                    </>
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-lg bg-white/10">
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

            <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-border bg-card p-5 lg:max-h-[calc(100dvh-2rem)] lg:border-l lg:border-t-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    isRejected
                      ? "border-[var(--pf-danger)]/30 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                      : selectedVideo.sourceUsage.status === "used"
                        ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                        : "border-[var(--pf-border)] bg-[var(--pf-active)] text-muted-foreground"
                  )}
                >
                  {statusLabel}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {formatDuration(selectedVideo.durationSec)} · {formatRelativeDate(selectedVideo.publishedAt ?? selectedVideo.createdAt)}
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
                  <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                    {selectedVideo.creatorDisplayName || selectedVideo.creatorHandle}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {selectedVideo.creatorHandle}
                  </p>
                </div>
              </div>

              {selectedVideo.caption && (
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Caption
                  </p>
                  <p className="mt-1.5 min-w-0 break-words text-[13px] leading-5 text-foreground/80 [overflow-wrap:anywhere] line-clamp-5">
                    {selectedVideo.caption}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {([
                  ["Views", selectedVideo.viewCount],
                  ["Likes", selectedVideo.likeCount],
                  ["Comments", selectedVideo.commentCount],
                  ["Shares", selectedVideo.shareCount],
                ] as const).map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-[var(--pf-shadow-2xs)]">
                    <p className="truncate text-[11px] text-muted-foreground">{label}</p>
                    <p className="text-[13px] font-semibold tabular-nums">
                      {formatMetric(value)}
                    </p>
                  </div>
                ))}
              </div>

              <dl className="divide-y divide-border border-y border-border">
                <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                  <dt className="text-muted-foreground">Published</dt>
                  <dd>{formatPublishedDate(selectedVideo.publishedAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                  <dt className="text-muted-foreground">Source use</dt>
                  <dd>
                    {selectedVideo.sourceUsage.status === "used" &&
                    selectedVideo.sourceUsage.usedAt
                      ? `Used ${formatRelativeDate(selectedVideo.sourceUsage.usedAt)}`
                      : "Not used yet"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                  <dt className="text-muted-foreground">Decision</dt>
                  <dd>
                    {selectedVideo.sourceDecision.status === "rejected" &&
                    selectedVideo.sourceDecision.rejectedAt
                      ? `Rejected ${formatRelativeDate(selectedVideo.sourceDecision.rejectedAt)}`
                      : "Approved"}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
                {isRejected ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSetVideoRejection(selectedVideo, false)}
                    disabled={updatingRejectionIds.includes(selectedVideo.id)}
                    className="h-10 rounded-lg border-border text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingRejectionIds.includes(selectedVideo.id) ? (
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
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void handleUseInClone(selectedVideo)}
                    disabled={usingVideoId === selectedVideo.id}
                    className="pf-button-primary h-10"
                  >
                    {usingVideoId === selectedVideo.id ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending to Clone...
                      </>
                    ) : (
                      <>
                        Use in Clone
                        <Sparkles className="size-4" />
                      </>
                    )}
                  </Button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopySourceUrl(selectedVideo)}
                    className="h-10 rounded-lg text-[13px] font-semibold"
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
                  </Button>
                  <a
                    href={selectedVideo.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-10 rounded-lg text-[13px] font-semibold"
                    )}
                  >
                    Open
                    <ExternalLink className="size-4" />
                  </a>
                </div>

                {selectedVideo.sourceDecision.status !== "rejected" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSetVideoRejection(selectedVideo, true)}
                    disabled={updatingRejectionIds.includes(selectedVideo.id)}
                    className="h-9 rounded-lg border-transparent text-[12px] font-medium text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingRejectionIds.includes(selectedVideo.id) ? (
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
                  </Button>
                )}
              </div>
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
