"use client";

import { useState, useRef, useCallback, useEffect, type PointerEvent } from "react";
import { apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Button, Icon } from "@/components/workbench";
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

    video.currentTime = startTime;

    const onTimeUpdate = () => {
      if (video.currentTime >= endTime || video.currentTime < startTime) {
        video.currentTime = startTime;
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [startTime, endTime]);

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
    <div data-video-trimmer="true" className="wb-fade-in flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="wb-panel-title">Trim video</h3>
        <span
          className={cn(
            "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 font-mono text-[12px] leading-4 tabular-nums",
            trimRange.hasTrim ? "bg-ember-wash text-ember-text" : "bg-raised text-fg-secondary"
          )}
        >
          {formatTrimTime(trimmedDuration)} selected
        </span>
      </div>

      {!canUseFullVideo && (
        <p className="wb-notice" data-tone="warn">
          <span>
            <strong className="font-bold text-warn">Over {MAX_MOTION_SOURCE_DURATION_SEC}s.</strong>{" "}
            Clone sources must be {MAX_MOTION_SOURCE_DURATION_SEC}s or shorter, so a trim is required.
          </span>
        </p>
      )}

      <div className="flex flex-col gap-5 sm:flex-row">
        <div
          className="wb-tile mx-auto h-[300px] max-w-full shrink-0 sm:mx-0 sm:max-w-[45%]"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <video ref={videoRef} src={videoSrc} autoPlay muted playsInline loop />
          <span className="wb-tile-duration">{formatTrimTime(trimmedDuration)}</span>
        </div>
        <VideoTrimRangeFields
          range={trimRange}
          durationSec={durationSec}
          trimSummary={trimSummary}
          onEdit={(edge, seconds) =>
            edge === "start" ? applyRange(seconds, endTime) : applyRange(startTime, seconds)
          }
        />
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

      {trimError && (
        <p role="alert" className="wb-notice min-w-0 break-words text-bad [overflow-wrap:anywhere]" data-tone="bad">
          {trimError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-4">
        {isTrimming && (
          <span role="status" className="wb-meta mr-auto flex items-center gap-2">
            <span className="wb-live-dot" />
            Trimming
          </span>
        )}
        <Button onClick={onCancel} disabled={isTrimming || !canUseFullVideo}>
          {canUseFullVideo ? "Use full video" : "Trim required"}
        </Button>
        <Button variant="strong" onClick={handleTrim} disabled={isTrimming || !trimRange.hasTrim}>
          <Icon name="check" size={16} />
          {isTrimming ? "Trimming" : "Apply trim"}
        </Button>
      </div>
    </div>
  );
}

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