"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
      {open ? <MenuPopover onClose={() => onOpenChange(false)}>{children}</MenuPopover> : null}
    </div>
  );
}

function MenuPopover({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="wb-float wb-fade-in absolute right-0 top-9 z-30 max-h-[min(70dvh,440px)] w-64 min-w-0 overscroll-contain overflow-y-auto p-1.5"
    >
      {children}
    </div>
  );
}

export const menuItemClass =
  "flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong";

export const menuDangerItemClass =
  "flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-bad transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-bad-tint";
