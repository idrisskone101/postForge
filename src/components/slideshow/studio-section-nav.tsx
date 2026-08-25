"use client";

import { Archive, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

import { useSlideshowHome } from "./slideshow-home-provider";
import type { SlideshowSection } from "./types";

export function StudioSectionNav() {
  const { section, onSectionChange: onChange, draftsCount } = useSlideshowHome();
  return (
    <nav
      data-slideshow-section-nav="true"
      aria-label="Slideshow studio"
      className="sticky top-0 z-20 -mx-1 h-16 overflow-hidden bg-[var(--pf-canvas)]/95 px-1 py-3 backdrop-blur"
    >
      <div
        className="flex h-10 w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg bg-[var(--pf-active)] p-1"
        data-slideshow-section-tabs="true"
        role="tablist"
      >
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            onClick={() => onChange(id)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/30",
              section === id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
            {id === "drafts" && draftsCount !== undefined ? (
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  section === id ? "text-[var(--pf-orange)]" : "text-muted-foreground",
                )}
              >
                {draftsCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}


const sections: Array<{
  id: SlideshowSection;
  label: string;
  icon: typeof Sparkles;
}> = [
  { id: "create", label: "Create", icon: Sparkles },
  { id: "drafts", label: "Drafts", icon: Archive },
];