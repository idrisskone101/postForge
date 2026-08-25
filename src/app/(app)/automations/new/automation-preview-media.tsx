"use client";

import { useState } from "react";
import { VideoFramePreview } from "@/components/video-frame-preview";
import type { AutomationPreviewAsset } from "./automation-builder-preview";

export function AutomationPreviewMedia({
  asset,
  className,
}: {
  asset: AutomationPreviewAsset;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (asset.kind === "video") {
    return (
      <VideoFramePreview
        src={asset.previewUrl}
        label={`${asset.name} preview`}
        className={className}
      />
    );
  }

  if (imageFailed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.previewUrl}
      alt={`${asset.name} preview`}
      onError={() => setImageFailed(true)}
      className={className}
    />
  );
}
