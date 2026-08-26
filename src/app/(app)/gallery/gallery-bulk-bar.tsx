"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Download, Loader2, Send, Trash2, XCircle } from "lucide-react";
import type { GalleryWorkspace } from "./use-gallery-workspace";

export function GalleryBulkBar({ workspace }: { workspace: GalleryWorkspace }) {
  const {
    selectionCount,
    filtered,
    isBulkUpdating,
    isBulkDownloading,
    isDeleting,
    setSelectedIds,
    updateSelectedReviewStatus,
    handleBulkDownload,
    handleBulkHandoff,
    handleBulkDelete,
  } = workspace;

  if (selectionCount === 0) return null;

  return (
    <section data-gallery-bulk-bar className="pf-card px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[8px] bg-primary text-[11px] font-bold text-primary-foreground">
          {selectionCount}
        </span>
        <strong className="shrink-0 text-[13px] font-medium text-[var(--pf-ink)]">
          {selectionCount} selected
        </strong>
        <button
          type="button"
          onClick={() => setSelectedIds(new Set(filtered.map((item) => item.id)))}
          className="text-[12px] font-medium text-[var(--pf-muted)] transition-colors hover:text-[var(--pf-ink)]"
        >
          Select all {filtered.length}
        </button>
        <button
          type="button"
          onClick={() => setSelectedIds(new Set())}
          className="text-[12px] font-medium text-[var(--pf-muted)] transition-colors hover:text-[var(--pf-ink)]"
        >
          Clear
        </button>
        <span
          aria-hidden="true"
          className="hidden h-4 w-px bg-[var(--pf-border)] sm:block"
        />
        <div className="flex min-w-0 flex-wrap items-center gap-0.5">
          <button
            type="button"
            disabled={isBulkUpdating}
            onClick={() => void updateSelectedReviewStatus("approved_output")}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-medium text-[var(--pf-ink)] transition-colors hover:bg-[var(--pf-success)]/10 hover:text-[var(--pf-success)] disabled:opacity-50"
          >
            <CheckCircle2 className="size-3.5" />
            Approve
          </button>
          <button
            type="button"
            disabled={isBulkUpdating}
            onClick={() => void updateSelectedReviewStatus("rejected_output")}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-medium text-[var(--pf-ink)] transition-colors hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)] disabled:opacity-50"
          >
            <XCircle className="size-3.5" />
            Reject
          </button>
          <button
            type="button"
            disabled={isBulkDownloading}
            onClick={() => void handleBulkDownload()}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-medium text-[var(--pf-ink)] transition-colors hover:bg-[var(--pf-active)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBulkDownloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {isBulkDownloading ? "Downloading" : "Download"}
          </button>
          <button
            type="button"
            onClick={() => void handleBulkHandoff()}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-medium text-[var(--pf-ink)] transition-colors hover:bg-[var(--pf-active)]"
          >
            <Send className="size-3.5" />
            Handoff
          </button>
        </div>
        <span className="flex-1" />
        <AlertDialog>
          <AlertDialogTrigger
            disabled={isDeleting}
            render={
              <button
                type="button"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-medium text-[var(--pf-danger)] transition-colors hover:bg-[var(--pf-danger)]/10 disabled:opacity-50"
              />
            }
          >
            <Trash2 className="size-3.5" />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {selectionCount} asset{selectionCount === 1 ? "" : "s"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the selected files and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleBulkDelete()}>
                Delete assets
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
