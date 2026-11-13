import type { ReactNode } from "react";
import { StatStrip } from "@/components/workbench/stat-strip";
import { cn } from "@/lib/utils";
import type { PerformanceStatCell } from "./types";

/** `cells: null` renders the loading strip in the same frame. */
export function PerformanceStats({ cells }: { cells: PerformanceStatCell[] | null }) {
  const stats = cells
    ? cells.map((cell) => ({
        label: cell.label,
        value: <span className={cn(cell.unavailable && "text-fg-muted")}>{cell.value}</span>,
        foot: cell.coverage ? <span className="wb-mono text-fg-secondary">{cell.coverage}</span> : undefined,
      }))
    : LOADING_LABELS.map((label) => ({ label, value: LOADING_VALUE as ReactNode }));
  return <StatStrip className={STRIP_CLASS} stats={stats} />;
}

const LOADING_LABELS = ["Views", "Likes", "Comments", "Posts", "Engagement rate"];
const LOADING_VALUE = <span className="wb-skeleton my-1 block h-8 w-20 rounded-sm" data-shape="tile" />;

const STRIP_CLASS = cn(
  "shrink-0 [&>.wb-stat:first-child]:flex-[1.25]",
  "md:max-lg:grid md:max-lg:grid-cols-3 md:max-lg:gap-y-4",
  "md:max-lg:[&>.wb-stat:nth-child(3n+1)]:border-l-0 md:max-lg:[&>.wb-stat:nth-child(3n+1)]:pl-0",
  "max-md:flex-col max-md:px-5 max-md:py-1",
  "max-md:[&>.wb-stat]:min-h-[60px] max-md:[&>.wb-stat]:flex-none max-md:[&>.wb-stat]:flex-row max-md:[&>.wb-stat]:flex-wrap max-md:[&>.wb-stat]:items-center max-md:[&>.wb-stat]:justify-between",
  "max-md:[&>.wb-stat]:border-l-0 max-md:[&>.wb-stat]:px-0 max-md:[&_.wb-stat-value]:text-[28px] max-md:[&_.wb-stat-value]:leading-8",
  "max-md:[&>.wb-stat+.wb-stat]:border-t max-md:[&>.wb-stat+.wb-stat]:border-hairline",
);
