"use client";

import { useRef, useState, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";

export type ReferenceRowSummary = {
  text: string;
  /** Muted placeholder text instead of a chosen value. */
  placeholder?: boolean;
  tone?: "bad";
  /** 32px round thumbnail of the first chosen item. */
  thumb?: ReactNode;
  /** Trailing mono meta such as "2 / 14". */
  meta?: string;
};

/**
 * 48px select row that opens its choosing surface in a floating popover.
 * Shared by the collection and video seed pickers.
 */
export function ReferencePickerPopover({
  summary,
  label,
  disabled = false,
  wide = false,
  children,
}: {
  summary: ReferenceRowSummary;
  label: string;
  disabled?: boolean;
  /** At least 560px, for a picker that shows a three-column grid. Otherwise as wide as the row. */
  wide?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        ref={triggerRef}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label={`${label}: ${summary.text}`}
        className={cn(
          "flex min-h-12 w-full min-w-0 items-center gap-2.5 rounded-lg bg-raised py-2 pr-3 text-left transition-colors duration-160 ease-pf hover:bg-raised-strong data-[popup-open]:bg-raised-strong",
          summary.thumb ? "pl-2" : "pl-3.5",
          disabled && "cursor-not-allowed hover:bg-raised"
        )}
      >
        {summary.thumb ? (
          <span className="relative size-8 shrink-0 overflow-hidden rounded-[999px] bg-media [&>:is(img,video)]:size-full [&>:is(img,video)]:object-cover">
            {summary.thumb}
          </span>
        ) : null}
        <span
          className={cn(
            "min-w-0 flex-1 text-[14px] leading-[18px]",
            summary.tone === "bad"
              ? "font-medium text-bad"
              : summary.placeholder || disabled
                ? "text-fg-muted"
                : "truncate font-semibold text-fg"
          )}
        >
          {summary.text}
        </span>
        {summary.meta ? (
          <span className="wb-mono shrink-0 text-fg-secondary">{summary.meta}</span>
        ) : null}
        <Icon name="chevron-down" size={16} className="shrink-0 text-fg-secondary" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          // Above or below its row, never beside it: a side placement covers the neighbouring fields.
          collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "none" }}
          className="z-50 outline-none"
        >
          <Popover.Popup
            ref={popupRef}
            initialFocus={popupRef}
            aria-label={label}
            onBlur={(event) => {
              // Focus that moves on to the page closes the picker with nothing chosen. Tab is not trapped.
              const next = event.relatedTarget;
              if (!(next instanceof Node)) return;
              if (event.currentTarget.contains(next) || next === triggerRef.current) return;
              setOpen(false);
            }}
            className={cn(
              "wb-float wb-overlay-menu flex max-h-[min(640px,var(--available-height))] max-w-[calc(100vw-32px)] origin-[var(--transform-origin)] flex-col overflow-hidden outline-none",
              wide
                ? "w-[max(var(--anchor-width),min(560px,calc(100vw-32px)))]"
                : "w-[max(var(--anchor-width),min(280px,calc(100vw-32px)))]"
            )}
          >
            <div className="wb-scroll-fade-y wb-scroll-fade-deep flex min-h-0 flex-col gap-3 overflow-y-auto p-3">
              {children(() => setOpen(false))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Square-cornered media tile button with the ember selection ring and check. */
export function ReferenceTile({
  selected,
  label,
  onToggle,
  children,
}: {
  selected: boolean;
  label: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onToggle}
      data-selected={selected ? "true" : undefined}
      data-selecting="true"
      className="wb-tile aspect-[4/5] w-full cursor-pointer"
    >
      {children}
      <span className="wb-tile-check" aria-hidden="true">
        <Icon name="check" size={12} strokeWidth={3} />
      </span>
    </button>
  );
}
