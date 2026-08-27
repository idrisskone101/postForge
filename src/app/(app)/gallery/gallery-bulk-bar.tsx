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
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Loader2, Send, Trash2, XCircle } from "lucide-react";
import { GalleryPanel } from "./gallery-panel";
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
    <GalleryPanel data-gallery-bulk-bar className="px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[8px] bg-primary text-[11px] font-bold text-primary-foreground">
          {selectionCount}
        </span>
        <strong className="shrink-0 text-[13px] font-medium text-foreground">
          {selectionCount} selected
        </strong>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSelectedIds(new Set(filtered.map((item) => item.id)))}
          className="h-auto px-0 text-[12px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          Select all {filtered.length}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSelectedIds(new Set())}
          className="h-auto px-0 text-[12px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          Clear
        </Button>
        <span
          aria-hidden="true"
          className="hidden h-4 w-px bg-border sm:block"
        />
        <div className="flex min-w-0 flex-wrap items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBulkUpdating}
            onClick={() => void updateSelectedReviewStatus("approved_output")}
            className="h-8 gap-1.5 px-2.5 text-[12px] hover:bg-[var(--pf-success)]/10 hover:text-[var(--pf-success)]"
          >
            <CheckCircle2 className="size-3.5" />
            Approve
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBulkUpdating}
            onClick={() => void updateSelectedReviewStatus("rejected_output")}
            className="h-8 gap-1.5 px-2.5 text-[12px] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
          >
            <XCircle className="size-3.5" />
            Reject
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBulkDownloading}
            onClick={() => void handleBulkDownload()}
            className="h-8 gap-1.5 px-2.5 text-[12px]"
          >
            {isBulkDownloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {isBulkDownloading ? "Downloading" : "Download"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleBulkHandoff()}
            className="h-8 gap-1.5 px-2.5 text-[12px]"
          >
            <Send className="size-3.5" />
            Handoff
          </Button>
        </div>
        <span className="flex-1" />
        <AlertDialog>
          <AlertDialogTrigger
            disabled={isDeleting}
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-[12px] text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
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
    </GalleryPanel>
  );
}
