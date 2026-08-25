"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Settings2 } from "lucide-react";
import { SPEND_PERIODS } from "@/lib/costs/spend-period";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { readOptionalStorage, writeOptionalStorage } from "@/lib/optional-storage";
import { SpendAnalysisGrid } from "./spend-analysis-grid";
import { SpendGenerationLog } from "./spend-generation-log";
import {
  buildSpendDashboardView,
  type SpendPageContentProps,
} from "./spend-models";
import { SpendStatCards } from "./spend-stat-cards";

export function SpendPageContent({
  dashboard,
  handlers,
}: SpendPageContentProps) {
  const [budget, setBudget] = useState(250);
  const [budgetInput, setBudgetInput] = useState("250");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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
        className="flex h-[10.75rem] flex-col gap-4 overflow-hidden rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)] lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Spend controls
          </p>
          <p
            data-spend-intro="true"
            data-spend-intro-text="Cost tracking, budget signals, and model usage."
          >
            <span className="sr-only">
              Cost tracking, budget signals, and model usage.
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center rounded-lg border border-border bg-background p-1 text-[11px] font-semibold"
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
                  "h-8 rounded-md px-3 transition-colors",
                  dashboard.period === option
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            <Download className="size-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex min-w-0 items-start gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-green" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{feedback}</span>
        </div>
      )}

      <SpendStatCards dashboard={dashboard} view={view} />

      <section
        className={cn(
          "flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center",
          view.budgetPercent >= 90
            ? "border-destructive/30 bg-destructive/5"
            : "border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10"
        )}
      >
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            view.budgetPercent >= 90
              ? "bg-destructive/10 text-destructive"
              : "bg-[var(--pf-lamp-amber)]/15 text-[var(--pf-lamp-amber)]"
          )}
        >
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <strong className="text-sm">
            You&apos;ve used {view.budgetPercent.toFixed(0)}% of your production budget
          </strong>
          <p className="mt-1 text-xs text-muted-foreground">
            Track the selected period against a budget you control locally in PostForge.
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-3 lg:w-72 lg:max-w-full">
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-black/10">
            <div
              className={cn(
                "h-full rounded-full",
                view.budgetPercent >= 90 ? "bg-destructive" : "bg-[var(--pf-lamp-amber)]"
              )}
              style={{ width: `${view.budgetPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
            {formatCost(dashboard.currentPeriodCost)} / {formatCost(view.budget)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setBudgetOpen(true)}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold transition-colors hover:bg-muted"
        >
          <Settings2 className="size-3.5" />
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