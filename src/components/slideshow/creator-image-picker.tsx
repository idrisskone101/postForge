"use client";

import { Check } from "lucide-react";

import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { SECONDARY_BTN } from "./studio-ui";
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
      <DialogContent className="max-h-[90vh] max-w-3xl! overflow-y-auto rounded-lg border-border">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            Image for {pickerLabel}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            Pick one image from Collections. This slide keeps your copy and uses the photo as-is.
          </DialogDescription>
        </DialogHeader>
        <CollectionReferencePicker
          selectedAssetIds={pickerAssetIds}
            onChange={onPickerAssetIdsChange}
          maxSelection={1}
          refreshKey={referenceRefreshKey}
          preferredAssetIds={preferredReferenceAssetIds}
        />
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-[12px] text-muted-foreground">
            {pickerAssetIds.length ? "1 image selected" : "No image selected"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className={SECONDARY_BTN}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pf-button-primary"
              disabled={!pickerAssetIds.length}
              onClick={onApply}
            >
              <Check className="size-3.5" />
              Apply to {pickerLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
