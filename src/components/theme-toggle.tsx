"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
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
      className="grid size-9 place-items-center rounded-[8px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-rail-ink)]"
    >
      {/* Which icon shows is decided in globals.css. `hidden dark:block` does
          not work here: the first-paint `.hidden` rule is unlayered and beats
          Tailwind's layered `dark:block`, which left the button empty in dark. */}
      <Moon className="theme-toggle-moon size-4" />
      <Sun className="theme-toggle-sun size-4" />
    </button>
  );
}
