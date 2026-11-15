"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type ConfirmRequest = {
  title: string;
  body: string;
  confirmLabel: string;
  /** When set, the dialog asks the person to type this phrase and resolves with what they typed. */
  phrase?: string;
};

/** Resolves true (confirmed), the typed text (phrase requests) or null (cancelled). */
export type ConfirmAction = (request: ConfirmRequest) => Promise<true | string | null>;

type Pending = {
  id: number;
  request: ConfirmRequest;
  resolve: (answer: true | string | null) => void;
};

export function useConfirmDialog() {
  const [shown, setShown] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const pendingRef = useRef<Pending | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const confirm = useCallback<ConfirmAction>(
    (request) =>
      new Promise((resolve) => {
        // A follow-up confirm opens with focus on the page or still inside the leaving dialog, so
        // the control that started the flow stays the place focus returns to.
        const focused = document.activeElement;
        const startsFlow =
          focused instanceof HTMLElement &&
          focused !== document.body &&
          !focused.closest('[role="alertdialog"]');
        if (startsFlow) openerRef.current = focused;
        const next = { id: (pendingRef.current?.id ?? 0) + 1, request, resolve };
        pendingRef.current = next;
        setTyped("");
        setShown(next);
        setOpen(true);
      }),
    []
  );

  const settle = useCallback((answer: true | string | null) => {
    pendingRef.current?.resolve(answer);
    setOpen(false);
  }, []);

  const request = shown?.request;
  const dialog = (
    <AlertDialog open={open} onOpenChange={(next) => !next && settle(null)}>
      <AlertDialogContent finalFocus={openerRef}>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          <AlertDialogDescription>{request?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        {request?.phrase && (
          <input
            className="wb-input"
            data-mono="true"
            aria-label={`Type ${request.phrase} to confirm`}
            placeholder={request.phrase}
            autoComplete="off"
            spellCheck={false}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        )}
        <AlertDialogFooter>
          <Button key={shown?.id} autoFocus variant="secondary" onClick={() => settle(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => settle(request?.phrase ? typed : true)}>
            {request?.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
