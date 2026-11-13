"use client";

import { GalleryDeleteDialog } from "@/components/gallery/delete-dialog";
import { Button, buttonClass } from "@/components/workbench/button";
import { Icon } from "@/components/workbench/icon";
import type { GalleryWorkspace } from "./use-gallery-workspace";

export function GalleryBulkBar({
  workspace,
  onOpenDetails,
}: {
  workspace: GalleryWorkspace;
  onOpenDetails: () => void;
}) {
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
  const plural = selectionCount === 1 ? "" : "s";

  return (
    <div
      data-gallery-bulk-bar
      role="region"
      aria-label="Selection actions"
      className="wb-dock sticky top-3 z-20 max-md:top-[calc(var(--pf-mobile-bar-h)+12px)]"
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ember text-[var(--pf-on-ember)]">
        <Icon name="check" size={11} strokeWidth={3} />
      </span>
      <span className="wb-dock-count" aria-live="polite">
        {selectionCount} selected
      </span>
      <Button variant="link" size={32} onClick={() => setSelectedIds(new Set())}>
        Clear
      </Button>
      {filtered.length > selectionCount && (
        <Button
          variant="link"
          size={32}
          onClick={() => setSelectedIds(new Set(filtered.map((item) => item.id)))}
        >
          Select all {filtered.length}
        </Button>
      )}
      <span className="flex-1" />
      <div className="flex flex-wrap items-center gap-1.5 max-md:w-full max-md:[&>*]:flex-[1_1_30%]">
        <Button variant="outline" className="xl:hidden" onClick={onOpenDetails}>
          Details
        </Button>
        <Button
          variant="outline"
          disabled={isBulkUpdating}
          onClick={() => void updateSelectedReviewStatus("rejected_output")}
        >
          Reject
        </Button>
        <Button variant="outline" onClick={() => void handleBulkHandoff()}>
          Handoff
        </Button>
        <Button
          variant="outline"
          disabled={isBulkDownloading}
          onClick={() => void handleBulkDownload()}
        >
          {isBulkDownloading ? "Downloading" : "Download"}
        </Button>
        <GalleryDeleteDialog
          disabled={isDeleting}
          trigger={<button type="button" className={buttonClass("danger")} />}
          title={`Delete ${selectionCount} asset${plural}?`}
          description="This permanently removes the selected files and cannot be undone."
          actionLabel={`Delete asset${plural}`}
          onConfirm={() => void handleBulkDelete()}
        >
          {isDeleting ? "Deleting" : "Delete"}
        </GalleryDeleteDialog>
        <Button
          variant="strong"
          disabled={isBulkUpdating}
          onClick={() => void updateSelectedReviewStatus("approved_output")}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}
