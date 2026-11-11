"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function VideoFramePreview({
  src,
  label,
  className,
}: {
  src: string;
  label: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const seekToPreviewFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      setReady(true);
      return;
    }
    const previewTime = Math.min(1, Math.max(0.2, video.duration * 0.08));
    try {
      video.currentTime = previewTime;
    } catch {
      setReady(true);
    }
  }, []);

  // A small or cached clip can finish loading its metadata before React
  // hydrates, so the loadedmetadata handler below never runs and the frame
  // stays hidden. Catch up once on mount.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if ((videoRef.current?.readyState ?? 0) >= 1) seekToPreviewFrame();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [seekToPreviewFrame]);

  if (failed) return null;

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      preload="auto"
      aria-label={label}
      onLoadedMetadata={seekToPreviewFrame}
      onSeeked={() => setReady(true)}
      onLoadedData={(event) => {
        if (event.currentTarget.currentTime > 0) setReady(true);
      }}
      onError={() => setFailed(true)}
      className={cn(
        "transition-opacity duration-200 motion-reduce:transition-none",
        ready ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
}
