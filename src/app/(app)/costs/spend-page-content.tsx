"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { SPEND_PERIODS } from "@/lib/costs/spend-period";
import { readOptionalStorage, writeOptionalStorage } from "@/lib/optional-storage";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { SpendAnalysisGrid } from "./spend-analysis-grid";
import { SpendGenerationLog } from "./spend-generation-log";
import { buildSpendDashboardView } from "./spend-models";
import { SpendStatCards } from "./spend-stat-cards";
import type { SpendPageContentProps } from "./types";

export function SpendPageContent({
  dashboard,
  handlers,
}: SpendPageContentProps) {
  const [budget, setBudget] = useState(250);
  const [budgetInput, setBudgetInput] = useState("250");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const paintReady = useWindowLoadReady();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = readOptionalStorage(BUDGET_STORAGE_KEY);
      const parsed = stored ? Number(stored) : Number.NaN;
      if (Number.isFinite(parsed) && parsed > 0) {
        setBudget(parsed);
        setBudgetInput(String(parsed));
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const view = useMemo(
    () =>
      buildSpendDashboardView({
        byModel: dashboard.byModel,
        model: dashboard.model,
        logPage: dashboard.logPage,
        logTotalCount: dashboard.logTotalCount,
        logFilterActive: dashboard.logFilterActive,
        breakdown: dashboard.breakdown,
        currentPeriodCost: dashboard.currentPeriodCost,
        budget,
        changePercent: dashboard.changePercent,
      }),
    [
      dashboard.byModel,
      dashboard.model,
      dashboard.logPage,
      dashboard.logTotalCount,
      dashboard.logFilterActive,
      dashboard.breakdown,
      dashboard.currentPeriodCost,
      budget,
      dashboard.changePercent,
    ]
  );

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const count = await handlers.onExportCsv();
      setFeedback(
        `Exported ${count} cost log ${count === 1 ? "entry" : "entries"}.`
      );
    } catch {
      return;
    } finally {
      setExporting(false);
    }
  };

  const saveBudget = () => {
    const nextBudget = Number(budgetInput);
    if (!Number.isFinite(nextBudget) || nextBudget <= 0) return;
    setBudget(nextBudget);
    writeOptionalStorage(BUDGET_STORAGE_KEY, String(nextBudget));
    setBudgetOpen(false);
    setFeedback(`Production budget updated to ${formatCost(nextBudget)}.`);
  };

  return (
    <div data-spend-page="true" className="mx-auto max-w-[1280px] space-y-4 p-5 sm:p-6 lg:p-8">
      <section
        data-spend-controls="true"
        className="pf-card flex h-[10.75rem] flex-col gap-4 overflow-hidden p-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="min-w-0">
          <p
            data-spend-intro="true"
            data-spend-intro-text="Cost tracking, budget signals, and model usage."
          >
            <span className="sr-only">
              Cost tracking, budget signals, and model usage.
            </span>
          </p>
        </div>

        <div data-spend-actions="true" className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-[8px] bg-[var(--pf-active)] p-1 text-[12px] font-medium"
            aria-label="Spend period"
          >
            {SPEND_PERIODS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={dashboard.period === option}
                onClick={() => {
                  handlers.onPeriodChange(option);
                }}
                className={cn(
                  "rounded-[6px] px-3 py-1.5 transition-colors duration-[180ms]",
                  dashboard.period === option
                    ? "bg-[var(--pf-surface)] text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
                    : "text-[var(--pf-muted)] hover:text-[var(--pf-ink)]"
                )}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              void exportCsv();
            }}
            disabled={exporting}
            className="pf-button-secondary inline-flex items-center gap-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <Download className="size-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className="flex min-w-0 items-start gap-2 rounded-[8px] border border-[color-mix(in_srgb,var(--pf-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--pf-success)_10%,transparent)] px-4 py-3 text-sm text-[var(--pf-ink)]"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--pf-success)]" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{feedback}</span>
        </div>
      ) : null}

      <SpendStatCards dashboard={dashboard} view={view} />

      <section
        data-spend-budget={paintReady ? undefined : "true"}
        className={cn(
          "flex flex-col gap-4 rounded-[8px] border p-4 lg:flex-row lg:items-center",
          view.budgetPercent >= 90
            ? "border-[color-mix(in_srgb,var(--pf-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--pf-danger)_5%,transparent)]"
            : "border-[color-mix(in_srgb,var(--pf-lamp-amber)_40%,transparent)] bg-[color-mix(in_srgb,var(--pf-lamp-amber)_10%,transparent)]"
        )}
      >
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-[8px]",
            view.budgetPercent >= 90
              ? "bg-[color-mix(in_srgb,var(--pf-danger)_10%,transparent)] text-[var(--pf-danger)]"
              : "bg-[color-mix(in_srgb,var(--pf-lamp-amber)_15%,transparent)] text-[var(--pf-lamp-amber)]"
          )}
        >
          <AlertTriangle className="size-4" />
        </div>
        <div data-spend-budget-copy="true" className="min-w-0 flex-1">
          <strong
            data-spend-budget-label={`You've used ${view.budgetPercent.toFixed(0)}% of your production budget`}
          >
            <span className="sr-only">
              You&apos;ve used {view.budgetPercent.toFixed(0)}% of your production budget
            </span>
          </strong>
          <p
            data-spend-note="true"
            data-spend-note-text="Track the selected period against a budget you control locally in PostForge."
          >
            <span className="sr-only">
              Track the selected period against a budget you control locally in PostForge.
            </span>
          </p>
        </div>
        <div
          data-spend-meter="true"
          className="flex min-w-0 items-center gap-3 lg:w-72 lg:max-w-full"
        >
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--pf-active)]">
            <div
              className={cn(
                "h-full rounded-full",
                view.budgetPercent >= 90 ? "bg-[var(--pf-danger)]" : "bg-[var(--pf-lamp-amber)]"
              )}
              style={{ width: `${view.budgetPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-medium text-[var(--pf-muted)]">
            {formatCost(dashboard.currentPeriodCost)} / {formatCost(view.budget)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setBudgetOpen(true)}
          className="pf-button-secondary shrink-0"
        >
          Edit budget
        </button>
      </section>

      <SpendAnalysisGrid dashboard={dashboard} view={view} />

      <SpendGenerationLog
        dashboard={dashboard}
        view={view}
        handlers={handlers}
      />

      {budgetOpen ? (
        <SpendBudgetDialog
          budgetInput={budgetInput}
          onBudgetInputChange={setBudgetInput}
          onClose={() => setBudgetOpen(false)}
          onSave={saveBudget}
        />
      ) : null}
    </div>
  );
}

const SpendBudgetDialog = dynamic(
  () =>
    import("./spend-budget-dialog").then((mod) => ({
      default: mod.SpendBudgetDialog,
    })),
  { ssr: false }
);

const BUDGET_STORAGE_KEY = "postforge-production-budget";
