"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { apiPost } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
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

const TRIM_TIME_PRECISION = 100;
const MIN_TRIM_DURATION_SEC = 0.1;
const FILMSTRIP_PLACEHOLDER_COUNT = 4;
const FILMSTRIP_THUMBNAIL_COUNT = 4;
const FILMSTRIP_FETCH_DELAY_MS = 700;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Snap a number to the nearest 0.01 second. */
function snapTrimTime(value: number): number {
  return Math.round(value * TRIM_TIME_PRECISION) / TRIM_TIME_PRECISION;
}

/** Format seconds as "X.XXs" so short social clips can be trimmed precisely. */
export function formatTrimTime(sec: number): string {
  return `${snapTrimTime(sec).toFixed(2)}s`;
}

export function normalizeTrimRange({
  startTime,
  endTime,
  durationSec,
  minDurationSec = MIN_TRIM_DURATION_SEC,
}: {
  startTime: number;
  endTime: number;
  durationSec: number;
  minDurationSec?: number;
}) {
  const safeDuration = Math.max(0, snapTrimTime(durationSec));
  const safeMinDuration = Math.min(minDurationSec, safeDuration);
  const maxStart = Math.max(0, safeDuration - safeMinDuration);
  const normalizedStart = clamp(snapTrimTime(startTime), 0, maxStart);
  const normalizedEnd = clamp(
    snapTrimTime(endTime),
    normalizedStart + safeMinDuration,
    safeDuration
  );
  const trimmedDuration = snapTrimTime(normalizedEnd - normalizedStart);
  const removedFromStart = snapTrimTime(normalizedStart);
  const removedFromEnd = snapTrimTime(safeDuration - normalizedEnd);

  return {
    startTime: normalizedStart,
    endTime: normalizedEnd,
    trimmedDuration,
    removedFromStart,
    removedFromEnd,
    hasTrim: removedFromStart > 0 || removedFromEnd > 0,
  };
}

