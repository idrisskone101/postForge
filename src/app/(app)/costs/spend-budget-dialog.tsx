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
          <span className="text-xs font-semibold">Budget amount (USD)</span>
          <Input
            type="number"
            min="1"
            step="1"
            value={budgetInput}
            onChange={(event) => onBudgetInputChange(event.target.value)}
            className="h-10"
          />
        </label>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!Number.isFinite(Number(budgetInput)) || Number(budgetInput) <= 0}
            onClick={onSave}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save budget
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SpendBudgetDialogProps = {
  budgetInput: string;
  onBudgetInputChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};
