"use client";

import { Check, ChevronDown, ChevronRight } from "lucide-react";
import {
  CHARACTER_ATTRIBUTE_SECTIONS,
  type CharacterAttributes,
} from "@/lib/character-attributes";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { cn } from "@/lib/utils";
import { CharactersPaintText } from "../characters-paint-text";

export function CharacterCategoryRail({
  attributes,
  activeSection,
  onSelectSection,
}: {
  attributes: CharacterAttributes;
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
}) {
  const paintReady = useWindowLoadReady();
  const recipeGroups = CHARACTER_ATTRIBUTE_SECTIONS.flatMap((section) => section.groups);
  const completedRecipeGroups = recipeGroups.filter((group) =>
    Boolean(attributes[group.key]?.trim())
  ).length;
  const recipeProgress = Math.round(
    (completedRecipeGroups / Math.max(1, recipeGroups.length)) * 100
  );
  const railCopy = `${completedRecipeGroups} of ${recipeGroups.length} complete`;

  return (
    <aside
      data-character-category-rail="true"
      data-character-recipe-step-rail="true"
      className="border-b border-[var(--pf-border)] bg-[var(--pf-active)] min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0 min-[1280px]:border-b-0 min-[1280px]:border-r"
    >
      <div className="h-[4.75rem] overflow-hidden border-b border-[var(--pf-border)] px-3 py-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <CharactersPaintText
              ready={paintReady}
              liveAs="span"
              liveClassName="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--pf-muted)]"
              paint={
                <p data-character-rail-kicker="Attribute recipe">
                  <span className="sr-only">Attribute recipe</span>
                </p>
              }
            >
              Attribute recipe
            </CharactersPaintText>
            <CharactersPaintText
              ready={paintReady}
              liveAs="span"
              liveClassName="text-[12px] text-[var(--pf-muted)]"
              paint={
                <p data-character-rail-copy={railCopy}>
                  <span className="sr-only">{railCopy}</span>
                </p>
              }
            >
              {railCopy}
            </CharactersPaintText>
          </div>
          <CharactersPaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="text-[12px] font-semibold tabular-nums text-[var(--pf-ink)]"
            paint={
              <span data-character-rail-pct={`${recipeProgress}%`}>
                <span className="sr-only">{recipeProgress}%</span>
              </span>
            }
          >
            {recipeProgress}%
          </CharactersPaintText>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--pf-border-strong)]">
          <span
            className="block h-full rounded-full bg-[var(--pf-ink)]"
            style={{ width: `${recipeProgress}%` }}
          />
        </div>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto p-2 min-[1280px]:block min-[1280px]:h-[calc(100%_-_116px)] min-[1280px]:overflow-y-auto min-[1280px]:px-2 min-[1280px]:py-2"
        aria-label="Character attribute recipe"
      >
        <button
          type="button"
          onClick={() => onSelectSection("overview")}
          aria-current={activeSection === "overview" ? "page" : undefined}
          className={cn(
            "flex h-10 min-w-max items-center gap-2 rounded-[8px] px-2.5 text-[12px] min-[1280px]:w-full",
            activeSection === "overview"
              ? "bg-[var(--pf-surface)] font-semibold shadow-[var(--pf-shadow-2xs)] text-[var(--pf-ink)]"
              : "text-[var(--pf-muted)] hover:bg-[var(--pf-active)]"
          )}
          style={{ height: 40 }}
        >
          <span
            data-lcp={paintReady ? undefined : "00"}
            className="grid size-5 place-items-center rounded-md bg-[var(--pf-active)] text-[12px] font-bold"
          >
            {paintReady ? "00" : <span className="sr-only">00</span>}
          </span>
          <CharactersPaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="min-w-0 flex-1 text-left text-[12px] font-medium text-[var(--pf-ink)]"
            paint={
              <span data-lcp="Overview" className="min-w-0 flex-1 text-left">
                <span className="sr-only">Overview</span>
              </span>
            }
          >
            Overview
          </CharactersPaintText>
          <Check className="size-3 text-[var(--pf-success)]" />
        </button>
        {CHARACTER_ATTRIBUTE_SECTIONS.map((section, sectionIndex) => {
          const summary = section.groups
            .slice(0, 2)
            .map((group) => attributes[group.key])
            .join(" · ");
          const sectionComplete = section.groups.every((group) =>
            Boolean(attributes[group.key]?.trim())
          );
          const index = String(sectionIndex + 1).padStart(2, "0");
          const active = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-w-[150px] items-center gap-2 rounded-[8px] px-2.5 py-2 text-left min-[1280px]:w-full min-[1280px]:min-w-0",
                active
                  ? "bg-[var(--pf-surface)] shadow-[var(--pf-shadow-2xs)]"
                  : "hover:bg-[var(--pf-active)]"
              )}
              style={{ height: 40 }}
            >
              <span
                data-lcp={paintReady ? undefined : index}
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md text-[12px] font-bold",
                  active
                    ? "bg-[var(--pf-ink)] text-[var(--pf-canvas)]"
                    : "bg-[var(--pf-active)] text-[var(--pf-muted)]"
                )}
              >
                {paintReady ? index : <span className="sr-only">{index}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <CharactersPaintText
                  ready={paintReady}
                  liveAs="span"
                  liveClassName="block truncate text-[12px] font-medium text-[var(--pf-ink)]"
                  paint={
                    <b data-lcp={section.label} className="block truncate text-[12px] font-medium">
                      <span className="sr-only">{section.label}</span>
                    </b>
                  }
                >
                  {section.label}
                </CharactersPaintText>
                <small className="sr-only">{summary}</small>
              </span>
              <RecipeSectionGlyph complete={sectionComplete} active={active} />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function RecipeSectionGlyph({
  complete,
  active,
}: {
  complete: boolean;
  active: boolean;
}) {
  if (complete) return <Check className="size-3 text-[var(--pf-success)]" />;
  if (active) return <ChevronDown className="size-3 text-[var(--pf-muted)]" />;
  return <ChevronRight className="size-3 text-[var(--pf-muted)]" />;
}
