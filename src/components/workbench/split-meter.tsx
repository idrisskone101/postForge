import { cn } from "@/lib/utils";
import type { MeterTone } from "./meter";

export type MeterPart = {
  /** Relative weight of this part. Ignored when `equal` is set. */
  value: number;
  tone: MeterTone | "empty";
  label?: string;
};

type SplitMeterProps = {
  parts: readonly MeterPart[];
  /** Same-size segments (a step count) instead of weighted parts (a split). */
  equal?: boolean;
  /** Accessible name, e.g. "14 completed, 2 failed". */
  label: string;
  className?: string;
};

/** Thin 4px bar in parts with 2px gaps: a weighted split or equal segments. */
export function SplitMeter({ parts, equal = false, label, className }: SplitMeterProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(equal ? "wb-meter-segments" : "wb-meter-split", className)}
    >
      {parts.map((part, index) => (
        <span
          key={index}
          title={part.label}
          data-tone={part.tone === "empty" ? undefined : part.tone}
          style={equal ? undefined : { flexGrow: part.value }}
        />
      ))}
    </span>
  );
}
