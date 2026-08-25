"use client";

import { Check, ChevronRight, Copy, X } from "lucide-react";
import {
  CHARACTER_ATTRIBUTE_SECTIONS,
  type CharacterAttributeSection,
  type CharacterAttributes,
} from "@/lib/character-attributes";
import { cn } from "@/lib/utils";

export type CharacterAttributeEditorViewModel = {
  attributes: CharacterAttributes;
  activeSection: string;
  active: CharacterAttributeSection | undefined;
  error: string | null;
  onDismissError: () => void;
  onSelectSection: (sectionId: string) => void;
  copyPrompt: () => void;
  selectAttribute: (key: string, value: string) => void;
};

export function CharacterAttributeEditor({
  view,
}: {
  view: CharacterAttributeEditorViewModel;
}) {
  const {
    attributes,
    activeSection,
    active,
    error,
    onDismissError,
    onSelectSection,
    copyPrompt,
    selectAttribute,
  } = view;
  return (
    <section
      aria-label="Character attributes"
      data-character-attribute-editor="true"
      className="min-w-0 bg-white min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0 min-[1280px]:overflow-y-auto"
    >
      <section className="min-h-[470px] px-4 py-5 sm:px-5 min-[1280px]:pb-10">
        {error && <div role="alert" className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)]"><span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span><button onClick={onDismissError} aria-label="Dismiss error" className="shrink-0"><X className="size-3.5" /></button></div>}
        {activeSection === "overview" ? (
          <div>
            <div className="flex flex-col items-start justify-between gap-3 min-[560px]:flex-row min-[560px]:items-end">
              <div>
                <h2 data-lcp="Character blueprint">
                  <span className="sr-only">Character blueprint</span>
                </h2>
                <p className="sr-only">Review every selected attribute before saving or copy the full prompt for another workflow.</p>
              </div>
              <button onClick={copyPrompt} className="pf-button-secondary shrink-0" data-lcp="Copy prompt">
                <Copy className="size-3.5" />
                <span className="sr-only">Copy prompt</span>
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 min-[1280px]:grid-cols-1 min-[1460px]:grid-cols-2">
              {CHARACTER_ATTRIBUTE_SECTIONS.map((section) => (
                <button key={section.id} onClick={() => onSelectSection(section.id)} className="pf-card p-3 text-left transition hover:border-[var(--pf-border-strong)] hover:shadow-sm motion-reduce:transform-none">
                  <span className="flex items-center justify-between">
                    <b data-lcp={section.label}>
                      <span className="sr-only">{section.label}</span>
                    </b>
                    <ChevronRight className="size-3 text-muted-foreground" />
                  </span>
                  <span className="sr-only">{section.groups.map((group) => `${group.label}: ${attributes[group.key]}`).join(" · ")}</span>
                </button>
              ))}
            </div>
          </div>
        ) : active ? (
          <div>
            <div>

              <h2 data-lcp={active.label}>
                <span className="sr-only">{active.label}</span>
              </h2>
              <p data-lcp="Selections update the recipe immediately.">
                <span className="sr-only">Selections update the recipe immediately. Re-render to apply them to the photographic preview.</span>
              </p>
            </div>
            <div className="mt-4 space-y-4">
              {active.groups.map((group) => (
                <fieldset key={group.key}>
                  <legend className="mb-1.5 flex w-full items-center justify-between gap-3 text-[12px] font-semibold">
                    <span>{group.label}</span>
                    <span className="truncate text-[11px] font-medium text-muted-foreground">
                      {group.key === "lipFullness" ? `${attributes[group.key]}%` : attributes[group.key]}
                    </span>
                  </legend>
                  {group.key === "lipFullness" ? (
                    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={attributes[group.key] ?? "72"}
                        onChange={(event) => selectAttribute(group.key, event.target.value)}
                        aria-label="Lip fullness"
                        className="h-1.5 w-full cursor-pointer accent-[var(--pf-orange)]"
                      />
                      <div className="mt-1 flex justify-between text-[12px] text-muted-foreground"><span>0%</span><span>100%</span></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 min-[1280px]:grid-cols-2 min-[1380px]:grid-cols-3">
                      {group.options.map((option) => {
                        const selected = attributes[group.key] === option;
                        return (
                          <button
                            type="button"
                            key={option}
                            aria-pressed={selected}
                            onClick={() => selectAttribute(group.key, option)}
                            className={cn(
                              "relative min-h-[38px] rounded-lg border px-2.5 py-1.5 text-left text-[12px] leading-4 transition-colors",
                              selected
                                ? "border-[var(--pf-orange)] bg-[var(--sidebar-accent)] pr-7 font-semibold text-foreground ring-1 ring-[var(--pf-orange)]/25"
                                : "border-border bg-card text-muted-foreground hover:border-[var(--pf-border-strong)] hover:bg-white"
                            )}
                          >
                            {option}
                            {selected && <span className="absolute right-2 top-1/2 grid size-4 -translate-y-1/2 place-items-center rounded-full bg-[var(--pf-orange)] text-white"><Check className="size-2.5" /></span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}
