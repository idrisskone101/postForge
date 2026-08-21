"use client";

import { MediaPreviewFrame } from "@/components/media-preview";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import { Check, Copy, Download, ExternalLink, Eye, Loader2, Send, Trash2 } from "lucide-react";
import { GalleryDeleteDialog } from "./delete-dialog";
import type { GalleryMediaSession } from "./media-session";
import { GalleryReviewStatusControl } from "./review-status-control";
import type { GalleryItem } from "./types";

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
              "group min-w-0 overflow-hidden rounded-lg border bg-card shadow-[var(--pf-shadow-2xs)] transition-[border-color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--pf-border-strong)] hover:shadow-[var(--pf-shadow-md)]",
              isSelected ? "border-primary ring-1 ring-primary/25" : "border-border"
            )}
          >
            <div className="relative min-w-0">
              {item.reviewStatus.value !== "needs_review" && (
                <span
                  className={cn(
                    "pf-review-stamp",
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
                  className="aspect-[4/3] rounded-none border-0 bg-muted"
                  mediaClassName="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/25 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#fff] px-3 py-2 text-[12px] font-semibold text-black shadow-lg">
                    <Eye className="size-3.5" />
                    Preview
                  </span>
                </span>
              </button>

              <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium capitalize text-white">
                <span>{item.type}</span>
                {item.durationSec != null && <span>· {item.durationSec}s</span>}
              </div>

              <label
                className={cn(
                  "absolute right-2 top-2 z-10 flex size-6 cursor-pointer items-center justify-center rounded-md border transition-colors",
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

            <div className="pf-tear" aria-hidden="true" />

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
                    className="shrink-0 text-[11px] text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {formatRelativeDate(item.createdAt)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="truncate text-[11px] text-muted-foreground">
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
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
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
                    className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Download Output ${item.id}`}
                    title="Download"
                  >
                    <Download className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void onHandoff?.(item)}
                    className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:text-foreground"
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
                        className="inline-flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50"
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
