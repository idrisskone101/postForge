import type { PointerEvent, RefObject } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function VideoTrimTimeline({
  trackRef,
  thumbnails,
  startPct,
  endPct,
  dragging,
  onPointerMove,
  onPointerUp,
  onStartPointerDown,
  onEndPointerDown,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
  thumbnails: string[];
  startPct: number;
  endPct: number;
  dragging: "start" | "end" | null;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: () => void;
  onStartPointerDown: (event: PointerEvent) => void;
  onEndPointerDown: (event: PointerEvent) => void;
}) {
  return (
    <div
      ref={trackRef}
      data-trim-timeline="true"
      className="relative h-20 w-full select-none overflow-hidden rounded-lg border border-border bg-muted"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
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

      <div
        className="absolute inset-y-0 left-0 bg-black/75 transition-[width] duration-75"
        style={{ width: `${startPct}%` }}
      />

      <div
        className="absolute inset-y-0 right-0 bg-black/75 transition-[width] duration-75"
        style={{ width: `${100 - endPct}%` }}
      />

      <div
        className={cn(
          "absolute inset-y-0 border-y-2 border-accent-green bg-accent-green/10 transition-[left,width] duration-75",
          dragging && "shadow-[0_0_12px_rgba(22,163,74,0.3)]"
        )}
        style={{
          left: `${startPct}%`,
          width: `${endPct - startPct}%`,
        }}
      />

      <div
        className={cn(
          "absolute inset-y-0 z-10 flex w-6 cursor-ew-resize items-center justify-center",
          "rounded-l-lg bg-accent-green transition-shadow",
          dragging === "start" && "shadow-[0_0_16px_rgba(22,163,74,0.5)]"
        )}
        style={{ left: `calc(${startPct}% - 12px)` }}
        onPointerDown={onStartPointerDown}
        aria-label="Trim start handle"
      >
        <GripVertical className="size-3 text-white/80" />
      </div>

      <div
        className={cn(
          "absolute inset-y-0 z-10 flex w-6 cursor-ew-resize items-center justify-center",
          "rounded-r-lg bg-accent-green transition-shadow",
          dragging === "end" && "shadow-[0_0_16px_rgba(22,163,74,0.5)]"
        )}
        style={{ left: `calc(${endPct}% - 12px)` }}
        onPointerDown={onEndPointerDown}
        aria-label="Trim end handle"
      >
        <GripVertical className="size-3 text-white/80" />
      </div>
    </div>
  );
}


export const FILMSTRIP_PLACEHOLDER_COUNT = 4;