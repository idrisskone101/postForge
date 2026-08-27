"use client";

import { useState } from "react";
import { MediaPreviewFrame } from "@/components/media-preview";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { downloadFile } from "@/lib/utils/download";
import { cn } from "@/lib/utils";
import type { OutputReviewStatus } from "@/lib/output-review-status";
import { Check, Download, Loader2, Send, Trash2, X } from "lucide-react";
import { GalleryDeleteDialog } from "./delete-dialog";
import type { GalleryMediaSession } from "./media-session";
import { patchGalleryReviewStatus } from "./review-api";
import { ReviewStatePill } from "./review-state-pill";
import type { GalleryItem } from "./types";

const galleryListShellClassName =
  "min-w-0 gap-0 overflow-hidden rounded-lg border border-border bg-card py-0 text-card-foreground shadow-none ring-0";

export function GalleryListTable({
  items,
  session,
}: {
  items: GalleryItem[];
  session: GalleryMediaSession;
}) {
  const {
    selectedIds,
    toggleSelection,
    openPreview,
    deleteItem,
    onReviewStatusChange,
    onHandoff,
    onFeedback,
  } = session;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const downloadRow = async (item: GalleryItem) => {
    try {
      await downloadFile(`/api/files/${item.id}/download`, item.filename);
      onFeedback?.({ tone: "success", message: "Asset downloaded." });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "This asset could not be downloaded. Try again.",
      });
    }
  };

  const reviewRow = async (item: GalleryItem, nextStatus: OutputReviewStatus) => {
    if (nextStatus === item.reviewStatus.value) return;
    try {
      const reviewStatus = await patchGalleryReviewStatus(item.id, nextStatus);
      onReviewStatusChange?.(item.id, reviewStatus);
      onFeedback?.({
        tone: "success",
        message: `Asset marked ${reviewStatus.label.toLowerCase()}.`,
      });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "The review status could not be updated. Try again.",
      });
    }
  };

  return (
    <div data-gallery-view="list" className={cn(galleryListShellClassName, "overflow-hidden")}>
      <div className="hidden grid-cols-[2rem_3rem_minmax(0,1.6fr)_minmax(7.5rem,0.6fr)_minmax(6.5rem,0.5fr)_5.5rem_10rem] items-center gap-3 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground md:grid">
        <span />
        <span />
        <span>Output</span>
        <span>Status</span>
        <span>Details</span>
        <span>Created</span>
        <span />
      </div>
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        const isDeleting = deletingId === item.id;
        return (
          <div
            key={item.id}
            onClick={() => openPreview(item)}
            className={cn(
              "group grid min-w-0 cursor-pointer grid-cols-[2rem_3rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-3 py-2.5 transition-colors duration-[180ms] ease-[var(--pf-ease)] first:border-t-0 hover:bg-muted md:grid-cols-[2rem_3rem_minmax(0,1.6fr)_minmax(7.5rem,0.6fr)_minmax(6.5rem,0.5fr)_5.5rem_10rem]",
              isSelected && "bg-[var(--sidebar-accent)] hover:bg-[var(--sidebar-accent)]"
            )}
          >
            <span className="flex items-center" onClick={(event) => event.stopPropagation()}>
              <label
                className={cn(
                  "flex size-5 cursor-pointer items-center justify-center rounded-[5px] border transition-colors duration-[180ms] ease-[var(--pf-ease)]",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-[var(--pf-border-strong)] bg-card"
                )}
              >
                <span className="sr-only">Select Output {item.id}</span>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(item.id)}
                  className="sr-only"
                />
                {isSelected && <Check className="size-3 text-white" />}
              </label>
            </span>
            <span className="relative block size-10 overflow-hidden rounded-[6px] border border-border bg-muted">
              <MediaPreviewFrame
                type={item.type}
                src={item.url}
                width={item.width}
                height={item.height}
                alt="Generated Output"
                cover
                variant="card"
                className="rounded-none border-0 bg-muted"
                mediaClassName="object-cover"
              />
            </span>
            <span className="min-w-0">
              <button
                type="button"
                aria-label={`Preview output ${item.id}`}
                onClick={(event) => {
                  event.stopPropagation();
                  openPreview(item);
                }}
                className="block max-w-full truncate text-left text-[13px] font-semibold text-foreground transition-colors hover:text-primary"
              >
                {item.model}
              </button>
              <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                {item.prompt ?? `Job ${item.jobId.slice(0, 8)}`}
              </span>
            </span>
            <span className="hidden md:block">
              <ReviewStatePill status={item.reviewStatus} />
            </span>
            <span className="pf-data hidden truncate text-[12px] text-muted-foreground md:block">
              {item.width && item.height ? `${item.width} × ${item.height}` : item.type}
              {item.durationSec != null ? ` · ${item.durationSec}s` : ""}
            </span>
            <span
              className="pf-data hidden truncate text-[12px] text-muted-foreground md:block"
              suppressHydrationWarning
            >
              {formatRelativeDate(item.createdAt)}
            </span>
            <span
              className="flex items-center justify-end gap-0.5"
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Mark as Approved Output`}
                title="Approve"
                onClick={() => void reviewRow(item, "approved_output")}
                className={cn(
                  "hover:border-[var(--pf-success)] hover:bg-[var(--pf-success)]/10 hover:text-[var(--pf-success)]",
                  item.reviewStatus.value === "approved_output" &&
                    "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                )}
              >
                <Check className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Mark as Rejected Output`}
                title="Reject"
                onClick={() => void reviewRow(item, "rejected_output")}
                className={cn(
                  "hover:border-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]",
                  item.reviewStatus.value === "rejected_output" &&
                    "border-[var(--pf-danger)]/30 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                )}
              >
                <X className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Download Output ${item.id}`}
                title="Download"
                onClick={() => void downloadRow(item)}
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Handoff Output ${item.id}`}
                title="Handoff"
                onClick={() => void onHandoff?.(item)}
              >
                <Send className="size-3.5" />
              </Button>
              <GalleryDeleteDialog
                disabled={isDeleting}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Delete Output ${item.id}`}
                    title="Delete"
                    className="hover:border-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
                  />
                }
                title="Delete this asset?"
                description="This permanently removes the generated file and cannot be undone."
                actionLabel="Delete asset"
                onConfirm={() => {
                  void (async () => {
                    setDeletingId(item.id);
                    await deleteItem(item);
                    setDeletingId(null);
                  })();
                }}
              >
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </GalleryDeleteDialog>
            </span>
          </div>
        );
      })}
    </div>
  );
}
