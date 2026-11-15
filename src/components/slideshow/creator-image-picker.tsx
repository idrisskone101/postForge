"use client";

import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button, IconButton } from "@/components/workbench";

import type { CreatorDraft } from "./view-models";

export function CreatorImagePicker({ draft }: { draft: CreatorDraft }) {
  const {
    target,
    pickerLabel,
    pickerAssetIds,
    onPickerAssetIdsChange,
    referenceRefreshKey,
    preferredReferenceAssetIds,
    onClosePicker: onClose,
    onApplyPicker: onApply,
  } = draft;
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col gap-[18px] px-4 py-5 sm:max-w-[min(720px,calc(100%-2rem))] sm:px-6"
      >
        <div className="flex h-8 shrink-0 items-center justify-between gap-3">
          <DialogTitle className="text-[18px] leading-[22px] font-bold tracking-[-0.01em] text-fg">
            Image for {pickerLabel}
          </DialogTitle>
          <IconButton icon="x" label="Close" size={30} onClick={onClose} />
        </div>
        {/*
          The 4px of room on every side keeps a tile's selection ring whole inside the scroller. From 640
          the body stops at the collection field and two rows of tiles (42 + 18 + 270, plus the room), and
          the rest scrolls under the fade.
        */}
        <div className="wb-scroll-fade-y wb-scroll-fade-deep -m-1 min-h-0 flex-1 overflow-y-auto p-1 sm:max-h-[338px]">
          <CollectionReferencePicker
            layout="select"
            selectedAssetIds={pickerAssetIds}
            onChange={onPickerAssetIdsChange}
            maxSelection={1}
            refreshKey={referenceRefreshKey}
            preferredAssetIds={preferredReferenceAssetIds}
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-t border-hairline pt-4">
          <span className="wb-meta" role="status">
            {pickerAssetIds.length ? "1 image selected" : "No image selected"}
          </span>
          <div className="flex gap-2.5">
            <Button size={40} onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size={40}
              disabled={!pickerAssetIds.length}
              onClick={onApply}
            >
              Apply to {pickerLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
