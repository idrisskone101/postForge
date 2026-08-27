"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import type { SpendStatCardsProps } from "./types";

export function SpendStatCards({ dashboard, view }: SpendStatCardsProps) {
  const changeLabel =
    dashboard.changePercent === 0 ? "No change" : `${Math.abs(dashboard.changePercent).toFixed(0)}%`;
  const modelName = dashboard.topModel ? dashboard.topModel.name : "No data yet";
  const modelNote = dashboard.topModel
    ? `${formatCost(dashboard.topModel.cost)} · ${dashboard.topModel.pct}% of ${dashboard.period.toUpperCase()} spend`
    : "Model usage appears after your first generation";
  const allTimeNote = `${formatCost(dashboard.totalCost)} all-time spend`;
  const avgNote = `Avg cost ${formatCost(dashboard.avgCycleCost)} per generation`;
  const budgetNote = `of ${formatCost(view.budget)} production budget`;
  const periodSpend = formatCost(dashboard.currentPeriodCost);
  const generations = String(dashboard.totalJobs);
  const budgetRemaining = formatCost(view.budgetRemaining);

  return (
    <section data-spend-stats="true" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <article className="pf-card p-4 transition-colors duration-[180ms] hover:border-[var(--pf-border-strong)]">
        <div className="flex items-start justify-between gap-3">
          <span data-lcp="Period Spend">
            <span className="sr-only">Period Spend</span>
          </span>
          <ChangeChip dashboard={dashboard} view={view} changeLabel={changeLabel} />
        </div>
        <strong data-spend-value="true" data-spend-text={periodSpend}>
          <span className="sr-only">{periodSpend}</span>
        </strong>
        <p data-spend-note="true" data-spend-note-text={allTimeNote}>
          <span className="sr-only">{allTimeNote}</span>
        </p>
      </article>

      <article className="pf-card p-4 transition-colors duration-[180ms] hover:border-[var(--pf-border-strong)]">
        <div className="flex items-start justify-between gap-3">
          <span data-lcp="Generations">
            <span className="sr-only">Generations</span>
          </span>
        </div>
        <strong data-spend-value="true" data-spend-text={generations}>
          <span className="sr-only">{generations}</span>
        </strong>
        <p data-spend-note="true" data-spend-note-text={avgNote}>
          <span className="sr-only">{avgNote}</span>
        </p>
      </article>

      <article className="pf-card p-4 transition-colors duration-[180ms] hover:border-[var(--pf-border-strong)]">
        <div className="flex items-start justify-between gap-3">
          <span data-lcp="Top Model">
            <span className="sr-only">Top Model</span>
          </span>
        </div>
        <strong data-spend-model="true" data-spend-text={modelName}>
          <span className="sr-only">{modelName}</span>
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
        <strong data-spend-value="true" data-spend-text={budgetRemaining}>
          <span className="sr-only">{budgetRemaining}</span>
        </strong>
        <p data-spend-note="true" data-spend-note-text={budgetNote}>
          <span className="sr-only">{budgetNote}</span>
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
  const chipClass = cn(
    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
    dashboard.changePercent === 0 && "bg-[var(--pf-active)] text-[var(--pf-muted)]",
    view.changeIsUp && dashboard.changePercent > 0 && "bg-[color-mix(in_srgb,var(--pf-danger)_10%,transparent)] text-[var(--pf-danger)]",
    dashboard.changePercent < 0 && "bg-[color-mix(in_srgb,var(--pf-success)_10%,transparent)] text-[var(--pf-success)]"
  );

  return (
    <span data-lcp={changeLabel} className={chipClass}>
      {showTrendUp ? <TrendingUp className="size-3" /> : null}
      {showTrendDown ? <TrendingDown className="size-3" /> : null}
      <span className="sr-only">{changeLabel}</span>
    </span>
  );
}
