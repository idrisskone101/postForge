"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Decorative first-frame preview of a stored video. The video is only requested
 * once it is near the viewport, so a list of previews below the fold does not
 * pull megabytes of video on every visit.
 */
export function DeferredVideoFrame({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setNear(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: NEAR_VIEWPORT_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

const NEAR_VIEWPORT_MARGIN = "300px";
