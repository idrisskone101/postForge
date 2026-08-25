"use client";

import { Check, ChevronDown, ChevronRight } from "lucide-react";
import {
  CHARACTER_ATTRIBUTE_SECTIONS,
  type CharacterAttributes,
} from "@/lib/character-attributes";
import { cn } from "@/lib/utils";

export function CharacterCategoryRail({
  attributes,
  activeSection,
  onSelectSection,
}: {
  attributes: CharacterAttributes;
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
}) {
  const recipeGroups = CHARACTER_ATTRIBUTE_SECTIONS.flatMap(
    (section) => section.groups
  );
  const completedRecipeGroups = recipeGroups.filter(
    (group) => Boolean(attributes[group.key]?.trim())
  ).length;
  const recipeProgress = Math.round(
    (completedRecipeGroups / Math.max(1, recipeGroups.length)) * 100
  );

  return (
    <aside
      data-character-category-rail="true"
      data-character-recipe-step-rail="true"
      className="border-b border-border bg-[var(--pf-active)] min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0 min-[1280px]:border-b-0 min-[1280px]:border-r"
    >
      <div className="h-[4.75rem] overflow-hidden border-b border-border px-3 py-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p data-character-rail-kicker="Attribute recipe">
              <span className="sr-only">Attribute recipe</span>
            </p>
            <p data-character-rail-copy={`${completedRecipeGroups} of ${recipeGroups.length} complete`}>
              <span className="sr-only">
                {completedRecipeGroups} of {recipeGroups.length} complete
              </span>
            </p>
          </div>
          <span data-character-rail-pct={`${recipeProgress}%`}>
            <span className="sr-only">{recipeProgress}%</span>
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--pf-border-strong)]"><span className="block h-full rounded-full bg-[var(--pf-orange)]" style={{ width: `${recipeProgress}%` }} /></div>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-2 min-[1280px]:block min-[1280px]:h-[calc(100%_-_116px)] min-[1280px]:overflow-y-auto min-[1280px]:px-2 min-[1280px]:py-2" aria-label="Character attribute recipe">
        <button
          onClick={() => onSelectSection("overview")}
          aria-current={activeSection === "overview" ? "page" : undefined}
          className={cn(
            "flex h-10 min-w-max items-center gap-2 rounded-lg px-2.5 text-[12px] min-[1280px]:w-full",
            activeSection === "overview" ? "bg-white font-semibold shadow-[var(--pf-shadow-2xs)]" : "text-muted-foreground hover:bg-[var(--pf-active)]"
          )}
        >
          <span className="grid size-5 place-items-center rounded-md bg-[var(--pf-active)] text-[12px] font-bold">00</span>
          <span className="min-w-0 flex-1 text-left">Overview</span>
          <Check className="size-3 text-[var(--pf-success)]" />
        </button>
        {CHARACTER_ATTRIBUTE_SECTIONS.map((section, sectionIndex) => {
          const summary = section.groups.slice(0, 2).map((group) => attributes[group.key]).join(" · ");
          const sectionComplete = section.groups.every((group) => Boolean(attributes[group.key]?.trim()));
          return <button key={section.id} onClick={() => onSelectSection(section.id)} aria-current={activeSection === section.id ? "page" : undefined} className={cn("group flex min-w-[150px] items-center gap-2 rounded-lg px-2.5 py-2 text-left min-[1280px]:w-full min-[1280px]:min-w-0",activeSection === section.id ? "bg-white shadow-[var(--pf-shadow-2xs)]" : "hover:bg-[var(--pf-active)]")}><span className={cn("grid size-5 shrink-0 place-items-center rounded-md text-[12px] font-bold",activeSection === section.id ? "bg-foreground text-background" : "bg-[var(--pf-active)] text-muted-foreground")}>{String(sectionIndex + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><b className="block truncate text-[12px] font-medium">{section.label}</b><small className="mt-0.5 block truncate text-[12px] text-muted-foreground">{summary}</small></span>{sectionComplete ? <Check className="size-3 text-[var(--pf-success)]" /> : activeSection === section.id ? <ChevronDown className="size-3 text-[var(--pf-orange)]" /> : <ChevronRight className="size-3 text-muted-foreground" />}</button>;
        })}
      </nav>
    </aside>
  );
}
