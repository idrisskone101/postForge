"use client";

import { ThemeToggle as BeuiThemeToggle } from "@/components/ui/theme-toggle";

export function ThemeToggle() {
  return (
    <BeuiThemeToggle
      variant="circle"
      start="bottom-left"
      className="theme-toggle grid size-9 place-items-center rounded-[8px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-rail-ink)]"
      iconClassName="size-4"
    />
  );
}
