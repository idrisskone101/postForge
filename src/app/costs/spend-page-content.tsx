"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SPEND_PERIODS } from "@/lib/costs/spend-period";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { SpendAnalysisGrid } from "./spend-analysis-grid";
import { SpendGenerationLog } from "./spend-generation-log";
import {
  buildSpendDashboardView,
  type SpendPageContentProps,
} from "./spend-models";
import { SpendStatCards } from "./spend-stat-cards";

const BUDGET_STORAGE_KEY = "postforge-production-budget";

export function SpendPageContent({
  totalCost,
  currentPeriodCost,
  changePercent,
  avgCycleCost,
  totalJobs,
  topModel,
  chartData,
  byModel,
  breakdown,
  logs,
  logPage,
  logTotalCount,
  logHasNext,
  logFilterActive,
  search,
  model,
  period,
  onPeriodChange,
  onLogPageChange,
  onSearchChange,
  onModelChange,
  onClearFilters,
  onExportCsv,
}: SpendPageContentProps) {
  const [budget, setBudget] = useState(250);
  const [budgetInput, setBudgetInput] = useState("250");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(BUDGET_STORAGE_KEY);
        const parsed = stored ? Number(stored) : Number.NaN;
        if (Number.isFinite(parsed) && parsed > 0) {
          setBudget(parsed);
          setBudgetInput(String(parsed));
        }
      } catch {
        // Local budget preferences are optional; the spend dashboard still works.
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
        byModel,
        model,
        logPage,
        logTotalCount,
        logFilterActive,
        breakdown,
        currentPeriodCost,
        budget,
        changePercent,
      }),
    [
      byModel,
      model,
      logPage,
      logTotalCount,
      logFilterActive,
      breakdown,
      currentPeriodCost,
      budget,
      changePercent,
    ]
  );

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const count = await onExportCsv();
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
    try {
      window.localStorage.setItem(BUDGET_STORAGE_KEY, String(nextBudget));
    } catch {
      // Keep the in-session preference even if storage is unavailable.
    }
    setBudgetOpen(false);
    setFeedback(`Production budget updated to ${formatCost(nextBudget)}.`);
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 p-5 sm:p-6 lg:p-8">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)] lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Spend controls
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cost tracking, budget signals, and model usage.
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
                aria-pressed={period === option}
                onClick={() => {
                  onPeriodChange(option);
                }}
                className={cn(
                  "h-8 rounded-md px-3 transition-colors",
                  period === option
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => {
                    void exportCsv();
                  }}
                  disabled={exporting}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                />
              }
            >
              <Download className="size-4" />
              <span>Export CSV</span>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
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

      <SpendStatCards
        totalCost={totalCost}
        currentPeriodCost={currentPeriodCost}
        changePercent={changePercent}
        avgCycleCost={avgCycleCost}
        totalJobs={totalJobs}
        topModel={topModel}
        period={period}
        budget={budget}
        view={view}
      />

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
        <div className="flex min-w-0 items-center gap-3 lg:w-72">
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
            {formatCost(currentPeriodCost)} / {formatCost(budget)}
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

      <SpendAnalysisGrid
        chartData={chartData}
        breakdown={breakdown}
        period={period}
        view={view}
      />

      <SpendGenerationLog
        logs={logs}
        logTotalCount={logTotalCount}
        logHasNext={logHasNext}
        search={search}
        model={model}
        view={view}
        onLogPageChange={onLogPageChange}
        onSearchChange={onSearchChange}
        onModelChange={onModelChange}
        onClearFilters={onClearFilters}
      />

      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit production budget</DialogTitle>
            <DialogDescription>
              This planning value is stored only in this browser and does not change provider limits.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2">
            <span className="text-xs font-semibold">Budget amount (USD)</span>
            <Input
              type="number"
              min="1"
              step="1"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              className="h-10"
            />
          </label>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setBudgetOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!Number.isFinite(Number(budgetInput)) || Number(budgetInput) <= 0}
              onClick={saveBudget}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save budget
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
