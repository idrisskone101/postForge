"use client";

import { useRef } from "react";
import { useNearViewport } from "@/lib/use-near-viewport";

/**
 * Decorative first-frame preview of a stored video. The video is only requested
 * once it is near the viewport, so a list of previews below the fold does not
 * pull megabytes of video on every visit.
 */
export function DeferredVideoFrame({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const near = useNearViewport(ref);

  return (
    <video
      ref={ref}
      src={near ? src : undefined}
      muted
      preload="metadata"
      aria-hidden="true"
      className={className}
    />
  );
}
