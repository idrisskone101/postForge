import type { CSSProperties, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type RangeProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Native range input. The filled part follows the value; light fills ink, dark fills ember. */
export function Range({ min = 0, max = 100, value, style, className, ...rest }: RangeProps) {
  const low = Number(min);
  const span = Number(max) - low;
  const fill = span > 0 ? ((Number(value ?? low) - low) / span) * 100 : 0;
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      className={cn("wb-range", className)}
      style={{ "--wb-range-fill": `${Math.min(100, Math.max(0, fill))}%`, ...style } as CSSProperties}
      {...rest}
    />
  );
}
