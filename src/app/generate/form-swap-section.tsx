"use client";

import { SwapInputSection } from "@/components/swap-input-section";
import type { GenerateSwapActions, GenerateSwapView } from "./form-types";

export function GenerateSwapSection({
  view,
  actions,
}: {
  view: GenerateSwapView;
  actions: GenerateSwapActions;
}) {
  const { show, modelId, video, reference, swapMode } = view;
  const { onChange } = actions;
  if (!show) return undefined;

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Subject swap
            </h2>
            <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {modelId === "pixverse-swap" ? "Reference required" : "Prompt-driven"}
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[12px] leading-4 text-muted-foreground">
            {modelId === "pixverse-swap"
              ? "Upload a video and a reference image. The referenced subject replaces the matching subject while the rest of the video stays the same."
              : "Upload a video and describe the swap in your prompt. Gemini Omni Edit keeps everything else in the frame consistent."}
          </p>
        </div>
      </div>
      <SwapInputSection
        value={{ video, reference, swapMode }}
        onChange={onChange}
        requireReference={modelId === "pixverse-swap"}
      />
    </div>
  );
}
