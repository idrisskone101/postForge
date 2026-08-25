import { Gauge, Sparkles, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import type { CostsPageClientProps, SpendDashboardView } from "./spend-models";

type SpendStatCardsProps = {
  dashboard: CostsPageClientProps;
  view: SpendDashboardView;
};

export function SpendStatCards({ dashboard, view }: SpendStatCardsProps) {
  const changeLabel =
    dashboard.changePercent === 0 ? "No change" : `${Math.abs(dashboard.changePercent).toFixed(0)}%`;
  const modelNote = dashboard.topModel
    ? `${formatCost(dashboard.topModel.cost)} · ${dashboard.topModel.pct}% of ${dashboard.period.toUpperCase()} spend`
    : "Model usage appears after your first generation";
  return (
    <section data-spend-stats="true" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
        <div className="flex items-start justify-between gap-3">
          <span data-spend-label="Period Spend">
            <span className="sr-only">Period Spend</span>
          </span>
          <span
            data-spend-change={changeLabel}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
              dashboard.changePercent === 0 && "bg-muted text-muted-foreground",
              view.changeIsUp && "bg-destructive/10 text-destructive",
              dashboard.changePercent < 0 && "bg-accent-green/10 text-accent-green"
            )}
          >
            {dashboard.changePercent !== 0 && view.changeIsUp ? (
              <TrendingUp className="size-3" />
            ) : dashboard.changePercent < 0 ? (
              <TrendingDown className="size-3" />
            ) : null}
            <span className="sr-only">{changeLabel}</span>
          </span>
        </div>
        <strong data-spend-value="true" data-spend-text={formatCost(dashboard.currentPeriodCost)} className="mt-3 block tabular-nums"></strong>
        <p data-spend-note="true" data-spend-note-text={`${formatCost(dashboard.totalCost)} all-time spend`}>
          <span className="sr-only">{formatCost(dashboard.totalCost)} all-time spend</span>
        </p>
      </article>

      <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
        <div className="flex items-start justify-between gap-3">
          <span data-spend-label="Generations">
            <span className="sr-only">Generations</span>
          </span>
          <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Sparkles className="size-3.5" />
          </span>
        </div>
        <strong data-spend-value="true" data-spend-text={String(dashboard.totalJobs)} className="mt-3 block tabular-nums"></strong>
        <p data-spend-note="true" data-spend-note-text={`Avg cost ${formatCost(dashboard.avgCycleCost)} per generation`}>
          <span className="sr-only">Avg cost {formatCost(dashboard.avgCycleCost)} per generation</span>
        </p>
      </article>

      <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
        <div className="flex items-start justify-between gap-3">
          <span data-spend-label="Top Model">
            <span className="sr-only">Top Model</span>
          </span>
          <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Gauge className="size-3.5" />
          </span>
        </div>
        <strong
          data-spend-model="true"
          data-spend-text={dashboard.topModel ? dashboard.topModel.name : "No data yet"}
        >
          <span className="sr-only">
            {dashboard.topModel ? dashboard.topModel.name : "No data yet"}
          </span>
        </strong>
        <p data-spend-note="true" data-spend-note-text={modelNote}>
          <span className="sr-only">{modelNote}</span>
        </p>
      </article>

      <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
        <div className="flex items-start justify-between gap-3">
          <span data-spend-label="Budget remaining">
            <span className="sr-only">Budget remaining</span>
          </span>
          <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <WalletCards className="size-3.5" />
          </span>
        </div>
        <strong data-spend-value="true" data-spend-text={formatCost(view.budgetRemaining)} className="mt-3 block tabular-nums"></strong>
        <p data-spend-note="true" data-spend-note-text={`of ${formatCost(view.budget)} production budget`}>
          <span className="sr-only">of {formatCost(view.budget)} production budget</span>
        </p>
      </article>
    </section>
  );
}
