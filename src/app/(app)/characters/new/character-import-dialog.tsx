"use client";

import { Button, IconButton } from "@/components/workbench";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
      {/* The dialog sits on the raised fill, so its quiet controls step up to the stronger raised fill. */}
      <DialogContent showCloseButton={false} className="gap-4 bg-raised p-6 sm:max-w-[520px]">
        <div className="flex items-center justify-between gap-3">
          <DialogTitle className="text-base font-bold leading-5 tracking-[-0.01em] text-fg">
            Import a prompt or attributes JSON
          </DialogTitle>
          <IconButton
            icon="x"
            label="Close"
            size={30}
            className="bg-raised-strong hover:bg-strong"
            onClick={() => actions.onOpenChange(false)}
          />
        </div>
        <DialogDescription className="text-sm leading-[21px] text-fg-secondary">
          Recognized fields merge into the current character. Everything else is ignored.
        </DialogDescription>
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
        <div className="flex justify-end gap-2">
          <Button className="bg-raised-strong hover:bg-strong" onClick={() => actions.onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="strong" className="shadow-[inset_0_0_0_1px_var(--pf-outline)]" onClick={actions.onApply}>
            Import attributes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
