"use client";

import { MediaPreviewFrame } from "@/components/media-preview";
import type { OutputReviewStatus } from "@/lib/output-review-status";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import { Check, Copy, Download, ExternalLink, Loader2, Send, Trash2 } from "lucide-react";
import { GalleryDeleteDialog } from "./delete-dialog";
import type { GalleryMediaSession } from "./media-session";
import { GalleryReviewStatusControl } from "./review-status-control";
import type { GalleryItem } from "./types";

function galleryReviewDotClass(status: OutputReviewStatus) {
  switch (status) {
    case "approved_output":
      return "bg-[var(--pf-success)]";
    case "rejected_output":
      return "bg-[var(--pf-danger)]";
    case "needs_review":
      return "bg-[var(--pf-lamp-amber)]";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export function GalleryGridCards({
  items,
  view,
  session,
}: {
  items: GalleryItem[];
  view: "grid" | "list";
  session: GalleryMediaSession;
}) {
  const {
    selectedIds,
    stampedIds,
    deletingId,
    toggleSelection,
    openPreview,
    copySourceUrl,
    downloadItem,
    deleteItem,
    markStamped,
    onReviewStatusChange,
    onHandoff,
    onFeedback,
  } = session;

  return (
    <div
      data-gallery-view={view}
      className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        return (
          <article
            key={item.id}
            className={cn(
              "pf-card pf-card-hover group min-w-0 overflow-hidden",
              isSelected && "border-primary ring-1 ring-primary/25"
            )}
          >
            <div className="relative min-w-0">
              {item.reviewStatus.value !== "needs_review" && (
                <span
                  className={cn(
                    "pf-review-stamp !top-2 !bottom-auto",
                    item.reviewStatus.value === "approved_output"
                      ? "pf-review-stamp--approved"
                      : "pf-review-stamp--rejected",
                    stampedIds.has(item.id) && "pf-stamp-slam"
                  )}
                  aria-hidden="true"
                >
                  {item.reviewStatus.value === "approved_output"
                    ? "Approved"
                    : "Rejected"}
                </span>
              )}
              <button
                type="button"
                onClick={() => openPreview(item)}
                className="block h-full w-full cursor-pointer text-left"
                aria-label={`Preview Output ${item.id}`}
              >
                <MediaPreviewFrame
                  type={item.type}
                  src={item.url}
                  width={item.width}
                  height={item.height}
                  alt="Generated Output"
                  cover
                  variant="card"
                  className="aspect-square rounded-none border-0 bg-[var(--pf-active)]"
                  mediaClassName="object-cover"
                />
              </button>

              <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium capitalize text-white">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    galleryReviewDotClass(item.reviewStatus.value)
                  )}
                  aria-hidden="true"
                />
                {item.type}
              </div>
              {item.durationSec != null && (
                <div className="pf-data absolute bottom-2 right-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
                  {item.durationSec}s
                </div>
              )}

              <label
                className={cn(
                  "absolute right-2 top-2 z-10 flex size-6 cursor-pointer items-center justify-center rounded-[8px] border transition-colors",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-white/80 bg-black/25 backdrop-blur-sm"
                )}
                onClick={(event) => event.stopPropagation()}
              >
                <span className="sr-only">Select Output {item.id}</span>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(item.id)}
                  className="sr-only"
                />
                {isSelected && <Check className="size-3.5 text-white" />}
              </label>
            </div>

            <div className="flex min-w-0 flex-col gap-3 p-3">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openPreview(item)}
                    className="min-w-0 truncate text-left text-[13px] font-semibold transition-colors hover:text-primary"
                  >
                    {item.model}
                  </button>
                  <span
                    className="pf-data shrink-0 text-[11px] text-[var(--pf-muted)]"
                    suppressHydrationWarning
                  >
                    {formatRelativeDate(item.createdAt)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="pf-data truncate text-[11px] text-[var(--pf-muted)]">
                    {item.width && item.height
                      ? `${item.width} × ${item.height}`
                      : `Job ${item.jobId.slice(0, 8)}`}
                  </span>
                  {item.tiktokSourceUrl && (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        title="Copy Source URL"
                        aria-label="Copy Source URL"
                        onClick={(event) => {
                          event.stopPropagation();
                          void copySourceUrl(item.tiktokSourceUrl!);
                        }}
                        className="inline-flex size-7 items-center justify-center rounded-[8px] text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)]"
                      >
                        <Copy className="size-3" />
                      </button>
                      <a
                        href={item.tiktokSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Source Selection"
                        aria-label="Open Source Selection"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex size-7 items-center justify-center rounded-[8px] text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-active)] hover:text-primary"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <GalleryReviewStatusControl
                  outputId={item.id}
                  reviewStatus={item.reviewStatus}
                  compact
                  onStatusChange={(reviewStatus) => {
                    markStamped(item.id);
                    onReviewStatusChange?.(item.id, reviewStatus);
                  }}
                  onFeedback={onFeedback}
                />
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void downloadItem(item)}
                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)]"
                    aria-label={`Download Output ${item.id}`}
                    title="Download"
                  >
                    <Download className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void onHandoff?.(item)}
                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)]"
                    aria-label={`Handoff Output ${item.id}`}
                    title="Handoff"
                  >
                    <Send className="size-3.5" />
                  </button>
                  <GalleryDeleteDialog
                    disabled={deletingId === item.id}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)] disabled:opacity-50"
                        aria-label={`Delete Output ${item.id}`}
                        title="Delete"
                      />
                    }
                    title="Delete this asset?"
                    description="This permanently removes the generated file and cannot be undone."
                    actionLabel="Delete asset"
                    onConfirm={() => void deleteItem(item)}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </GalleryDeleteDialog>
                </div>
              </div>
              <span className="sr-only">Download</span>
              <span className="sr-only">Handoff</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
