"use client";

import { useSyncExternalStore } from "react";
import { Meter } from "@/components/workbench/meter";
import {
  DEFAULT_PRODUCTION_BUDGET,
  parseStoredBudget,
  PRODUCTION_BUDGET_STORAGE_KEY,
} from "@/lib/costs/production-budget";
import { readOptionalStorage } from "@/lib/optional-storage";
import { formatCost } from "@/lib/utils/format-cost";

/** Month spend against the budget set on Spend. The server renders the default budget in the same box. */
export function HomeSpendBudget({ monthSpend }: { monthSpend: number }) {
  const stored = useSyncExternalStore(subscribeToStorage, readStoredBudget, readServerBudget);
  const budget = parseStoredBudget(stored) ?? DEFAULT_PRODUCTION_BUDGET;
  const budgetLabel = Number.isInteger(budget) ? `$${budget}` : formatCost(budget);

  return (
    <>
      <Meter
        label={`Spend this month, ${formatCost(monthSpend)} of ${budgetLabel}`}
        value={(monthSpend / budget) * 100}
      />
      <span className="wb-mono ml-0.5 shrink-0 text-fg-secondary">
        {formatCost(monthSpend)} / {budgetLabel}
      </span>
    </>
  );
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStoredBudget() {
  return readOptionalStorage(PRODUCTION_BUDGET_STORAGE_KEY);
}

function readServerBudget() {
  return null;
}
