"use client";

import {
  CHARACTER_ATTRIBUTE_SECTIONS,
  type CharacterAttributeSection,
  type CharacterAttributes,
} from "@/lib/character-attributes";
import { Button, Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";
import type { CharacterAttributeEditorViewModel } from "./types";

export function CharacterAttributeEditor({
  view,
}: {
  view: CharacterAttributeEditorViewModel;
}) {
  const { active, error, onDismissError, onSelectSection, copyPrompt } = view;
  const index = CHARACTER_ATTRIBUTE_SECTIONS.findIndex((section) => section.id === active?.id);
  const previous = index > 0 ? CHARACTER_ATTRIBUTE_SECTIONS[index - 1] : undefined;
  const next = CHARACTER_ATTRIBUTE_SECTIONS[index + 1];

  return (
    <section
      aria-labelledby="character-section-title"
      data-character-attribute-editor
      className="wb-panel min-w-0 gap-5 px-4 pb-5 pt-[18px] sm:gap-6 sm:px-6 lg:min-h-0 lg:flex-1"
    >
      <div className="flex h-8 shrink-0 items-center justify-between gap-3">
        <h2 id="character-section-title" className="text-base font-bold leading-5 tracking-[-0.01em] text-fg">
          {active?.label}
        </h2>
        <Button size={32} onClick={copyPrompt}>
          Copy prompt
        </Button>
      </div>
      {error ? (
        <div role="alert" className="wb-notice wb-fade-in items-start justify-between" data-tone="bad">
          <p className="min-w-0 text-[13px] leading-[19px] text-fg [overflow-wrap:anywhere]">
            <strong className="font-bold text-bad">Not saved. </strong>
            {error}
          </p>
          <button type="button" onClick={onDismissError} aria-label="Dismiss error" className="shrink-0 rounded-full text-bad outline-none focus-visible:shadow-[0_0_0_2px_var(--pf-ember)]">
            <Icon name="x" size={16} />
          </button>
        </div>
      ) : null}
      {active ? <AttributeGroups view={view} active={active} /> : null}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <Button size={40} disabled={!previous} onClick={() => previous && onSelectSection(previous.id)}>
          Back
        </Button>
        {next ? (
          <Button variant="strong" size={40} onClick={() => onSelectSection(next.id)}>
            Next: {next.label}
            <Icon name="chevron-right" />
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function AttributeGroups({
  view,
  active,
}: {
  view: CharacterAttributeEditorViewModel;
  active: CharacterAttributeSection;
}) {
  const { attributes, selectAttribute, onImport, copyAttributes } = view;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:-mx-1 lg:overflow-y-auto lg:px-1 lg:py-0.5">
      {active.groups.map((group) => (
        <fieldset key={group.key} className="flex shrink-0 flex-col gap-2">
          <legend className="mb-2 flex w-full items-center justify-between gap-3 text-xs font-semibold leading-4 text-fg-muted">
            <span>{group.label}</span>
            {group.key === "lipFullness" ? <span className="wb-mono text-fg-secondary">{attributes[group.key]}%</span> : null}
          </legend>
          {group.key === "lipFullness" ? (
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={attributes[group.key] ?? "72"}
              onChange={(event) => selectAttribute(group.key, event.target.value)}
              aria-label="Lip fullness"
              className="h-1.5 w-full max-w-md cursor-pointer accent-[var(--pf-ember)]"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const selected = attributes[group.key] === option;
                return (
                  <button
                    type="button"
                    key={option}
                    aria-pressed={selected}
                    onClick={() => selectAttribute(group.key, option)}
                    className={cn(
                      "wb-chip h-[38px] px-4 text-sm leading-[18px] aria-pressed:bg-raised aria-pressed:text-fg aria-pressed:shadow-[0_0_0_2px_var(--pf-ember)]"
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      ))}
      <div className="flex min-h-[180px] flex-1 flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex-1 text-xs font-semibold leading-4 text-fg-muted">Recipe</span>
          <Button size={32} className="h-7 px-3 text-xs" onClick={onImport} aria-label="Import prompt or JSON">
            Import
          </Button>
          <Button size={32} className="h-7 px-3 text-xs" onClick={copyAttributes} aria-label="Copy attributes JSON">
            Copy JSON
          </Button>
        </div>
        <pre className="wb-mono min-h-0 flex-1 overflow-auto whitespace-pre rounded-lg bg-raised px-4 py-3.5 text-xs leading-5 text-fg-secondary">
          {sectionRecipe(active, attributes)}
        </pre>
      </div>
    </div>
  );
}

function sectionRecipe(section: CharacterAttributeSection, attributes: CharacterAttributes) {
  const values = Object.fromEntries(
    section.groups.map((group) => [group.key, attributes[group.key] ?? null])
  );
  return JSON.stringify({ [section.id]: values }, null, 2);
}
