import { cn } from "@/lib/utils";

export type MeterTone = "neutral" | "ember" | "ok" | "bad" | "warn";

type MeterProps = {
  /** 0 to 100. */
  value: number;
  tone?: MeterTone;
  /** Live work: ember fill with the 1.6s highlight sweep. */
  running?: boolean;
  /** Accessible name, e.g. "Spend today". */
  label: string;
  className?: string;
};

/** Thin 4px bar with one fill. The fill scales from the left in 220ms, so only transform animates. */
export function Meter({ value, tone = "neutral", running = false, label, className }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("wb-meter", className)}
      data-tone={tone === "neutral" ? undefined : tone}
      data-running={running ? "true" : undefined}
    >
      <span className="wb-meter-fill" style={{ transform: `scaleX(${clamped / 100})` }} />
    </span>
  );
}
