import { Gauge, Sparkles, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import type { CostsPageClientProps, SpendDashboardView } from "./spend-models";

type SpendStatCardsProps = {
  totalCost: number;
  currentPeriodCost: number;
  changePercent: number;
  avgCycleCost: number;
  totalJobs: number;
  topModel: CostsPageClientProps["topModel"];
  period: CostsPageClientProps["period"];
  budget: number;
  view: Pick<SpendDashboardView, "budgetRemaining" | "changeIsUp">;
};

export function SpendStatCards({
  totalCost,
  currentPeriodCost,
  changePercent,
  avgCycleCost,
  totalJobs,
  topModel,
  period,
  budget,
  view,
}: SpendStatCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Period Spend</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
              changePercent === 0 && "bg-muted text-muted-foreground",
              view.changeIsUp && "bg-destructive/10 text-destructive",
              changePercent < 0 && "bg-accent-green/10 text-accent-green"
            )}
          >
            {changePercent === 0 ? (
              "No change"
            ) : view.changeIsUp ? (
              <><TrendingUp className="size-3" /> {Math.abs(changePercent).toFixed(0)}%</>
            ) : (
              <><TrendingDown className="size-3" /> {Math.abs(changePercent).toFixed(0)}%</>
            )}
          </span>
        </div>
        <strong className="mt-3 block text-[28px] font-semibold tracking-[-0.02em] tabular-nums">
          {formatCost(currentPeriodCost)}
        </strong>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatCost(totalCost)} all-time spend
        </p>
      </article>

      <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Generations</span>
          <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Sparkles className="size-3.5" />
          </span>
        </div>
        <strong className="mt-3 block text-[28px] font-semibold tracking-[-0.02em] tabular-nums">
          {totalJobs}
        </strong>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Avg cost {formatCost(avgCycleCost)} per generation
        </p>
      </article>

      <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Top Model</span>
          <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Gauge className="size-3.5" />
          </span>
        </div>
        <strong className="mt-3 block truncate text-[20px] font-semibold tracking-[-0.02em]">
          {topModel ? topModel.name : "No data yet"}
        </strong>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {topModel
            ? `${formatCost(topModel.cost)} · ${topModel.pct}% of ${period.toUpperCase()} spend`
            : "Model usage appears after your first generation"}
        </p>
      </article>

      <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Budget remaining</span>
          <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <WalletCards className="size-3.5" />
          </span>
        </div>
        <strong className="mt-3 block text-[28px] font-semibold tracking-[-0.02em] tabular-nums">
          {formatCost(view.budgetRemaining)}
        </strong>
        <p className="mt-1 text-[11px] text-muted-foreground">
          of {formatCost(budget)} production budget
        </p>
      </article>
    </section>
  );
}
