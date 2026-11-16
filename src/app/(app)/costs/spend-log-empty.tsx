import Link from "next/link";
import { Button, buttonClass } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Panel } from "@/components/workbench/panel";
import type { SpendPeriod } from "@/lib/costs/spend-period";
import { periodDays } from "./spend-format";

/** A filter or search matched nothing inside a period that has spend. */
export function SpendLogEmpty({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <EmptyState icon="search" title="No matching cost entries" className="min-h-[200px]">
      <Button variant="strong" onClick={onClearFilters}>
        Clear filters
      </Button>
    </EmptyState>
  );
}

/** The selected period has no cost log at all: one panel instead of empty charts. */
export function SpendRangeEmpty({
  period,
  onWiden,
}: {
  period: SpendPeriod;
  onWiden: () => void;
}) {
  return (
    <Panel pad="none" className="min-w-0 p-5 max-md:p-4" aria-label="No spend in this period">
      <EmptyState
        icon="spend"
        title={`No spend in the last ${periodDays(period)} days`}
        className="min-h-[320px]"
      >
        {period === "90d" ? (
          <Link href="/generate" className={buttonClass("strong")}>
            Open Generate
          </Link>
        ) : (
          <Button variant="strong" onClick={onWiden}>
            Show 90 days
          </Button>
        )}
      </EmptyState>
    </Panel>
  );
}
