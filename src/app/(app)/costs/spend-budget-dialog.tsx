"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/workbench/button";
import type { SpendBudgetDialogProps } from "./types";

export function SpendBudgetDialog({
  budgetInput,
  onBudgetInputChange,
  onClose,
  onSave,
}: SpendBudgetDialogProps) {
  const amount = Number(budgetInput);
  const invalid = !Number.isFinite(amount) || amount <= 0;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[400px] gap-0 p-0 sm:max-w-[400px]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!invalid) onSave();
          }}
        >
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <DialogTitle className="wb-panel-title leading-5">Production budget</DialogTitle>
              <DialogDescription className="text-[13px] leading-[18px] text-fg-muted">
                Saved in this browser. Provider limits stay unchanged.
              </DialogDescription>
            </div>
            <div className="wb-field">
              <label className="wb-label" htmlFor="spend-budget-amount">
                Budget per period (USD)
              </label>
              <span className="wb-input-wrap" data-invalid={invalid ? "true" : undefined}>
                <span className="wb-mono text-[13px] text-fg-muted">$</span>
                <input
                  id="spend-budget-amount"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="1"
                  autoFocus
                  value={budgetInput}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? "spend-budget-error" : undefined}
                  onChange={(event) => onBudgetInputChange(event.target.value)}
                  className="font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </span>
              {invalid ? (
                <p id="spend-budget-error" className="wb-field-error wb-fade-in">
                  Enter an amount above $0.
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="m-0 rounded-b-xl px-5 py-4">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={invalid}>
              Save budget
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
