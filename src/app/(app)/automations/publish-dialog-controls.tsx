"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/workbench";
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

/**
 * Props for a hand-rolled modal root. The root and its scroller take focus when a click lands on scrim or
 * text, so Escape, the Tab trap and keyboard scrolling stay in the dialog. The page behind does not scroll.
 * Escape closes unless busy. Focus goes back to the row's Actions button on close.
 */
export function useDialogKeys(input: { recordId: string; busy: boolean; onClose: () => void }) {
  const { recordId, busy, onClose } = input;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const page = document.documentElement;
    const { overflow, paddingRight } = page.style;
    const scrollbar = window.innerWidth - page.clientWidth;
    page.style.overflow = "hidden";
    if (scrollbar > 0) {
      page.style.paddingRight = `${scrollbar}px`;
      page.style.setProperty("--pf-scroll-lock-pad", `${scrollbar}px`);
    }
    return () => {
      page.style.overflow = overflow;
      page.style.paddingRight = paddingRight;
      page.style.removeProperty("--pf-scroll-lock-pad");
      document
        .querySelector<HTMLElement>(
          `[data-automation-row=${JSON.stringify(recordId)}] [aria-label^="Actions for"]`
        )
        ?.focus({ preventScroll: true });
    };
  }, [recordId]);
  useEffect(() => {
    if (!busy && document.activeElement === document.body) ref.current?.focus();
  }, [busy]);
  return {
    ref,
    tabIndex: -1,
    onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape" && !busy) {
        event.stopPropagation();
        onClose();
        return;
      }
      keepTabInDialog(event);
    },
  };
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
