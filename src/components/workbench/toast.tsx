"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export type ToastMessage = {
  id: string;
  tone: "ok" | "warn" | "bad";
  message: string;
  /** One inline action, e.g. Undo or Retry. */
  action?: { label: string; onClick: () => void };
};

type ToastProps = {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
};

/**
 * One toast. Success and warnings leave after 5s; failures stay until dismissed.
 * Render toasts inside a `<div className="wb-toast-region">`.
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  const { id, tone } = toast;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (tone === "bad" && !leaving) return;
    const timer = window.setTimeout(
      () => (leaving ? onDismiss(id) : setLeaving(true)),
      leaving ? EXIT_MS : AUTO_DISMISS_MS
    );
    return () => window.clearTimeout(timer);
  }, [id, tone, leaving, onDismiss]);

  return (
    <div
      className="wb-toast"
      role={tone === "bad" ? "alert" : "status"}
      data-leaving={leaving ? "true" : undefined}
    >
      <span className={cn("wb-status-badge", "size-5")} data-tone={tone}>
        <Icon name={TONE_ICON[tone]} size={12} strokeWidth={3} />
      </span>
      <span className="wb-toast-message">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="wb-toast-action"
          onClick={() => {
            toast.action?.onClick();
            setLeaving(true);
          }}
        >
          {toast.action.label}
        </button>
      )}
      {tone === "bad" && (
        <button
          type="button"
          aria-label="Dismiss"
          className="wb-icon-btn wb-icon-btn-ghost wb-icon-btn-30"
          onClick={() => setLeaving(true)}
        >
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}

const TONE_ICON = { ok: "check", warn: "exclamation", bad: "exclamation" } as const;
const AUTO_DISMISS_MS = 5000;
const EXIT_MS = 160;
