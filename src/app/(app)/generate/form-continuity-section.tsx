"use client";

import { VideoReferencePicker } from "@/components/video-reference-picker";
import type {
  GenerateContinuityActions,
  GenerateContinuityView,
} from "./form-types";

export function GenerateContinuitySection({
  view,
  actions,
}: {
  view: GenerateContinuityView;
  actions: GenerateContinuityActions;
}) {
  const { show, videoReferenceFileId, videoSeedMissing, disabled } = view;
  const { onClear, onChange, onSeedMissingChange } = actions;
  if (!show) return undefined;

  return (
    <div className="animate-content-enter pf-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="pf-section-title">
              Character continuity
            </h2>
            <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Optional
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[12px] leading-4 text-muted-foreground">
            Seed the next video with a previous output so the same character
            carries across your series.
          </p>
        </div>
        {videoReferenceFileId && !videoSeedMissing && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] font-semibold text-[var(--pf-link)] hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <VideoReferencePicker
        selectedFileId={videoReferenceFileId}
        onChange={onChange}
        onSeedMissingChange={onSeedMissingChange}
        disabled={disabled}
        disabledMessage="Clear the character identity or visual collection references to use a video seed."
      />
    </div>
  );
}
