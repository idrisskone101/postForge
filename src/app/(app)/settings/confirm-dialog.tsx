"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/workbench";

export type ConfirmRequest = {
  title: string;
  body: string;
  confirmLabel: string;
  /** When set, the dialog asks the person to type this phrase and resolves with what they typed. */
  phrase?: string;
};

/** Resolves true (confirmed), the typed text (phrase requests) or null (cancelled). */
export type ConfirmAction = (request: ConfirmRequest) => Promise<true | string | null>;

type Pending = { request: ConfirmRequest; resolve: (answer: true | string | null) => void };

export function useConfirmDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [typed, setTyped] = useState("");
  const pendingRef = useRef<Pending | null>(null);

  const confirm = useCallback<ConfirmAction>(
    (request) =>
      new Promise((resolve) => {
        const next = { request, resolve };
        pendingRef.current = next;
        setTyped("");
        setPending(next);
      }),
    []
  );

  const settle = useCallback((answer: true | string | null) => {
    pendingRef.current?.resolve(answer);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const request = pending?.request;
  const dialog = (
    <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && settle(null)}>
      <AlertDialogContent className="flex max-w-[420px] flex-col gap-4 sm:max-w-[420px]">
        <AlertDialogTitle className="wb-panel-title text-left">{request?.title}</AlertDialogTitle>
        <AlertDialogDescription className="text-left text-[13px] leading-5 text-fg-secondary">
          {request?.body}
        </AlertDialogDescription>
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
        <div className="flex flex-col-reverse gap-2 border-t border-hairline pt-4 min-[420px]:flex-row min-[420px]:justify-end">
          <Button autoFocus onClick={() => settle(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => settle(request?.phrase ? typed : true)}>
            {request?.confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
