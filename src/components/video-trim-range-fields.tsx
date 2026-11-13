import { KeyValueList } from "@/components/workbench";
import {
  formatTrimTime,
  MIN_TRIM_DURATION_SEC,
  type TrimRange,
} from "@/components/video-trim-range";

export function VideoTrimRangeFields({
  range,
  durationSec,
  trimSummary,
  onEdit,
}: {
  range: TrimRange;
  durationSec: number;
  trimSummary: string;
  onEdit: (edge: "start" | "end", seconds: number) => void;
}) {
  const edit = (edge: "start" | "end") => (event: React.ChangeEvent<HTMLInputElement>) => {
    const seconds = Number.parseFloat(event.currentTarget.value);
    if (Number.isFinite(seconds)) onEdit(edge, seconds);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3.5">
      <span className="wb-label">Precise range</span>
      <div className="grid grid-cols-2 gap-3">
        <label className="wb-field">
          <span className="wb-label">Start</span>
          <input
            type="number"
            min={0}
            max={Math.max(0, durationSec - MIN_TRIM_DURATION_SEC)}
            step={0.01}
            value={range.startTime.toFixed(2)}
            onChange={edit("start")}
            className="wb-input"
            data-mono="true"
            aria-label="Trim start time"
          />
        </label>
        <label className="wb-field">
          <span className="wb-label">End</span>
          <input
            type="number"
            min={MIN_TRIM_DURATION_SEC}
            max={durationSec}
            step={0.01}
            value={range.endTime.toFixed(2)}
            onChange={edit("end")}
            className="wb-input"
            data-mono="true"
            aria-label="Trim end time"
          />
        </label>
      </div>
      <KeyValueList
        rows={[
          { label: "Removed from start", value: formatTrimTime(range.removedFromStart), mono: true },
          { label: "Removed from end", value: formatTrimTime(range.removedFromEnd), mono: true },
        ]}
      />
      <p className="text-[13px] leading-[18px] text-fg-secondary">{trimSummary}</p>
    </div>
  );
}
