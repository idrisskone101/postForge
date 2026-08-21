import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatTrimTime,
  MIN_TRIM_DURATION_SEC,
} from "@/components/video-trim-range";

export function VideoTrimRangeFields({
  durationSec,
  startTime,
  endTime,
  trimmedDuration,
  removedFromStart,
  removedFromEnd,
  hasTrim,
  trimSummary,
  onStartChange,
  onEndChange,
}: {
  durationSec: number;
  startTime: number;
  endTime: number;
  trimmedDuration: number;
  removedFromStart: number;
  removedFromEnd: number;
  hasTrim: boolean;
  trimSummary: string;
  onStartChange: (nextStartTime: number) => void;
  onEndChange: (nextEndTime: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/25 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-medium text-muted-foreground">
          Precise range
        </div>
        <div
          className={cn(
            "rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums",
            hasTrim
              ? "bg-accent-green/10 text-accent-green"
              : "bg-white/5 text-muted-foreground"
          )}
        >
          {formatTrimTime(trimmedDuration)} selected
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-[12px] font-semibold text-muted-foreground">Start</span>
          <Input
            type="number"
            min={0}
            max={Math.max(0, durationSec - MIN_TRIM_DURATION_SEC)}
            step={0.01}
            value={startTime.toFixed(2)}
            onChange={(event) => {
              const nextStartTime = Number.parseFloat(event.currentTarget.value);
              if (Number.isFinite(nextStartTime)) {
                onStartChange(nextStartTime);
              }
            }}
            className="h-9 bg-black/20 font-mono text-xs tabular-nums"
            aria-label="Trim start time"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[12px] font-semibold text-muted-foreground">End</span>
          <Input
            type="number"
            min={MIN_TRIM_DURATION_SEC}
            max={durationSec}
            step={0.01}
            value={endTime.toFixed(2)}
            onChange={(event) => {
              const nextEndTime = Number.parseFloat(event.currentTarget.value);
              if (Number.isFinite(nextEndTime)) {
                onEndChange(nextEndTime);
              }
            }}
            className="h-9 bg-black/20 font-mono text-xs tabular-nums"
            aria-label="Trim end time"
          />
        </label>
        <div className="space-y-1">
          <span className="block text-[12px] font-semibold text-muted-foreground">
            Selected
          </span>
          <div className="flex h-9 items-center rounded-lg border border-border bg-black/20 px-2.5 font-mono text-xs font-semibold text-foreground tabular-nums">
            {formatTrimTime(trimmedDuration)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-lg border border-border/80 bg-black/20 px-2.5 py-2">
          <div className="font-semibold text-muted-foreground">Removed from start</div>
          <div className="mt-0.5 font-mono text-xs font-bold text-foreground tabular-nums">
            {formatTrimTime(removedFromStart)}
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-black/20 px-2.5 py-2">
          <div className="font-semibold text-muted-foreground">Removed from end</div>
          <div className="mt-0.5 font-mono text-xs font-bold text-foreground tabular-nums">
            {formatTrimTime(removedFromEnd)}
          </div>
        </div>
      </div>

      <p
        className={cn(
          "text-[11px] leading-relaxed",
          hasTrim ? "text-accent-green" : "text-muted-foreground"
        )}
      >
        {trimSummary}
      </p>
    </div>
  );
}
