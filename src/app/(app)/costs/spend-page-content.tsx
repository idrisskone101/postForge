"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Toast, type ToastMessage } from "@/components/workbench/toast";
import { readOptionalStorage, writeOptionalStorage } from "@/lib/optional-storage";
import { formatCost } from "@/lib/utils/format-cost";
import { SpendAnalysisGrid } from "./spend-analysis-grid";
import { SpendGenerationLog } from "./spend-generation-log";
import { SpendRangeEmpty } from "./spend-log-empty";
import { buildSpendDashboardView } from "./spend-models";
import { SpendStatCards } from "./spend-stat-cards";
import type { SpendPageContentProps } from "./types";

export function SpendPageContent({
  dashboard,
  handlers,
}: SpendPageContentProps) {
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [budgetInput, setBudgetInput] = useState(String(DEFAULT_BUDGET));
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
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

  const dismissToast = useCallback(() => setToast(null), []);

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
      setToast({
        id: `export-${Date.now()}`,
        tone: "ok",
        message: `Exported ${count} cost log ${count === 1 ? "entry" : "entries"}`,
      });
    } catch {
      setToast({ id: `export-${Date.now()}`, tone: "bad", message: "Export failed. Try again." });
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
    setToast({
      id: `budget-${Date.now()}`,
      tone: "ok",
      message: `Production budget updated to ${formatCost(nextBudget)}`,
    });
  };

  const closeBudget = () => {
    setBudgetInput(String(budget));
    setBudgetOpen(false);
  };

  return (
    <>
      <SpendStatCards dashboard={dashboard} view={view} onEditBudget={() => setBudgetOpen(true)} />

      {view.emptyPeriod ? (
        <SpendRangeEmpty period={dashboard.period} onWiden={() => handlers.onPeriodChange("90d")} />
      ) : (
        <>
          <SpendAnalysisGrid dashboard={dashboard} view={view} />
          <SpendGenerationLog
            dashboard={dashboard}
            view={view}
            handlers={handlers}
            exporter={{ busy: exporting, run: () => void exportCsv() }}
          />
        </>
      )}

      {budgetOpen ? (
        <SpendBudgetDialog
          budgetInput={budgetInput}
          onBudgetInputChange={setBudgetInput}
          onClose={closeBudget}
          onSave={saveBudget}
        />
      ) : null}

      {toast ? (
        <div className="wb-toast-region">
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        </div>
      ) : null}
    </>
  );
}

const SpendBudgetDialog = dynamic(
  () =>
    import("./spend-budget-dialog").then((mod) => ({
      default: mod.SpendBudgetDialog,
    })),
  { ssr: false }
);

const DEFAULT_BUDGET = 250;
const BUDGET_STORAGE_KEY = "postforge-production-budget";
