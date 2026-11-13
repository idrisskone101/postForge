"use client";

import { useState } from "react";
import { GalleryDeleteDialog } from "@/components/gallery/delete-dialog";
import { Button, buttonClass } from "@/components/workbench/button";
import { Icon } from "@/components/workbench/icon";
import { EXIT_MS, useExitPresence } from "@/lib/use-exit-presence";
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

  const { mounted, leaving } = useExitPresence(selectionCount > 0, EXIT_MS);
  const [shownCount, setShownCount] = useState(selectionCount);
  if (selectionCount > 0 && shownCount !== selectionCount) setShownCount(selectionCount);

  if (!mounted) return null;
  const count = selectionCount || shownCount;
  const plural = count === 1 ? "" : "s";

  return (
    <div
      data-gallery-bulk-bar
      data-leaving={leaving ? "true" : undefined}
      inert={leaving}
      role="region"
      aria-label="Selection actions"
      className={DOCK_CLASS}
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ember text-[var(--pf-on-ember)]">
        <Icon name="check" size={11} strokeWidth={3} />
      </span>
      <span className="wb-dock-count" aria-live="polite">
        {count} selected
      </span>
      <Button variant="link" size={32} onClick={() => setSelectedIds(new Set())}>
        Clear
      </Button>
      {filtered.length > count && (
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
          title={`Delete ${count} asset${plural}?`}
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

/*
 * The dock needs about 700px for one row. From 1440, and from 1024 to 1279, it lies over the reserved
 * count row. Narrower, and from 1280 to 1439 where the inspector column takes 332px, it would wrap and
 * cover the first row of tiles, so it floats at the bottom of the content area instead.
 */
const DOCK_CLASS = [
  "wb-dock absolute top-0 z-20 max-xl:inset-x-0 min-[1440px]:inset-x-0",
  "max-lg:fixed max-lg:top-auto max-lg:bottom-[max(12px,env(safe-area-inset-bottom))] max-lg:z-[60]",
  "max-lg:right-[max(12px,env(safe-area-inset-right))] max-lg:left-[max(12px,env(safe-area-inset-left))]",
  "md:max-lg:left-[calc(var(--pf-rail-w)+env(safe-area-inset-left))] md:max-lg:right-4 md:max-lg:bottom-4",
  "xl:max-[1439.98px]:left-[calc(var(--pf-page-pad)+var(--pf-sidebar-w)+var(--pf-gap)+env(safe-area-inset-left))] xl:max-[1439.98px]:in-data-[sidebar-collapsed=true]:left-[calc(var(--pf-rail-w)+env(safe-area-inset-left))]",
  "xl:max-[1439.98px]:fixed xl:max-[1439.98px]:top-auto xl:max-[1439.98px]:right-4 xl:max-[1439.98px]:bottom-4 xl:max-[1439.98px]:z-[60]",
].join(" ");

/** Lifts the toast above the dock at the widths where the dock floats. */
export const TOAST_ABOVE_DOCK_CLASS =
  "max-md:bottom-[calc(max(12px,env(safe-area-inset-bottom))+140px)] md:max-lg:bottom-[114px] xl:max-[1439.98px]:bottom-[76px]";
