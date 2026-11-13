import { Button } from "@/components/workbench/button";
import { Meter } from "@/components/workbench/meter";
import { StatStrip } from "@/components/workbench/stat-strip";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { budgetMoney, changeLabel } from "./spend-format";
import type { SpendStatCardsProps } from "./types";

export function SpendStatCards({ dashboard, view, onEditBudget }: SpendStatCardsProps) {
  const change = changeLabel(dashboard.currentPeriodCost, dashboard.previousPeriodCost);
  const over = dashboard.currentPeriodCost > view.budget;
  return (
    <StatStrip
      className={STRIP_CLASS}
      stats={[
        {
          label: "Spend",
          value: (
            <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 max-md:justify-end">
              {formatCost(dashboard.currentPeriodCost)}
              {change ? (
                <span className={CHIP} title="Against the previous period of the same length">
                  {change}
                </span>
              ) : null}
            </span>
          ),
          aside: (
            <span className={SIDE_FIGURE}>
              <span className="font-mono">{formatCost(dashboard.totalCost)}</span> all time
            </span>
          ),
        },
        {
          label: "Generations",
          value: dashboard.totalJobs,
          aside: (
            <span className={SIDE_FIGURE}>
              Avg cost{" "}
              <span className="font-mono">
                {dashboard.totalJobs > 0 ? formatCost(dashboard.avgCycleCost) : "-"}
              </span>
            </span>
          ),
        },
        {
          label: "Budget left",
          value: <span className={cn(over && "text-bad")}>{formatCost(view.budgetRemaining)}</span>,
          aside: (
            <span className="flex min-w-0 flex-1 items-center gap-4 md:ml-1.5 text-[12px] font-normal leading-4 tracking-normal max-md:basis-full">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
                <Meter
                  label="Budget used"
                  value={view.budgetPercent}
                  tone={over ? "bad" : "ember"}
                  className="min-w-24"
                />
                <span className="wb-mono shrink-0 leading-[18px] text-fg-secondary">
                  {formatCost(dashboard.currentPeriodCost)} / {budgetMoney(view.budget)}
                </span>
              </span>
              <Button size={32} onClick={onEditBudget}>
                Edit budget
              </Button>
            </span>
          ),
        },
      ]}
    />
  );
}

const CHIP =
  "inline-flex h-[22px] shrink-0 items-center whitespace-pre rounded-full bg-raised px-[9px] font-mono text-[12px] font-normal leading-4 tracking-normal text-fg-secondary";

const SIDE_FIGURE =
  "shrink-0 whitespace-nowrap text-[12px] font-normal leading-[18px] tracking-normal text-fg-secondary max-md:basis-full max-md:text-right";

const STRIP_CLASS = cn(
  "shrink-0 [&>.wb-stat:nth-child(2)]:flex-[0.8] [&>.wb-stat:nth-child(3)]:flex-[1.6]",
  "md:[&>.wb-stat:nth-child(-n+2)_.wb-stat-value]:flex-wrap md:[&>.wb-stat:nth-child(-n+2)_.wb-stat-value]:justify-between md:[&>.wb-stat:nth-child(-n+2)_.wb-stat-value]:gap-y-0",
  "lg:max-xl:[&>.wb-stat:nth-child(3)]:flex-[2.2]",
  "max-md:flex-col max-md:px-5 max-md:py-1",
  "max-md:[&>.wb-stat]:min-h-[60px] max-md:[&>.wb-stat]:flex-none max-md:[&>.wb-stat]:flex-row max-md:[&>.wb-stat]:flex-wrap max-md:[&>.wb-stat]:items-center max-md:[&>.wb-stat]:justify-between max-md:[&>.wb-stat]:py-3",
  "max-md:[&>.wb-stat]:border-l-0 max-md:[&>.wb-stat]:px-0 max-md:[&_.wb-stat-value]:text-[28px] max-md:[&_.wb-stat-value]:leading-8",
  "max-md:[&_.wb-stat-value]:flex-wrap max-md:[&_.wb-stat-value]:justify-end max-md:[&>.wb-stat:nth-child(3)_.wb-stat-value]:gap-y-3",
  "max-md:[&>.wb-stat+.wb-stat]:border-t max-md:[&>.wb-stat+.wb-stat]:border-hairline",
  "md:max-lg:flex-wrap md:max-lg:gap-y-4 md:max-lg:[&>.wb-stat:nth-child(3)]:basis-full md:max-lg:[&>.wb-stat:nth-child(3)]:border-l-0 md:max-lg:[&>.wb-stat:nth-child(3)]:border-t md:max-lg:[&>.wb-stat:nth-child(3)]:border-hairline md:max-lg:[&>.wb-stat:nth-child(3)]:pl-0 md:max-lg:[&>.wb-stat:nth-child(3)]:pt-4",
);
