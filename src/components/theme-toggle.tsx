"use client";

import { Icon } from "@/components/workbench/icon";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("postforge-theme", next ? "dark" : "light");
    } catch {
      // Theme still toggles for the session when storage is unavailable.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={cn("wb-icon-btn wb-icon-btn-ghost wb-icon-btn-30", className)}
    >
      <Icon name="sun" className="hidden dark:block" />
      <Icon name="moon" className="dark:hidden" />
    </button>
  );
}
