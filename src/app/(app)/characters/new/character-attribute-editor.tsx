"use client";

import { Check, ChevronRight, Copy, X } from "lucide-react";
import {
  CHARACTER_ATTRIBUTE_SECTIONS,
  type CharacterAttributeSection,
  type CharacterAttributes,
} from "@/lib/character-attributes";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { cn } from "@/lib/utils";
import { CharactersPaintText } from "../characters-paint-text";
import type { CharacterAttributeEditorViewModel } from "./types";

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
  const paintReady = useWindowLoadReady();

  return (
    <section
      aria-label="Character attributes"
      data-character-attribute-editor="true"
      className="min-w-0 bg-[var(--pf-surface)] min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0 min-[1280px]:overflow-y-auto"
    >
      <section className="min-h-[470px] px-4 py-5 sm:px-5 min-[1280px]:pb-10">
        {error ? (
          <div
            role="alert"
            className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)]"
          >
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span>
            <button type="button" onClick={onDismissError} aria-label="Dismiss error" className="shrink-0">
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
        {renderEditorBody({
          activeSection,
          active,
          attributes,
          paintReady,
          onSelectSection,
          copyPrompt,
          selectAttribute,
        })}
      </section>
    </section>
  );
}

function renderEditorBody({
  activeSection,
  active,
  attributes,
  paintReady,
  onSelectSection,
  copyPrompt,
  selectAttribute,
}: {
  activeSection: string;
  active: CharacterAttributeSection | undefined;
  attributes: CharacterAttributes;
  paintReady: boolean;
  onSelectSection: (sectionId: string) => void;
  copyPrompt: () => void;
  selectAttribute: (key: string, value: string) => void;
}) {
  if (activeSection === "overview") {
    return (
      <div>
        <div className="flex flex-col items-start justify-between gap-3 min-[560px]:flex-row min-[560px]:items-end">
          <div>
            <CharactersPaintText
              ready={paintReady}
              liveAs="span"
              liveClassName="text-[15px] font-semibold text-[var(--pf-ink)]"
              paint={
                <h2 data-character-blueprint="Character blueprint">
                  <span className="sr-only">Character blueprint</span>
                </h2>
              }
            >
              Character blueprint
            </CharactersPaintText>
            <p className="sr-only">
              Review every selected attribute before saving or copy the full prompt for another
              workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={copyPrompt}
            className="pf-button-secondary shrink-0"
            data-character-action={paintReady ? undefined : "Copy prompt"}
          >
            <Copy className="size-3.5" />
            {paintReady ? <span>Copy prompt</span> : <span className="sr-only">Copy prompt</span>}
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 min-[1280px]:grid-cols-1 min-[1460px]:grid-cols-2">
          {CHARACTER_ATTRIBUTE_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              className="pf-card p-3 text-left transition hover:border-[var(--pf-border-strong)] hover:shadow-sm motion-reduce:transform-none"
            >
              <span className="flex items-center justify-between gap-2">
                <CharactersPaintText
                  ready={paintReady}
                  liveAs="span"
                  liveClassName="min-w-0 text-[12px] font-semibold text-[var(--pf-ink)] [overflow-wrap:anywhere]"
                  paint={
                    <b
                      style={{
                        maxWidth: "8rem",
                        maxHeight: 12,
                        overflow: "hidden",
                        fontSize: 12,
                        lineHeight: "12px",
                        whiteSpace: "nowrap",
                      }}
                      data-character-section={section.label}
                    >
                      <span className="sr-only">{section.label}</span>
                    </b>
                  }
                >
                  {section.label}
                </CharactersPaintText>
                <ChevronRight className="size-3 shrink-0 text-[var(--pf-muted)]" />
              </span>
              <span className="sr-only">
                {section.groups
                  .map((group) => `${group.label}: ${attributes[group.key]}`)
                  .join(" · ")}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!active) return null;

  return (
    <div>
      <div>
        <CharactersPaintText
          ready={paintReady}
          liveAs="span"
          liveClassName="text-[15px] font-semibold text-[var(--pf-ink)]"
          paint={
            <h2 data-character-blueprint={active.label}>
              <span className="sr-only">{active.label}</span>
            </h2>
          }
        >
          {active.label}
        </CharactersPaintText>
        <p className="sr-only">
          Selections update the recipe immediately. Re-render to apply them to the photographic
          preview.
        </p>
      </div>
      <div className="mt-4 space-y-4">
        {active.groups.map((group) => (
          <fieldset key={group.key}>
            <legend className="mb-1.5 flex w-full items-center justify-between gap-3 text-[12px] font-semibold text-[var(--pf-ink)]">
              <span>{group.label}</span>
              <span className="truncate text-[11px] font-medium text-[var(--pf-muted)]">
                {group.key === "lipFullness" ? `${attributes[group.key]}%` : attributes[group.key]}
              </span>
            </legend>
            {group.key === "lipFullness" ? (
              <div className="rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-canvas)] px-3 py-2.5">
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
                <div className="mt-1 flex justify-between text-[12px] text-[var(--pf-muted)]">
                  <span>0%</span>
                  <span>100%</span>
                </div>
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
                        "relative min-h-[38px] rounded-[8px] border px-2.5 py-1.5 text-left text-[12px] leading-4 transition-colors",
                        selected
                          ? "border-[var(--pf-orange)] bg-[var(--sidebar-accent)] pr-7 font-semibold text-[var(--pf-ink)] ring-1 ring-[var(--pf-orange)]/25"
                          : "border-[var(--pf-border)] bg-[var(--pf-canvas)] text-[var(--pf-muted)] hover:border-[var(--pf-border-strong)] hover:bg-[var(--pf-active)]"
                      )}
                    >
                      {option}
                      {selected ? (
                        <span className="absolute right-2 top-1/2 grid size-4 -translate-y-1/2 place-items-center rounded-full bg-[var(--pf-orange)] text-[var(--pf-canvas)]">
                          <Check className="size-2.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
