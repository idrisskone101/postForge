"use client";

import { useState, useRef, useCallback, useEffect, type PointerEvent } from "react";
import { apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Loader2, Scissors, Film } from "lucide-react";
import {
  MAX_MOTION_SOURCE_DURATION_SEC,
  isMotionSourceWithinLimit,
} from "@/lib/ugc/source-limits";
import {
  formatTrimTime,
  getTrimSummary,
  MIN_TRIM_DURATION_SEC,
  normalizeTrimRange,
  snapTrimTime,
} from "@/components/video-trim-range";
import { VideoTrimRangeFields } from "@/components/video-trim-range-fields";
import { VideoTrimTimeline } from "@/components/video-trim-timeline";

export { formatTrimTime, getTrimSummary, normalizeTrimRange };

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

const FILMSTRIP_THUMBNAIL_COUNT = 4;
const FILMSTRIP_FETCH_DELAY_MS = 700;

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
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(
    Math.min(durationSec, MAX_MOTION_SOURCE_DURATION_SEC)
  );
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimError, setTrimError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const timeout = window.setTimeout(() => {
      fetch(
        `/api/ugc-clone/thumbnails?path=${encodeURIComponent(videoPath)}&count=${FILMSTRIP_THUMBNAIL_COUNT}`,
        { signal: abortController.signal }
      )
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { thumbnails?: string[] } | null) => {
          if (!cancelled && data?.thumbnails) {
            setThumbnails(data.thumbnails);
          }
        })
        .catch(() => {});
    }, FILMSTRIP_FETCH_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [videoPath]);

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

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = startTime;
    }
  }, [startTime]);

  const getTimeFromPointer = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return snapTrimTime(ratio * durationSec);
    },
    [durationSec]
  );

  const applyRange = useCallback(
    (nextStartTime: number, nextEndTime: number) => {
      const range = normalizeTrimRange({
        startTime: nextStartTime,
        endTime: nextEndTime,
        durationSec,
        maxDurationSec: MAX_MOTION_SOURCE_DURATION_SEC,
      });

      setStartTime(range.startTime);
      setEndTime(range.endTime);
    },
    [durationSec]
  );

  const handlePointerDown = useCallback(
    (handle: "start" | "end") => (e: PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(handle);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging) return;
      const t = getTimeFromPointer(e.clientX);
      const minGap = MIN_TRIM_DURATION_SEC;

      if (dragging === "start") {
        applyRange(Math.min(t, endTime - minGap), endTime);
      } else {
        applyRange(startTime, Math.max(t, startTime + minGap));
      }
    },
    [applyRange, dragging, startTime, endTime, getTimeFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleTrim = async () => {
    const range = normalizeTrimRange({
      startTime,
      endTime,
      durationSec,
      maxDurationSec: MAX_MOTION_SOURCE_DURATION_SEC,
    });
    if (!range.hasTrim) {
      onCancel();
      return;
    }

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
        startTime: range.startTime,
        endTime: range.endTime,
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

  const trimRange = normalizeTrimRange({
    startTime,
    endTime,
    durationSec,
    maxDurationSec: MAX_MOTION_SOURCE_DURATION_SEC,
  });
  const trimmedDuration = trimRange.trimmedDuration;
  const startPct = durationSec > 0 ? (trimRange.startTime / durationSec) * 100 : 0;
  const endPct = durationSec > 0 ? (trimRange.endTime / durationSec) * 100 : 100;
  const trimSummary = getTrimSummary({
    startTime,
    endTime,
    durationSec,
    maxDurationSec: MAX_MOTION_SOURCE_DURATION_SEC,
  });
  const videoSrc = `/api/ugc-clone/preview?path=${encodeURIComponent(videoPath)}`;
  const canUseFullVideo = isMotionSourceWithinLimit(durationSec);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
        <Scissors className="size-3.5" />
        Trim Video
      </div>

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
          <div className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-0.5 text-[12px] font-bold text-white backdrop-blur-sm">
            {formatTrimTime(trimmedDuration)}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
          <Film className="size-3" />
          Drag handles to select range
        </div>
        <VideoTrimTimeline
          trackRef={trackRef}
          thumbnails={thumbnails}
          startPct={startPct}
          endPct={endPct}
          dragging={dragging}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onStartPointerDown={handlePointerDown("start")}
          onEndPointerDown={handlePointerDown("end")}
        />
      </div>

      <VideoTrimRangeFields
        durationSec={durationSec}
        startTime={trimRange.startTime}
        endTime={trimRange.endTime}
        trimmedDuration={trimmedDuration}
        removedFromStart={trimRange.removedFromStart}
        removedFromEnd={trimRange.removedFromEnd}
        hasTrim={trimRange.hasTrim}
        trimSummary={trimSummary}
        onStartChange={(nextStartTime) => applyRange(nextStartTime, endTime)}
        onEndChange={(nextEndTime) => applyRange(startTime, nextEndTime)}
      />

      {trimError && (
        <div className="min-w-0 break-words rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive [overflow-wrap:anywhere]">
          {trimError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isTrimming || !canUseFullVideo}
          className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {canUseFullVideo ? "Use Full Video" : "Trim required"}
        </button>
        <button
          type="button"
          onClick={handleTrim}
          disabled={isTrimming || !trimRange.hasTrim}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all",
            isTrimming
              ? "bg-accent-green/60"
              : !trimRange.hasTrim
                ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-accent-green shadow-[0_4px_16px_rgba(22,163,74,0.25)] hover:shadow-[0_4px_24px_rgba(22,163,74,0.35)] hover:brightness-110"
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
              Apply Trim
            </>
          )}
        </button>
      </div>
    </div>
  );
}
