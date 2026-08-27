"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const toggle = () => {
    const apply = () => {
      const next = !document.documentElement.classList.contains("dark");
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem("postforge-theme", next ? "dark" : "light");
      } catch {
        /* session-only */
      }
    };

    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(apply);
      return;
    }
    apply();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="theme-toggle t-press grid size-9 place-items-center rounded-[8px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-rail-ink)]"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  );
}
