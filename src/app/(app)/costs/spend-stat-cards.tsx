import { Gauge, Sparkles, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import type { CostsPageClientProps, SpendDashboardView } from "./spend-models";

type SpendStatCardsProps = {
  dashboard: CostsPageClientProps;
  view: SpendDashboardView;
};

export function SpendStatCards({ dashboard, view }: SpendStatCardsProps) {
  return (
    <section data-spend-stats="true" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Period Spend</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
              dashboard.changePercent === 0 && "bg-muted text-muted-foreground",
              view.changeIsUp && "bg-destructive/10 text-destructive",
              dashboard.changePercent < 0 && "bg-accent-green/10 text-accent-green"
            )}
          >
            {dashboard.changePercent === 0 ? (
              "No change"
            ) : view.changeIsUp ? (
              <><TrendingUp className="size-3" /> {Math.abs(dashboard.changePercent).toFixed(0)}%</>
            ) : (
              <><TrendingDown className="size-3" /> {Math.abs(dashboard.changePercent).toFixed(0)}%</>
            )}
          </span>
        </div>
        <strong className="mt-3 block text-[28px] font-semibold tracking-[-0.02em] tabular-nums">
          {formatCost(dashboard.currentPeriodCost)}
        </strong>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatCost(dashboard.totalCost)} all-time spend
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
          {dashboard.totalJobs}
        </strong>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Avg cost {formatCost(dashboard.avgCycleCost)} per generation
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
          {dashboard.topModel ? dashboard.topModel.name : "No data yet"}
        </strong>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {dashboard.topModel
            ? `${formatCost(dashboard.topModel.cost)} · ${dashboard.topModel.pct}% of ${dashboard.period.toUpperCase()} spend`
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
          of {formatCost(view.budget)} production budget
        </p>
      </article>
    </section>
  );
}
