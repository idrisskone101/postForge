import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

export type StatusTone = "ok" | "warn" | "bad" | "neutral";

type StatusBadgeProps = {
  tone: StatusTone;
  /** The status word. It is read by assistive tech and shown as the tooltip. */
  label: string;
  className?: string;
};

/** 22px round icon badge for thumbnails and dense tables: ok check, warn clock, bad x, neutral clock. */
export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("wb-status-badge", className)}
      data-tone={tone}
    >
      <Icon name={TONE_ICON[tone]} size={12} strokeWidth={2.5} />
    </span>
  );
}

const TONE_ICON: Record<StatusTone, IconName> = {
  ok: "check",
  warn: "clock",
  bad: "x",
  neutral: "clock",
};
