import type { PointerEvent, RefObject } from "react";
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
      className="relative h-16 w-full touch-none select-none overflow-hidden rounded-lg bg-media"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div className="absolute inset-0 flex">
        {thumbnails.length > 0
          ? thumbnails.map((thumb, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={thumb}
                alt=""
                draggable={false}
                className="h-full min-w-0 flex-1 border-r border-panel object-cover last:border-r-0"
              />
            ))
          : Array.from({ length: FILMSTRIP_PLACEHOLDER_COUNT }).map((_, i) => (
              <div
                key={i}
                data-filmstrip-placeholder="true"
                className="flex-1 border-r border-panel last:border-r-0"
              />
            ))}
      </div>

      <div
        className="absolute inset-y-0 left-0 bg-[var(--pf-scrim)]"
        style={{ width: `${startPct}%` }}
      />
      <div
        className="absolute inset-y-0 right-0 bg-[var(--pf-scrim)]"
        style={{ width: `${100 - endPct}%` }}
      />
      <div
        data-trim-window="true"
        className="pointer-events-none absolute inset-y-0 shadow-[inset_0_0_0_2px_var(--pf-ember)]"
        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
      />

      <TrimHandle
        pct={startPct}
        active={dragging === "start"}
        label="Trim start handle"
        onPointerDown={onStartPointerDown}
      />
      <TrimHandle
        pct={endPct}
        active={dragging === "end"}
        label="Trim end handle"
        onPointerDown={onEndPointerDown}
      />
    </div>
  );
}

function TrimHandle({
  pct,
  active,
  label,
  onPointerDown,
}: {
  pct: number;
  active: boolean;
  label: string;
  onPointerDown: (event: PointerEvent) => void;
}) {
  return (
    <div
      data-trim-handle="true"
      aria-label={label}
      className={cn(
        "absolute inset-y-0 z-10 flex w-3.5 cursor-ew-resize items-center justify-center rounded-md bg-ember",
        "shadow-[0_0_0_0_var(--pf-ember-wash)] transition-shadow duration-[var(--pf-dur-feedback)] ease-pf",
        active && "shadow-[0_0_0_4px_var(--pf-ember-wash)]"
      )}
      style={{ left: `clamp(0px, calc(${pct}% - 7px), calc(100% - 14px))` }}
      onPointerDown={onPointerDown}
    >
      <span className="h-5 w-0.5 rounded-full bg-[var(--pf-on-ember)]" />
    </div>
  );
}

export const FILMSTRIP_PLACEHOLDER_COUNT = 4;
