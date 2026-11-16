import { cn } from "@/lib/utils";

type CountBadgeProps = {
  count: number;
  tone?: "neutral" | "bad" | "warn";
  /** Spoken label, e.g. "2 outputs to review". */
  label?: string;
  className?: string;
};

/** 20px count pill. Renders nothing for zero. */
export function CountBadge({ count, tone = "neutral", label, className }: CountBadgeProps) {
  if (count <= 0) return null;
  return (
    <span className={cn("wb-count", className)} data-tone={tone} aria-label={label}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
