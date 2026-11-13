"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export type ToastMessage = {
  id: string;
  tone: "ok" | "bad";
  message: string;
  /** One inline action, e.g. Undo or Retry. */
  action?: { label: string; onClick: () => void };
};

type ToastProps = {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
};

/**
 * One toast. Success leaves after 5s; failures stay until dismissed.
 * Render toasts inside a `<div className="wb-toast-region">`.
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  const { id, tone } = toast;

  useEffect(() => {
    if (tone === "bad") return;
    const timer = window.setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [id, tone, onDismiss]);

  return (
    <div className="wb-toast" role={tone === "bad" ? "alert" : "status"}>
      <span className={cn("wb-status-badge", "size-5")} data-tone={tone}>
        <Icon name={tone === "bad" ? "exclamation" : "check"} size={12} strokeWidth={3} />
      </span>
      <span className="wb-toast-message">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="wb-toast-action"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(id);
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
          onClick={() => onDismiss(id)}
        >
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}

const AUTO_DISMISS_MS = 5000;
