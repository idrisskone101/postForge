"use client";

import { Button } from "@/components/workbench";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CharacterImportDialog({
  open,
  value,
  error,
  actions,
}: {
  open: boolean;
  value: string;
  error: string | null;
  actions: {
    onOpenChange: (open: boolean) => void;
    onValueChange: (value: string) => void;
    onApply: () => void;
  };
}) {
  return (
    <Dialog open={open} onOpenChange={actions.onOpenChange}>
      <DialogContent className="gap-4 bg-raised p-6 sm:max-w-[520px]">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-bold leading-5 tracking-[-0.01em] text-fg">
            Import a prompt or attributes JSON
          </DialogTitle>
          <DialogDescription className="text-sm leading-[21px] text-fg-secondary">
            Recognized fields merge into the current character. Everything else is ignored.
          </DialogDescription>
        </DialogHeader>
        <textarea
          aria-label="Prompt or attributes JSON"
          value={value}
          onChange={(event) => actions.onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          className="wb-input min-h-[200px] resize-none bg-panel font-mono text-xs leading-5"
          placeholder={'{"gender":"Female","age":"25-30","freckles":"Light Subtle"}'}
        />
        {error ? (
          <p role="alert" className="wb-fade-in text-[13px] leading-[19px] text-bad [overflow-wrap:anywhere]">
            {error}
          </p>
        ) : null}
        <DialogFooter className="flex-row justify-end gap-2">
          <Button onClick={() => actions.onOpenChange(false)}>Cancel</Button>
          <Button variant="strong" onClick={actions.onApply}>
            Import attributes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
