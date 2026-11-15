import { cn } from "@/lib/utils";

export type MeterTone = "neutral" | "ember" | "ok" | "bad" | "warn";

type MeterProps = {
  tone?: MeterTone;
  /** Accessible name, e.g. "Spend today". Name the stage when the work reports no amount. */
  label: string;
  className?: string;
} & (
  | {
      /** 0 to 100. */
      value: number;
      /** Live work: ember fill with the 1.6s highlight sweep. */
      running?: boolean;
    }
  | {
      /** Live work that reports no amount: a full sweeping track that announces no value. */
      value?: undefined;
      running: true;
    }
);

/** Thin 4px bar with one fill. The fill scales from the left in 220ms, so only transform animates. */
export function Meter({ value, tone = "neutral", running = false, label, className }: MeterProps) {
  const clamped = value === undefined ? 100 : Math.max(0, Math.min(100, value));
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={value === undefined ? undefined : 0}
      aria-valuemax={value === undefined ? undefined : 100}
      aria-valuenow={value === undefined ? undefined : Math.round(clamped)}
      className={cn("wb-meter", className)}
      data-tone={tone === "neutral" ? undefined : tone}
      data-running={running ? "true" : undefined}
    >
      <span className="wb-meter-fill" style={{ transform: `scaleX(${clamped / 100})` }} />
    </span>
  );
}
