"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MediaPreviewFrame } from "@/components/media-preview";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import type { OutputReviewStatus, SerializedOutputReviewStatus } from "@/lib/output-review-status";
import { Check, Copy, Download, ExternalLink, Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import { GalleryDeleteDialog } from "./delete-dialog";
import type { GalleryMediaSession } from "./media-session";
import { patchGalleryReviewStatus } from "./review-api";
import { ReviewStatePill } from "./review-state-pill";
import type { GalleryFeedback, GalleryItem } from "./types";

export function GalleryLightbox({
  item,
  session,
  prompt,
  onClose,
}: {
  item: GalleryItem | null;
  session: GalleryMediaSession;
  prompt: ReactNode;
  onClose: () => void;
}) {
  const {
    deletingId,
    copySourceUrl,
    downloadItem,
    deleteItem,
    onReviewStatusChange,
    onHandoff,
    onFeedback,
  } = session;

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="!w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto rounded-[12px] p-0 sm:!max-w-6xl lg:overflow-hidden [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:z-20">
        <DialogTitle className="sr-only">Output preview</DialogTitle>
        {item && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-[280px] items-center justify-center bg-[#09090B]">
              <MediaPreviewFrame
                type={item.type}
                src={item.url}
                width={item.width}
                height={item.height}
                alt="Generated Output"
                variant="detail"
                className="max-h-[42dvh] w-full lg:max-h-[calc(100dvh-2rem)]"
                mediaClassName="object-contain"
              />
            </div>
            <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-border bg-card p-5 lg:max-h-[calc(100dvh-2rem)] lg:border-l lg:border-t-0">
              <div className="flex flex-wrap items-center gap-2">
                <ReviewStatePill status={item.reviewStatus} />
                <span className="text-[12px] capitalize text-muted-foreground">
                  {item.type}
                  {item.durationSec != null ? ` · ${item.durationSec}s` : ""}
                </span>
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                  {item.filename?.trim() || `Generated ${item.type}`}
                </h2>
                <p className="mt-1 truncate text-[12px] text-muted-foreground">
                  {item.model} · <span suppressHydrationWarning>{formatRelativeDate(item.createdAt)}</span>
                </p>
              </div>

              {prompt}

              <dl className="divide-y divide-border border-y border-border">
                <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                  <dt className="text-muted-foreground">Output</dt>
                  <dd>
                    {item.width && item.height
                      ? `${item.width} × ${item.height}`
                      : item.type}
                  </dd>
                </div>
                {item.tiktokSourceUrl && (
                  <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                    <dt className="text-muted-foreground">Source</dt>
                    <dd className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Copy Source URL"
                        aria-label="Copy Source URL"
                        onClick={() => void copySourceUrl(item.tiktokSourceUrl!)}
                        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Copy className="size-3" /> Copy
                      </button>
                      <a
                        href={item.tiktokSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Source Selection"
                        aria-label="Open Source Selection"
                        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        <ExternalLink className="size-3" /> Open
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              <LightboxReviewControl
                outputId={item.id}
                reviewStatus={item.reviewStatus}
                onStatusChange={(reviewStatus) => {
                  onReviewStatusChange?.(item.id, reviewStatus);
                  session.openPreview({ ...item, reviewStatus });
                }}
                onFeedback={onFeedback}
              />

              <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
                {item.type === "image" && (
                  <Link
                    href={`/ugc-clone?referenceFileId=${encodeURIComponent(item.id)}`}
                    className="pf-button-primary h-10"
                  >
                    <Sparkles className="size-4" />
                    Use in Clone
                  </Link>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void downloadItem(item)}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background text-[13px] font-semibold transition-colors hover:bg-muted"
                  >
                    <Download className="size-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void onHandoff?.(item)}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background text-[13px] font-semibold transition-colors hover:bg-muted"
                  >
                    <Send className="size-4" />
                    Handoff
                  </button>
                </div>
                <GalleryDeleteDialog
                  disabled={deletingId === item.id}
                  trigger={
                    <button
                      type="button"
                      className="flex h-9 items-center justify-center gap-2 rounded-lg text-[12px] font-medium text-[var(--pf-danger)] transition-colors hover:bg-[var(--pf-danger)]/10 disabled:opacity-50"
                    />
                  }
                  title="Delete this asset?"
                  description="This permanently removes the generated file and cannot be undone."
                  actionLabel="Delete asset"
                  onConfirm={() => void deleteItem(item)}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Delete asset
                </GalleryDeleteDialog>
              </div>
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


function LightboxReviewControl({
  outputId,
  reviewStatus,
  onStatusChange,
  onFeedback,
}: {
  outputId: string;
  reviewStatus: SerializedOutputReviewStatus;
  onStatusChange?: (status: SerializedOutputReviewStatus) => void;
  onFeedback?: (feedback: GalleryFeedback) => void;
}) {
  const [pending, setPending] = useState<OutputReviewStatus | null>(null);

  const update = async (status: OutputReviewStatus) => {
    if (pending) return;
    const next: OutputReviewStatus =
      reviewStatus.value === status ? "needs_review" : status;
    setPending(status);
    try {
      const nextReviewStatus = await patchGalleryReviewStatus(outputId, next);
      onStatusChange?.(nextReviewStatus);
      onFeedback?.({
        tone: "success",
        message:
          next === "needs_review"
            ? "Review cleared back to needs review."
            : `Asset marked ${nextReviewStatus.label.toLowerCase()}.`,
      });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "The review status could not be updated. Try again.",
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => void update("approved_output")}
        aria-pressed={reviewStatus.value === "approved_output"}
        className={cn(
          "flex h-10 items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold transition-colors disabled:opacity-50",
          reviewStatus.value === "approved_output"
            ? "border-[var(--pf-success)]/40 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
            : "border-border bg-background text-foreground hover:border-[var(--pf-success)]/40 hover:text-[var(--pf-success)]"
        )}
      >
        {pending === "approved_output" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Approve
      </button>
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => void update("rejected_output")}
        aria-pressed={reviewStatus.value === "rejected_output"}
        className={cn(
          "flex h-10 items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold transition-colors disabled:opacity-50",
          reviewStatus.value === "rejected_output"
            ? "border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
            : "border-border bg-background text-foreground hover:border-[var(--pf-danger)]/40 hover:text-[var(--pf-danger)]"
        )}
      >
        {pending === "rejected_output" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <X className="size-4" />
        )}
        Reject
      </button>
    </div>
  );
}