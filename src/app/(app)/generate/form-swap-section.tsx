"use client";

import { SwapInputSection } from "@/components/swap-input-section";
import { Panel, StatusChip } from "@/components/workbench";
import type { GenerateSwapActions, GenerateSwapView } from "./form-types";

export function GenerateSwapSection({
  view,
  actions,
}: {
  view: GenerateSwapView;
  actions: GenerateSwapActions;
}) {
  const { show, modelId, video, reference, swapMode } = view;
  if (!show) return undefined;
  const requireReference = modelId === "pixverse-swap";

  return (
    <Panel
      title="Subject swap"
      className="gap-3 p-5"
      action={
        <StatusChip tone="neutral">
          {requireReference ? "Reference required" : "Prompt driven"}
        </StatusChip>
      }
    >
      <SwapInputSection
        value={{ video, reference, swapMode }}
        onChange={actions.onChange}
        requireReference={requireReference}
      />
    </Panel>
  );
}
