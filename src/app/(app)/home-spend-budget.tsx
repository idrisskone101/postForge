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

/**
 * Month spend against the budget set on Spend. The server renders the default budget in the same
 * box. On a phone the cell is too narrow for the meter and shows the past month's figure alone.
 */
export function HomeSpendBudget({ monthSpend }: { monthSpend: number }) {
  const stored = useSyncExternalStore(subscribeToStorage, readStoredBudget, readServerBudget);
  const budget = parseStoredBudget(stored) ?? DEFAULT_PRODUCTION_BUDGET;
  const budgetLabel = Number.isInteger(budget) ? `$${budget}` : formatCost(budget);

  return (
    <>
      <span className="contents max-md:hidden">
        <Meter
          label={`Spend this month, ${formatCost(monthSpend)} of ${budgetLabel}`}
          value={(monthSpend / budget) * 100}
        />
        <span className="wb-mono ml-0.5 shrink-0 text-fg-secondary">
          {formatCost(monthSpend)} / {budgetLabel}
        </span>
      </span>
      <span className="flex gap-1.5 md:hidden">
        <span className="wb-mono text-fg-secondary">{formatCost(monthSpend)}</span>
        past month
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
