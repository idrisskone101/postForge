"use client";

import { VideoReferencePicker } from "@/components/video-reference-picker";
import { ReferenceField } from "./form-reference-field";
import type { GenerateContinuityActions, GenerateContinuityView } from "./form-types";

export function GenerateContinuitySection({
  view,
  actions,
}: {
  view: GenerateContinuityView;
  actions: GenerateContinuityActions;
}) {
  const { show, videoReferenceFileId, videoSeedMissing, disabled } = view;
  if (!show) return undefined;

  return (
    <ReferenceField
      label="Video seed"
      onClear={videoReferenceFileId && !videoSeedMissing ? actions.onClear : undefined}
    >
      <VideoReferencePicker
        selectedFileId={videoReferenceFileId}
        onChange={actions.onChange}
        onSeedMissingChange={actions.onSeedMissingChange}
        disabled={disabled}
        disabledMessage="Clear the character or collection to use a video seed"
      />
    </ReferenceField>
  );
}
