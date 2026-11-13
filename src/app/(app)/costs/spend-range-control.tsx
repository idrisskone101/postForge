"use client";

import { Segmented } from "@/components/workbench/segmented";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { SPEND_PERIODS, type SpendPeriod } from "@/lib/costs/spend-period";

/** 7d / 30d / 90d in the shell header, per the 12 Spend artboard. */
export function SpendRangeControl({
  period,
  onChange,
}: {
  period: SpendPeriod;
  onChange: (period: SpendPeriod) => void;
}) {
  return (
    <WorkspaceHeaderAccessory>
      <Segmented
        label="Spend period"
        value={period}
        onChange={onChange}
        options={OPTIONS}
        className="h-10 gap-0 p-1 [&>.wb-segment]:h-8 [&>.wb-segment]:w-auto [&>.wb-segment]:px-3.5"
      />
    </WorkspaceHeaderAccessory>
  );
}

const OPTIONS = SPEND_PERIODS.map((period) => ({
  value: period,
  label: period,
  ariaLabel: `Last ${period.replace("d", "")} days`,
}));
