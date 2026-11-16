"use client";

import { Icon } from "@/components/workbench/icon";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    const apply = () => {
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem("postforge-theme", next ? "dark" : "light");
      } catch {
        // Theme still toggles for the session when storage is unavailable.
      }
    };
    // The whole page cross-fades between themes. Without view transitions, or with reduced motion,
    // the colours switch at once as before.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof document.startViewTransition !== "function") return apply();
    document.startViewTransition(apply);
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
