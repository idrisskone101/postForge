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
        className={`${iconButtonClass("ghost", 30)} [--wb-hit-w:38px]`}
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
    const roomBelow = window.innerHeight - anchor.bottom - MENU_GAP - MENU_CLEARANCE_BOTTOM;
    const roomAbove = anchor.top - MENU_CLEARANCE_TOP - MENU_GAP;
    const flips = menu.offsetHeight > roomBelow && roomAbove > roomBelow;
    if (flips) menu.dataset.side = "top";
    menu.style.maxHeight = `${Math.max(MENU_MIN_HEIGHT, Math.min(MENU_MAX_HEIGHT, flips ? roomAbove : roomBelow))}px`;
    menuItems(menu)[0]?.focus({ preventScroll: true });
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
        const menu = menuRef.current;
        if (!menu) return;
        const target = rovingTarget(menu, event.key);
        if (target) {
          event.preventDefault();
          target.focus();
          return;
        }
        if (event.key !== "Escape" && event.key !== "Tab") return;
        // Tab leaves from the trigger, so the closing menu is taken out of the tab order first.
        menu.inert = true;
        anchor?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
        onClose();
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
      <div role="none" className="wb-scroll-fade-y wb-scroll-fade-deep min-h-0 overflow-y-auto overscroll-contain p-1.5">
        {children}
      </div>
    </div>
  );
}

function menuItems(menu: HTMLElement) {
  return [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')];
}

/** The item an arrow, Home or End key moves focus to, wrapping at either end. */
function rovingTarget(menu: HTMLElement, key: string) {
  const items = menuItems(menu);
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (key === "ArrowDown") return items[(current + 1) % items.length];
  if (key === "ArrowUp") return items[(current - 1 + items.length) % items.length];
  if (key === "Home") return items[0];
  if (key === "End") return items[items.length - 1];
  return undefined;
}

/** Matches `--pf-dur-exit`: the popover stays mounted while it fades out. */
const EXIT_MS = 160;
const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 440;
/** Two items and the fade: below this the menu overflows the window, it does not collapse. */
const MENU_MIN_HEIGHT = 96;
/** Keeps a flipped menu clear of the mobile bar and the page edge. */
const MENU_CLEARANCE_TOP = 64;
const MENU_CLEARANCE_BOTTOM = 8;

const MENU_CLASS = [
  "wb-float wb-overlay-menu absolute right-0 top-9 z-30 flex max-h-[min(70dvh,440px)] w-64 min-w-0 flex-col overflow-hidden",
  "starting:-translate-y-1 starting:opacity-0",
  "data-[side=top]:top-auto data-[side=top]:bottom-9 data-[side=top]:starting:translate-y-1",
].join(" ");

export const menuItemClass =
  "flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong";

export const menuDangerItemClass =
  "flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-bad transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-bad-tint";
