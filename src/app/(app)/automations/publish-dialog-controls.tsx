"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/workbench";
import { lockPageScroll } from "@/lib/page-scroll-lock";
import { cn } from "@/lib/utils";

export function FieldLabel({
  label,
  detail,
  mono = false,
  children,
}: {
  label: string;
  detail: string;
  mono?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="wb-field">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <label htmlFor={id} className="wb-label min-w-0 break-words [overflow-wrap:anywhere]">
          {label}
        </label>
        <span
          className={cn(
            "min-w-0 text-right text-[12px] leading-4 text-fg-muted",
            mono && "wb-mono shrink-0"
          )}
        >
          {detail}
        </span>
      </div>
      {children(id)}
    </div>
  );
}

export function CheckControl({
  label,
  checked,
  disabled = false,
  onChange,
  children,
  className,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label
        className={cn(
          "flex min-w-0 cursor-pointer items-start gap-2.5 text-[14px] leading-5 text-fg",
          disabled && "cursor-not-allowed text-fg-disabled"
        )}
      >
        <span className="relative mt-0.5 grid size-4 shrink-0 place-items-center">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className="peer size-4 cursor-[inherit] appearance-none rounded-[6px] bg-raised shadow-[inset_0_0_0_1.5px_var(--pf-outline)] transition-[background-color,box-shadow] duration-[var(--pf-dur-feedback)] ease-pf checked:bg-ember checked:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-50"
          />
          <Icon
            name="check"
            size={12}
            strokeWidth={3}
            className="pointer-events-none absolute text-[var(--pf-on-ember)] opacity-0 transition-opacity duration-[var(--pf-dur-feedback)] ease-pf peer-checked:opacity-100"
          />
        </span>
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">
          {label}
          {disabled ? " (disabled by creator settings)" : ""}
        </span>
      </label>
      {children ? <div className="min-w-0 pl-[26px]">{children}</div> : null}
    </div>
  );
}

export const publishLinkClass =
  "inline-flex min-w-0 items-center gap-1 break-words text-[13px] font-semibold leading-[18px] text-fg underline decoration-1 underline-offset-4 [overflow-wrap:anywhere]";

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), video[controls]';

/** A hub dialog is open, waiting on its request, or closed and drawing its exit. */
export type DialogPhase = "open" | "busy" | "leaving";

/**
 * Keys, focus and motion for a hub dialog. The handler runs in the capture phase, before a video or a
 * field can keep the key for its own text, so Escape, the Tab trap and keyboard scrolling stay in the
 * dialog. The page behind does not scroll. Escape closes unless busy.
 *
 * The dialog moves like every overlay: `motion` carries the attributes the `.wb-overlay-*` classes
 * read, set for the first frame and again in the `leaving` phase, when the dialog stays mounted for
 * its exit. A leaving dialog is inert, and focus goes back to the row's Actions button as the exit starts.
 */
export function useDialogKeys(input: { recordId: string; phase: DialogPhase; onClose: () => void }) {
  const { recordId, phase, onClose } = input;
  const busy = phase === "busy";
  const leaving = phase === "leaving";
  const ref = useRef<HTMLDivElement>(null);
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    if (leaving) return;
    const dialog = ref.current;
    const unlock = lockPageScroll();
    if (dialog && !dialog.contains(document.activeElement)) {
      (dialog.querySelector<HTMLElement>("button:not(:disabled)") ?? dialog).focus();
    }
    const frame = window.requestAnimationFrame(() => setEntering(false));
    // Runs as the exit starts, and on an unmount that had no exit.
    return () => {
      window.cancelAnimationFrame(frame);
      unlock();
      const active = document.activeElement;
      if (!active || active === document.body || dialog?.contains(active)) focusRowActions(recordId);
    };
  }, [recordId, leaving]);
  useEffect(() => {
    if (!busy && document.activeElement === document.body) ref.current?.focus();
  }, [busy]);
  const motion = {
    "data-starting-style": entering ? "" : undefined,
    "data-ending-style": leaving ? "" : undefined,
  };
  return {
    motion,
    overlay: {
      ref,
      tabIndex: -1,
      inert: leaving,
      ...motion,
      onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape" && !busy) {
          event.stopPropagation();
          onClose();
          return;
        }
        keepTabInDialog(event);
      },
    },
  };
}

function focusRowActions(recordId: string) {
  document
    .querySelector<HTMLElement>(
      `[data-automation-row=${JSON.stringify(recordId)}] [aria-label^="Actions for"]`
    )
    ?.focus({ preventScroll: true });
}

function keepTabInDialog(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !items.includes(active)) {
    event.preventDefault();
    const inside = active instanceof HTMLElement && active !== event.currentTarget && event.currentTarget.contains(active);
    const after = (item: HTMLElement) => active!.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING;
    const top = inside ? active.getBoundingClientRect().top : 0;
    const inView = (item: HTMLElement) => !active!.contains(item) || item.getBoundingClientRect().bottom > top;
    const next = inside ? items.find((item) => after(item) && inView(item)) : undefined;
    const previous = inside ? items.findLast((item) => !after(item) && !active!.contains(item)) : undefined;
    ((event.shiftKey ? previous : next) ?? (event.shiftKey ? last : first)).focus();
    return;
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
