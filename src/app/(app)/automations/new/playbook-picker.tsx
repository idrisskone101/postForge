"use client";

import { useEffect } from "react";
import { Grid2X2, Heart, List, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { AutomationsPaintText, PAINT_HIDDEN_SHELL } from "../automations-paint-text";
import { PlaybookCard } from "./playbook-card";
import { isTemplateSort, type PlaybookPickerState } from "./playbook-model";
import {
  PLAYBOOK_HEADER_CLASS,
  playbookCategoryButtonClass,
  playbookCategoryCountClass,
} from "./playbook-visual";

export function PlaybookPicker({ picker }: { picker: PlaybookPickerState }) {
  const {
    templates,
    categories,
    categoryCounts,
    category,
    onCategoryChange,
    search,
    onSearchChange,
    sort,
    onSortChange,
    view,
    onViewChange,
    onBuildFromScratch,
    onClose,
  } = picker;
  const paintReady = useWindowLoadReady();

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <>
      <div aria-hidden={paintReady || undefined} style={paintReady ? PAINT_HIDDEN_SHELL : undefined}>
        <header data-playbook-chrome="true" className={PLAYBOOK_HEADER_CLASS}>
          <div>
            <h2 id={paintReady ? undefined : "template-title"} data-playbook-title="Choose a playbook">
              <span className="sr-only">Choose a playbook</span>
            </h2>
            <p
              data-playbook-lede="Start with a proven Hook, Content, and CTA structure."
              className="mt-1 max-w-[12rem] overflow-hidden text-[11px] leading-4 text-[var(--pf-muted)] sm:text-[12px]"
            >
              <span className="sr-only">
                Start with a proven Hook, Content, and CTA structure. Preview it, select it, then apply when you are ready.
              </span>
            </p>
          </div>
          <PlaybookCloseButton onClose={onClose} />
        </header>
      </div>
      {paintReady ? (
        <header className={PLAYBOOK_HEADER_CLASS}>
          <div className="min-w-0">
            <span
              id="template-title"
              className="block text-[20px] font-semibold tracking-tight text-[var(--pf-ink)] [overflow-wrap:anywhere]"
            >
              Choose a playbook
            </span>
            <span className="mt-1 block max-w-xl text-[12px] leading-5 text-[var(--pf-muted)] [overflow-wrap:anywhere]">
              Start with a proven Hook, Content, and CTA structure. Preview it, select it, then apply when you are ready.
            </span>
          </div>
          <PlaybookCloseButton onClose={onClose} />
        </header>
      ) : null}

      <div
        data-playbook-body="true"
        className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] overflow-y-auto lg:grid-cols-[170px_minmax(0,1fr)] lg:overflow-hidden"
      >
        <aside className="border-b border-[var(--pf-border)] bg-[var(--pf-active)] p-3 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-4">
          <div className="mb-2 flex items-center gap-2 px-1 text-[12px] font-bold uppercase tracking-[0.11em] text-[var(--pf-muted)]">
            <SlidersHorizontal className="size-3" /> Categories
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => onCategoryChange(item)}
                aria-pressed={category === item}
                className={playbookCategoryButtonClass(category === item)}
              >
                <span className="flex items-center gap-2">
                  {item === "Favorites" && (
                    <Heart
                      className="size-3"
                      fill={category === item ? "currentColor" : "none"}
                    />
                  )}
                  {item}
                </span>
                <span className={playbookCategoryCountClass(category === item)}>
                  {categoryCounts[item] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onBuildFromScratch}
            className="mt-3 flex min-h-14 w-full shrink-0 items-center gap-2 rounded-[8px] border border-dashed border-[var(--pf-border-strong)] bg-[var(--pf-surface)] px-3 text-left hover:border-[var(--pf-orange)] lg:mt-5"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-[var(--pf-orange)] text-white">
              <Plus className="size-3.5" />
            </span>
            <span className="min-w-0">
              <AutomationsPaintText
                ready={paintReady}
                liveAs="span"
                liveClassName="block text-[11px] font-semibold text-[var(--pf-ink)] [overflow-wrap:anywhere]"
                paint={
                  <b className="block text-[11px] text-[var(--pf-ink)]" data-playbook-scratch="Build from scratch">
                    <span className="sr-only">Build from scratch</span>
                  </b>
                }
              >
                Build from scratch
              </AutomationsPaintText>
              <AutomationsPaintText
                ready={paintReady}
                liveAs="span"
                liveClassName="mt-0.5 block text-[11px] text-[var(--pf-muted)] [overflow-wrap:anywhere]"
                paint={
                  <small
                    className="mt-0.5 block text-[11px] text-[var(--pf-muted)]"
                    data-playbook-scratch-copy="Blank three-phase workflow"
                  >
                    <span className="sr-only">Blank three-phase workflow</span>
                  </small>
                }
              >
                Blank three-phase workflow
              </AutomationsPaintText>
            </span>
          </button>
        </aside>

        <section className="min-w-0 bg-[var(--pf-surface)] lg:overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-[var(--pf-border)] bg-[var(--pf-surface)] p-3 backdrop-blur sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] px-3 focus-within:border-[var(--pf-orange)] focus-within:ring-2 focus-within:ring-[var(--pf-orange)]/10">
                <Search className="size-3.5 shrink-0 text-[var(--pf-muted)]" />
                <input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[12px] outline-none text-[var(--pf-ink)]"
                  placeholder="Search playbooks, formats, or outcomes…"
                  aria-label="Search playbooks"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    aria-label="Clear playbook search"
                    className="grid size-5 place-items-center rounded-full hover:bg-[var(--pf-active)]"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </label>
              <label className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-2 text-[12px] text-[var(--pf-muted)]">
                Sort
                <select
                  value={sort}
                  onChange={(event) => {
                    if (isTemplateSort(event.target.value)) onSortChange(event.target.value);
                  }}
                  className="bg-transparent text-[13px] font-semibold text-[var(--pf-ink)] outline-none"
                  aria-label="Sort playbooks"
                >
                  <option value="recommended">Recommended</option>
                  <option value="name">Name</option>
                  <option value="slides">Slides</option>
                </select>
              </label>
              <div
                className="flex h-9 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-1"
                aria-label="Playbook view"
              >
                <button
                  type="button"
                  onClick={() => onViewChange("grid")}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  className={cn(
                    "grid w-7 place-items-center rounded-[8px]",
                    view === "grid" && "bg-[var(--pf-active)]"
                  )}
                >
                  <Grid2X2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onViewChange("list")}
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  className={cn(
                    "grid w-7 place-items-center rounded-[8px]",
                    view === "list" && "bg-[var(--pf-active)]"
                  )}
                >
                  <List className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--pf-muted)]">
              <span>
                {templates.length} {templates.length === 1 ? "playbook" : "playbooks"}
              </span>
              <span>{category === "All" ? "All categories" : category}</span>
            </div>
          </div>

          {templates.length === 0 ? (
            <div className="grid min-h-[330px] place-items-center p-8 text-center">
              <div>
                <Search className="mx-auto size-6 text-[var(--pf-muted)]" />
                <h3 className="mt-3 text-[13px] font-semibold text-[var(--pf-ink)]">No matching playbooks</h3>
                <p className="mt-1 text-[11px] text-[var(--pf-muted)]">Try another search or category.</p>
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange("");
                    onCategoryChange("All");
                  }}
                  className="pf-button-secondary mt-4"
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
            <div
              data-playbook-cards="true"
              className={cn(
                "grid gap-3 p-3 sm:p-4",
                view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
              )}
            >
              {templates.map((template) => (
                <PlaybookCard key={template.id} picker={picker} template={template} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function PlaybookCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close playbook picker"
      className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--pf-border)] bg-[var(--pf-surface)] hover:bg-[var(--pf-active)]"
    >
      <X className="size-4" />
    </button>
  );
}
