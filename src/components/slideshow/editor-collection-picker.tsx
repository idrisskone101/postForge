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

export function EditorCollectionPicker({
  open,
  pickerAssetIds,
  onOpenChange,
  onPickerAssetIdsChange,
  onCancel,
  onApply,
}: {
  open: boolean;
  pickerAssetIds: string[];
  onOpenChange: (open: boolean) => void;
  onPickerAssetIdsChange: (ids: string[]) => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl! overflow-y-auto rounded-lg border-border">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              Select slide images
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              Pick images from the shared Collections library. The same collections feed Generate, Clone, and Automations.
            </DialogDescription>
          </DialogHeader>
          <CollectionReferencePicker
            selectedAssetIds={pickerAssetIds}
            onChange={onPickerAssetIdsChange}
            maxSelection={4}
          />
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-[12px] text-muted-foreground">
              {pickerAssetIds.length} selected · applied to this slide
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={SECONDARY_BTN}
                onClick={onCancel}
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
                Apply to slide
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );
}
