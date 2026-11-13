"use client";

import { BrowserLocalText } from "@/components/browser-local-text";
import { Icon } from "@/components/workbench/icon";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { RANGES, rangeLabel } from "./performance-helpers";
import type { PerformanceRange } from "./types";

/** Quiet date-range pill in the shell header; a native select keeps keyboard and touch behaviour. */
export function PerformanceRangePill({
  range,
  onRange,
}: {
  range: PerformanceRange;
  onRange: (range: PerformanceRange) => void;
}) {
  return (
    <WorkspaceHeaderAccessory>
      <label className="relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-raised pl-3.5 pr-3 text-[14px] font-semibold leading-[18px] text-fg transition-[background-color] duration-[var(--pf-dur-feedback)] ease-pf focus-within:shadow-[0_0_0_2px_var(--pf-ember)] hover:bg-raised-strong max-sm:pl-3 max-sm:pr-2.5 max-sm:text-[13px]">
        <Icon name="calendar" size={18} className="max-sm:size-4" />
        <BrowserLocalText className="whitespace-nowrap max-sm:hidden">
          {rangeLabel(range, new Date())}
        </BrowserLocalText>
        <span className="whitespace-nowrap sm:hidden">{range} days</span>
        <Icon name="chevron-down" size={16} className="text-fg-muted" />
        <select
          aria-label="Date range"
          value={range}
          onChange={(event) => onRange(Number(event.target.value) as PerformanceRange)}
          className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
        >
          {RANGES.map((days) => (
            <option key={days} value={days}>
              Last {days} days
            </option>
          ))}
        </select>
      </label>
    </WorkspaceHeaderAccessory>
  );
}
