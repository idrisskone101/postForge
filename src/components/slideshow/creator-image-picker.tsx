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
        {/* From 640 the grid stops at two rows of tiles (270px plus its ring room) and the rest scrolls
            under the fade. On phones it takes the height the dialog has left. */}
        <CollectionReferencePicker
          layout="select"
          gridScrollClassName="flex-1 sm:max-h-[278px] sm:flex-none"
          selectedAssetIds={pickerAssetIds}
          onChange={onPickerAssetIdsChange}
          maxSelection={1}
          refreshKey={referenceRefreshKey}
          preferredAssetIds={preferredReferenceAssetIds}
        />
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
