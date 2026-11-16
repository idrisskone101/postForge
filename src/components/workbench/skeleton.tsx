import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = {
  /** line: 10px pill. tile: 12px radius block. panel: 16px panel block. */
  shape?: "line" | "tile" | "panel";
  /** Sizing classes, e.g. "w-2/3" or "h-[236px]". */
  className?: string;
  style?: CSSProperties;
};

/** Static placeholder. No shimmer, no pulse. */
export function Skeleton({ shape = "line", className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("wb-skeleton", className)}
      data-shape={shape === "line" ? undefined : shape}
      style={style}
    />
  );
}
