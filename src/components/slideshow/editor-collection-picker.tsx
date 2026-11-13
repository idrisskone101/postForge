"use client";

import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/workbench";

import { useSlideshowEditor } from "./slideshow-editor-provider";

export function EditorCollectionPicker() {
  const {
    pickerOpen: open,
    pickerAssetIds,
    setPickerOpen,
    setPickerAssetIds,
    applyPickedAssets,
  } = useSlideshowEditor();
  return (
    <Dialog open={open} onOpenChange={setPickerOpen}>
      <DialogContent className="flex max-h-[min(90dvh,820px)] flex-col gap-4 p-0 sm:max-w-[760px]">
        <div className="flex min-h-14 shrink-0 items-center pl-6 pr-14 pt-2">
          <DialogTitle className="wb-panel-title text-[18px] leading-6 font-bold tracking-[-0.01em]">
            Select slide images
          </DialogTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <CollectionReferencePicker
            selectedAssetIds={pickerAssetIds}
            onChange={(ids) => setPickerAssetIds(ids)}
            maxSelection={MAX_PICKED}
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-hairline px-6 py-4">
          <Button
            onClick={() => {
              setPickerOpen(false);
              setPickerAssetIds([]);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!pickerAssetIds.length}
            onClick={applyPickedAssets}
          >
            Apply to slide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MAX_PICKED = 4;
