"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SpendBudgetDialogProps } from "./types";

export function SpendBudgetDialog({
  budgetInput,
  onBudgetInputChange,
  onClose,
  onSave,
}: SpendBudgetDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit production budget</DialogTitle>
          <DialogDescription>
            This planning value is stored only in this browser and does not change provider limits.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2">
          <span className="text-[12px] font-semibold text-[var(--pf-ink)]">Budget amount (USD)</span>
          <Input
            type="number"
            min="1"
            step="1"
            value={budgetInput}
            onChange={(event) => onBudgetInputChange(event.target.value)}
            className="h-10 border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-ink)]"
          />
        </label>
        <DialogFooter>
          <button type="button" onClick={onClose} className="pf-button-secondary">
            Cancel
          </button>
          <button
            type="button"
            disabled={!Number.isFinite(Number(budgetInput)) || Number(budgetInput) <= 0}
            onClick={onSave}
            className="pf-button-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save budget
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
