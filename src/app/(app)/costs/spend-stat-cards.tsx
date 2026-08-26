import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import type { SpendStatCardsProps } from "./types";

export function SpendStatCards({ dashboard, view }: SpendStatCardsProps) {
  const changeLabel =
    dashboard.changePercent === 0 ? "No change" : `${Math.abs(dashboard.changePercent).toFixed(0)}%`;
  const modelNote = dashboard.topModel
    ? `${formatCost(dashboard.topModel.cost)} · ${dashboard.topModel.pct}% of ${dashboard.period.toUpperCase()} spend`
    : "Model usage appears after your first generation";

  return (
    <section data-spend-stats="true" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <article className="pf-card p-4 transition-colors duration-[180ms] hover:border-[var(--pf-border-strong)]">
        <div className="flex items-start justify-between gap-3">
          <span data-lcp="Period Spend">
            <span className="sr-only">Period Spend</span>
          </span>
          <ChangeChip dashboard={dashboard} view={view} changeLabel={changeLabel} />
        </div>
        <strong data-spend-value="true" data-spend-text={formatCost(dashboard.currentPeriodCost)}></strong>
        <p data-spend-note="true" data-spend-note-text={`${formatCost(dashboard.totalCost)} all-time spend`}>
          <span className="sr-only">{formatCost(dashboard.totalCost)} all-time spend</span>
        </p>
      </article>

      <article className="pf-card p-4 transition-colors duration-[180ms] hover:border-[var(--pf-border-strong)]">
        <div className="flex items-start justify-between gap-3">
          <span data-lcp="Generations">
            <span className="sr-only">Generations</span>
          </span>
        </div>
        <strong data-spend-value="true" data-spend-text={String(dashboard.totalJobs)}></strong>
        <p data-spend-note="true" data-spend-note-text={`Avg cost ${formatCost(dashboard.avgCycleCost)} per generation`}>
          <span className="sr-only">Avg cost {formatCost(dashboard.avgCycleCost)} per generation</span>
        </p>
      </article>

      <article className="pf-card p-4 transition-colors duration-[180ms] hover:border-[var(--pf-border-strong)]">
        <div className="flex items-start justify-between gap-3">
          <span data-lcp="Top Model">
            <span className="sr-only">Top Model</span>
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

      <article className="pf-card p-4 transition-colors duration-[180ms] hover:border-[var(--pf-border-strong)]">
        <div className="flex items-start justify-between gap-3">
          <span data-lcp="Budget remaining">
            <span className="sr-only">Budget remaining</span>
          </span>
        </div>
        <strong data-spend-value="true" data-spend-text={formatCost(view.budgetRemaining)}></strong>
        <p data-spend-note="true" data-spend-note-text={`of ${formatCost(view.budget)} production budget`}>
          <span className="sr-only">of {formatCost(view.budget)} production budget</span>
        </p>
      </article>
    </section>
  );
}

function ChangeChip({
  dashboard,
  view,
  changeLabel,
}: {
  dashboard: SpendStatCardsProps["dashboard"];
  view: SpendStatCardsProps["view"];
  changeLabel: string;
}) {
  const showTrendUp = dashboard.changePercent !== 0 && view.changeIsUp;
  const showTrendDown = dashboard.changePercent < 0;

  return (
    <span
      data-lcp={changeLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
        dashboard.changePercent === 0 && "bg-[var(--pf-active)] text-[var(--pf-muted)]",
        view.changeIsUp && dashboard.changePercent > 0 && "bg-[color-mix(in_srgb,var(--pf-danger)_10%,transparent)] text-[var(--pf-danger)]",
        dashboard.changePercent < 0 && "bg-[color-mix(in_srgb,var(--pf-success)_10%,transparent)] text-[var(--pf-success)]"
      )}
    >
      {showTrendUp ? <TrendingUp className="size-3" /> : null}
      {showTrendDown ? <TrendingDown className="size-3" /> : null}
      <span className="sr-only">{changeLabel}</span>
    </span>
  );
}
