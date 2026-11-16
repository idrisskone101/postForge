"use client";

import { useState, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, Field } from "@/components/workbench";
import type { ConfirmRequest } from "./types";

export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          <AlertDialogDescription>{request?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary">Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              request?.onConfirm();
              onClose();
            }}
          >
            {request?.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function NewCollectionDialog({
  open,
  withSelection,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  withSelection: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <NewCollectionForm
          withSelection={withSelection}
          onCancel={() => onOpenChange(false)}
          onCreate={(name) => {
            onCreate(name);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Mounted with the dialog, so a name typed and then cancelled is gone the next time it opens. */
function NewCollectionForm({
  withSelection,
  onCancel,
  onCreate,
}: {
  withSelection: boolean;
  onCancel: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="text-[16px] font-bold leading-5 tracking-[-0.01em] text-fg">New collection</DialogTitle>
      </DialogHeader>
      <Field label="Name" htmlFor="new-collection-name">
        <input
          id="new-collection-name"
          className="wb-input"
          value={name}
          maxLength={160}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      {withSelection ? <p className="wb-meta">Starts with the selected image.</p> : null}
      <DialogFooter>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Create collection
        </Button>
      </DialogFooter>
    </form>
  );
}