export function getTrimSummary({
  startTime,
  endTime,
  durationSec,
}: {
  startTime: number;
  endTime: number;
  durationSec: number;
}): string {
  const range = normalizeTrimRange({ startTime, endTime, durationSec });

  if (!range.hasTrim) {
    return "Full video selected. No trim will be applied.";
  }

  const removals = [
    range.removedFromStart > 0
      ? `${formatTrimTime(range.removedFromStart)} from start`
      : null,
    range.removedFromEnd > 0
      ? `${formatTrimTime(range.removedFromEnd)} from end`
      : null,
  ].filter(Boolean);

  return `Will submit ${formatTrimTime(range.startTime)} - ${formatTrimTime(
    range.endTime
  )}. Removes ${removals.join(" and ")}.`;
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

  // Thumbnails are decorative; the trim controls must be usable before they load.
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // Active drag handle
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  // Trim API state
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimError, setTrimError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch filmstrip thumbnails after first paint so opening the trimmer is instant.
  // ---------------------------------------------------------------------------
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
        .catch(() => {
          // Filmstrip thumbnails are decorative; keep the instant placeholder.
        });
    }, FILMSTRIP_FETCH_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      abortController.abort();
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
      });

      setStartTime(range.startTime);
      setEndTime(range.endTime);
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

  // ---------------------------------------------------------------------------
  // Trim API call
  // ---------------------------------------------------------------------------
  const handleTrim = async () => {
    const range = normalizeTrimRange({ startTime, endTime, durationSec });
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

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const trimRange = normalizeTrimRange({ startTime, endTime, durationSec });
  const trimmedDuration = trimRange.trimmedDuration;
  const startPct = durationSec > 0 ? (trimRange.startTime / durationSec) * 100 : 0;
  const endPct = durationSec > 0 ? (trimRange.endTime / durationSec) * 100 : 100;
  const trimSummary = getTrimSummary({ startTime, endTime, durationSec });
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
            {formatTrimTime(trimmedDuration)}
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
          data-trim-timeline="true"
          className="relative h-20 w-full select-none overflow-hidden rounded-xl border border-border bg-muted"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Filmstrip thumbnails */}
          <div className="absolute inset-0 flex">
            {thumbnails.length > 0
              ? thumbnails.map((thumb, i) => (
                  <img
                    key={i}
                    src={thumb}
                    alt=""
                    draggable={false}
                    className="flex-1 h-full object-cover border-r border-border/30 last:border-r-0"
                  />
                ))
              : Array.from({ length: FILMSTRIP_PLACEHOLDER_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    data-filmstrip-placeholder="true"
                    className="flex-1 border-r border-border/40 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.02))] last:border-r-0"
                  />
                ))}
          </div>

          {/* Dimmed overlay: before start */}
          <div
            className="absolute inset-y-0 left-0 bg-black/75 transition-[width] duration-75"
            style={{ width: `${startPct}%` }}
          />

          {/* Dimmed overlay: after end */}
          <div
            className="absolute inset-y-0 right-0 bg-black/75 transition-[width] duration-75"
            style={{ width: `${100 - endPct}%` }}
          />

          {/* Selected region highlight */}
          <div
            className={cn(
              "absolute inset-y-0 border-y-2 border-accent-green bg-accent-green/10 transition-[left,width] duration-75",
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
              "absolute inset-y-0 z-10 flex w-6 cursor-ew-resize items-center justify-center",
              "rounded-l-lg bg-accent-green transition-shadow",
              dragging === "start" && "shadow-[0_0_16px_rgba(123,165,67,0.5)]"
            )}
            style={{ left: `calc(${startPct}% - 12px)` }}
            onPointerDown={handlePointerDown("start")}
            aria-label="Trim start handle"
          >
            <GripVertical className="size-3 text-white/80" />
          </div>

          {/* End handle */}
          <div
            className={cn(
              "absolute inset-y-0 z-10 flex w-6 cursor-ew-resize items-center justify-center",
              "rounded-r-lg bg-accent-green transition-shadow",
              dragging === "end" && "shadow-[0_0_16px_rgba(123,165,67,0.5)]"
            )}
            style={{ left: `calc(${endPct}% - 12px)` }}
            onPointerDown={handlePointerDown("end")}
            aria-label="Trim end handle"
          >
            <GripVertical className="size-3 text-white/80" />
          </div>
        </div>
      </div>

      {/* Precise Range */}
      <div className="space-y-3 rounded-xl border border-border bg-muted/25 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Precise range
          </div>
          <div
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums",
              trimRange.hasTrim
                ? "bg-accent-green/10 text-accent-green"
                : "bg-white/5 text-muted-foreground"
            )}
          >
            {formatTrimTime(trimmedDuration)} selected
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground">Start</span>
            <Input
              type="number"
              min={0}
              max={Math.max(0, durationSec - MIN_TRIM_DURATION_SEC)}
              step={0.01}
              value={trimRange.startTime.toFixed(2)}
              onChange={(event) => {
                const nextStartTime = Number.parseFloat(event.currentTarget.value);
                if (Number.isFinite(nextStartTime)) {
                  applyRange(nextStartTime, endTime);
                }
              }}
              className="h-9 bg-black/20 font-mono text-xs tabular-nums"
              aria-label="Trim start time"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground">End</span>
            <Input
              type="number"
              min={MIN_TRIM_DURATION_SEC}
              max={durationSec}
              step={0.01}
              value={trimRange.endTime.toFixed(2)}
              onChange={(event) => {
                const nextEndTime = Number.parseFloat(event.currentTarget.value);
                if (Number.isFinite(nextEndTime)) {
                  applyRange(startTime, nextEndTime);
                }
              }}
              className="h-9 bg-black/20 font-mono text-xs tabular-nums"
              aria-label="Trim end time"
            />
          </label>
          <div className="space-y-1">
            <span className="block text-[10px] font-semibold text-muted-foreground">
              Selected
            </span>
            <div className="flex h-9 items-center rounded-lg border border-border bg-black/20 px-2.5 font-mono text-xs font-semibold text-foreground tabular-nums">
              {formatTrimTime(trimmedDuration)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-lg border border-border/80 bg-black/20 px-2.5 py-2">
            <div className="font-semibold text-muted-foreground">Removed from start</div>
            <div className="mt-0.5 font-mono text-xs font-bold text-foreground tabular-nums">
              {formatTrimTime(trimRange.removedFromStart)}
            </div>
          </div>
          <div className="rounded-lg border border-border/80 bg-black/20 px-2.5 py-2">
            <div className="font-semibold text-muted-foreground">Removed from end</div>
            <div className="mt-0.5 font-mono text-xs font-bold text-foreground tabular-nums">
              {formatTrimTime(trimRange.removedFromEnd)}
            </div>
          </div>
        </div>

        <p
          className={cn(
            "text-[11px] leading-relaxed",
            trimRange.hasTrim ? "text-accent-green" : "text-muted-foreground"
          )}
        >
          {trimSummary}
        </p>
      </div>

      {/* Error */}
      {trimError && (
        <div className="min-w-0 break-words rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive [overflow-wrap:anywhere]">
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
          disabled={isTrimming || !trimRange.hasTrim}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all",
            isTrimming
              ? "bg-accent-green/60"
              : !trimRange.hasTrim
                ? "cursor-not-allowed bg-muted text-muted-foreground"
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
              Apply Trim
            </>
          )}
        </button>
      </div>
    </div>
  );
}
