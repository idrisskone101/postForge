"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Loader2, Scissors, Film, GripVertical } from "lucide-react";

interface VideoTrimmerProps {
  videoPath: string;
  durationSec: number;
  width: number;
  height: number;
  sourceId?: string;
  onTrimmed: (info: {
    localPath: string;
    filename: string;
    durationSec: number;
    width: number;
    height: number;
  }) => void;
  onCancel: () => void;
}

/** Snap a number to the nearest 0.1 */
function snap(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Format seconds as "X.Xs" */
function fmt(sec: number): string {
  return `${snap(sec).toFixed(1)}s`;
}

export function VideoTrimmer({
  videoPath,
  durationSec,
  width,
  height,
  sourceId,
  onTrimmed,
  onCancel,
}: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Trim range (in seconds)
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(durationSec);

  // Thumbnails fetched as base64
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(true);

  // Active drag handle
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  // Trim API state
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimError, setTrimError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch filmstrip thumbnails on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    apiGet<{ thumbnails: string[] }>(
      `/api/ugc-clone/thumbnails?path=${encodeURIComponent(videoPath)}&count=8`
    )
      .then((data) => {
        if (!cancelled) setThumbnails(data.thumbnails);
      })
      .catch(() => {
        // thumbnails are decorative; silently degrade
      })
      .finally(() => {
        if (!cancelled) setThumbsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [videoPath]);

  // ---------------------------------------------------------------------------
  // Video loop: keep playback within the trimmed region
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.currentTime >= endTime || video.currentTime < startTime) {
        video.currentTime = startTime;
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [startTime, endTime]);

  // Seek to startTime whenever it changes so the preview reflects the selection
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = startTime;
    }
  }, [startTime]);

  // ---------------------------------------------------------------------------
  // Pointer-based dragging for handles
  // ---------------------------------------------------------------------------
  const getTimeFromPointer = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return snap(ratio * durationSec);
    },
    [durationSec]
  );

  const handlePointerDown = useCallback(
    (handle: "start" | "end") => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(handle);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const t = getTimeFromPointer(e.clientX);
      const minGap = 0.3; // minimum trim duration in seconds

      if (dragging === "start") {
        setStartTime(Math.min(t, endTime - minGap));
      } else {
        setEndTime(Math.max(t, startTime + minGap));
      }
    },
    [dragging, startTime, endTime, getTimeFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Trim API call
  // ---------------------------------------------------------------------------
  const handleTrim = async () => {
    setIsTrimming(true);
    setTrimError(null);
    try {
      const result = await apiPost<{
        localPath: string;
        filename: string;
        durationSec: number;
        width: number;
        height: number;
      }>("/api/ugc-clone/trim", {
        localPath: videoPath,
        startTime: snap(startTime),
        endTime: snap(endTime),
        sourceId,
      });
      onTrimmed(result);
    } catch (err) {
      setTrimError(
        err instanceof Error ? err.message : "Trim failed. Please try again."
      );
      setIsTrimming(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const trimmedDuration = snap(endTime - startTime);
  const startPct = (startTime / durationSec) * 100;
  const endPct = (endTime / durationSec) * 100;
  const videoSrc = `/api/ugc-clone/preview?path=${encodeURIComponent(videoPath)}`;

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-green">
        <Scissors className="size-3.5" />
        Trim Video
      </div>

      {/* Video Preview */}
      <div className="flex justify-center">
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-border bg-black"
          style={{
            aspectRatio: `${width} / ${height}`,
            maxHeight: 300,
          }}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted
            playsInline
            loop
            className="h-full w-full object-cover"
            style={{ maxHeight: 300 }}
          />
          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {fmt(trimmedDuration)}
          </div>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <Film className="size-3" />
          Drag handles to select range
        </div>

        <div
          ref={trackRef}
          className="relative h-14 w-full select-none rounded-xl overflow-hidden border border-border bg-muted"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Filmstrip thumbnails */}
          <div className="absolute inset-0 flex">
            {thumbsLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-muted animate-pulse border-r border-border last:border-r-0"
                  />
                ))
              : thumbnails.map((thumb, i) => (
                  <img
                    key={i}
                    src={thumb}
                    alt=""
                    draggable={false}
                    className="flex-1 h-full object-cover border-r border-border/30 last:border-r-0"
                  />
                ))}
          </div>

          {/* Dimmed overlay: before start */}
          <div
            className="absolute inset-y-0 left-0 bg-black/60 transition-[width] duration-75"
            style={{ width: `${startPct}%` }}
          />

          {/* Dimmed overlay: after end */}
          <div
            className="absolute inset-y-0 right-0 bg-black/60 transition-[width] duration-75"
            style={{ width: `${100 - endPct}%` }}
          />

          {/* Selected region highlight border */}
          <div
            className={cn(
              "absolute inset-y-0 border-y-2 border-accent-green transition-[left,width] duration-75",
              dragging && "shadow-[0_0_12px_rgba(123,165,67,0.3)]"
            )}
            style={{
              left: `${startPct}%`,
              width: `${endPct - startPct}%`,
            }}
          />

          {/* Start handle */}
          <div
            className={cn(
              "absolute inset-y-0 z-10 flex w-5 cursor-ew-resize items-center justify-center",
              "rounded-l-lg bg-accent-green transition-shadow",
              dragging === "start" && "shadow-[0_0_16px_rgba(123,165,67,0.5)]"
            )}
            style={{ left: `calc(${startPct}% - 10px)` }}
            onPointerDown={handlePointerDown("start")}
          >
            <GripVertical className="size-3 text-white/80" />
          </div>

          {/* End handle */}
          <div
            className={cn(
              "absolute inset-y-0 z-10 flex w-5 cursor-ew-resize items-center justify-center",
              "rounded-r-lg bg-accent-green transition-shadow",
              dragging === "end" && "shadow-[0_0_16px_rgba(123,165,67,0.5)]"
            )}
            style={{ left: `calc(${endPct}% - 10px)` }}
            onPointerDown={handlePointerDown("end")}
          >
            <GripVertical className="size-3 text-white/80" />
          </div>
        </div>
      </div>

      {/* Time Display */}
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground tabular-nums">{fmt(startTime)}</span>
        <span className="rounded-full bg-accent-green/10 px-3 py-1 text-accent-green font-bold tabular-nums">
          {fmt(trimmedDuration)} selected
        </span>
        <span className="text-muted-foreground tabular-nums">{fmt(endTime)}</span>
      </div>

      {/* Error */}
      {trimError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {trimError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isTrimming}
          className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          Use Full Video
        </button>
        <button
          type="button"
          onClick={handleTrim}
          disabled={isTrimming}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all",
            isTrimming
              ? "bg-accent-green/60"
              : "bg-accent-green shadow-[0_4px_16px_rgba(123,165,67,0.25)] hover:shadow-[0_4px_24px_rgba(123,165,67,0.35)] hover:brightness-110"
          )}
        >
          {isTrimming ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Trimming...
            </>
          ) : (
            <>
              <Scissors className="size-4" />
              Trim & Use
            </>
          )}
        </button>
      </div>
    </div>
  );
}
