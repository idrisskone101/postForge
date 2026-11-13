"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { iconButtonClass } from "@/components/workbench";

export function RowActionsMenu({
  label,
  open,
  onOpenChange,
  children,
  className,
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  return (
    <div className={className ?? "relative shrink-0"}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={iconButtonClass("ghost", 30)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="size-[18px]" strokeWidth={1.5} />
      </button>
      {mounted ? (
        <MenuPopover leaving={!open} onClose={() => onOpenChange(false)} onMountedChange={setMounted}>
          {children}
        </MenuPopover>
      ) : null}
    </div>
  );
}

function MenuPopover({
  leaving,
  onClose,
  onMountedChange,
  children,
}: {
  leaving: boolean;
  onClose: () => void;
  onMountedChange: (mounted: boolean) => void;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = menu?.parentElement?.querySelector('[aria-haspopup="menu"]');
    if (!menu || !trigger) return;
    const anchor = trigger.getBoundingClientRect();
    const needed = menu.offsetHeight + MENU_GAP;
    const fitsBelow = anchor.bottom + needed <= window.innerHeight;
    const roomAbove = anchor.top - MENU_CLEARANCE_TOP;
    if (!fitsBelow && roomAbove > window.innerHeight - anchor.bottom) {
      menu.dataset.side = "top";
      menu.style.maxHeight = `${Math.min(440, roomAbove - MENU_GAP)}px`;
    }
  }, []);

  useEffect(() => {
    if (leaving) {
      const exit = window.setTimeout(onMountedChange, EXIT_MS, false);
      return () => window.clearTimeout(exit);
    }
    const listeners = new AbortController();
    const anchor = menuRef.current?.parentElement;
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape") return;
        onClose();
        anchor?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
      },
      { signal: listeners.signal }
    );
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!anchor?.contains(event.target as Node)) onClose();
      },
      { signal: listeners.signal }
    );
    return () => listeners.abort();
  }, [leaving, onClose, onMountedChange]);

  return (
    <div
      ref={menuRef}
      role="menu"
      inert={leaving}
      data-ending-style={leaving ? "" : undefined}
      className={MENU_CLASS}
    >
      {children}
    </div>
  );
}

/** Matches `--pf-dur-exit`: the popover stays mounted while it fades out. */
const EXIT_MS = 160;
const MENU_GAP = 6;
/** Keeps a flipped menu clear of the mobile bar and the page edge. */
const MENU_CLEARANCE_TOP = 64;

const MENU_CLASS = [
  "wb-float wb-overlay-menu absolute right-0 top-9 z-30 max-h-[min(70dvh,440px)] w-64 min-w-0 overscroll-contain overflow-y-auto p-1.5",
  "starting:-translate-y-1 starting:opacity-0",
  "data-[side=top]:top-auto data-[side=top]:bottom-9 data-[side=top]:starting:translate-y-1",
].join(" ");

export const menuItemClass =
  "flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong";

export const menuDangerItemClass =
  "flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-bad transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-bad-tint";
