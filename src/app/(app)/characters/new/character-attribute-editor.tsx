"use client";

import { useLayoutEffect, useRef } from "react";
import {
  CHARACTER_ATTRIBUTE_SECTIONS,
  type CharacterAttributeSection,
  type CharacterAttributes,
} from "@/lib/character-attributes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button, Icon, Range, buttonClass, iconButtonClass } from "@/components/workbench";
import { publishPinnedBar } from "@/lib/pinned-bar";
import { useStepEntry } from "@/lib/use-step-entry";
import { cn } from "@/lib/utils";
import type { CharacterAttributeEditorViewModel } from "./types";

export function CharacterAttributeEditor({
  view,
}: {
  view: CharacterAttributeEditorViewModel;
}) {
  const { active, error, errorIsMissingRecord, onDismissError, onSelectSection, copyPrompt, clearSection, clearButtonRef, sectionIsEmpty, toastKey } = view;
  const index = CHARACTER_ATTRIBUTE_SECTIONS.findIndex((section) => section.id === active?.id);
  const previous = index > 0 ? CHARACTER_ATTRIBUTE_SECTIONS[index - 1] : undefined;
  const next = CHARACTER_ATTRIBUTE_SECTIONS[index + 1];
  const { markStepChange, stepRef } = useStepEntry();
  const sectionId = active?.id;
  const footerBar = useRef<HTMLDivElement>(null);
  // Below 1280 the row is in flow, so a new section moves it without resizing it. Publishing again on
  // a new section and on a new toast says where it sits now, before the toast paints.
  useLayoutEffect(() => publishPinnedBar(footerBar.current), [sectionId, toastKey]);

  function goTo(sectionId: string) {
    markStepChange();
    onSelectSection(sectionId);
  }

  return (
    <section
      aria-labelledby="character-section-title"
      data-character-attribute-editor
      className="wb-panel min-w-0 gap-5 px-4 pb-5 pt-[18px] sm:gap-6 sm:px-6 lg:min-h-0 lg:flex-1"
    >
      <div className="flex h-8 shrink-0 items-center justify-between gap-3">
        <h2
          key={active?.id}
          ref={stepRef}
          tabIndex={-1}
          id="character-section-title"
          className="rounded-sm text-base font-bold leading-5 tracking-[-0.01em] text-fg focus-visible:[outline:2px_solid_var(--pf-ember)] focus-visible:outline-offset-4"
        >
          {active?.label}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger type="button" aria-label="Copy prompt" className={iconButtonClass("quiet", 30)} onClick={copyPrompt}>
              <Icon name="copy" />
            </TooltipTrigger>
            <TooltipContent side="left">Copy prompt</TooltipContent>
          </Tooltip>
          {/* Stays focusable when there is nothing to clear, so focus never drops after a clear. */}
          <button
            ref={clearButtonRef}
            type="button"
            className={buttonClass("quiet", 32)}
            aria-disabled={sectionIsEmpty || undefined}
            aria-label={`Clear ${active?.label ?? "section"}`}
            onClick={clearSection}
          >
            Clear
          </button>
        </div>
      </div>
      {error ? (
        <div role="alert" className="wb-notice wb-fade-in items-start justify-between py-3" data-tone="bad">
          <p className="min-w-0 text-[13px] leading-[19px] text-fg [overflow-wrap:anywhere]">
            <strong className="font-bold text-bad">
              {errorIsMissingRecord ? "Character not found. " : "Not saved. "}
            </strong>
            {error}
          </p>
          {errorIsMissingRecord ? null : (
            <button type="button" onClick={onDismissError} aria-label="Dismiss error" className="shrink-0 rounded-full text-bad outline-none focus-visible:shadow-[0_0_0_2px_var(--pf-ember)]">
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      ) : null}
      {active ? <AttributeGroups key={active.id} view={view} active={active} /> : null}
      {/* A long step name does not fit beside Back at 320, so Next wraps to its own line and stays whole. */}
      <div ref={footerBar} className={FOOTER_ROW}>
        <Button size={40} className="disabled:text-fg-muted" disabled={!previous} onClick={() => previous && goTo(previous.id)}>
          Back
        </Button>
        {next ? (
          <Button variant="strong" size={40} className="ml-auto gap-1.5 pr-3.5 pl-[18px]" onClick={() => goTo(next.id)}>
            Next: {next.label}
            <Icon name="chevron-right" />
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/**
 * From 1280 the builder fills the viewport and this row rests on its bottom edge. Its box runs to the
 * panel's edge (the padding is the panel's own 20px) so it counts as a bar there, and a toast, which
 * can now hold Undo for five seconds, sits above Back and Next.
 */
const FOOTER_ROW = "-mb-5 flex shrink-0 flex-wrap items-center justify-between gap-3 pb-5";

function AttributeGroups({
  view,
  active,
}: {
  view: CharacterAttributeEditorViewModel;
  active: CharacterAttributeSection;
}) {
  const { attributes, selectAttribute, onImport, copyAttributes } = view;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div
        data-character-options
        className="wb-scroll-fade-y wb-scroll-fade-deep wb-ring-room flex min-h-0 flex-col gap-6 lg:overflow-y-auto"
      >
      {active.groups.map((group) => (
        <fieldset key={group.key} className="flex shrink-0 flex-col gap-2">
          <legend
            className={cn(
              group.label === active.label
                ? "sr-only"
                : "mb-2 flex w-full items-center justify-between gap-3 text-xs font-semibold leading-4 text-fg-muted"
            )}
          >
            <span>{group.label}</span>
            {group.key === "lipFullness" && attributes[group.key] ? <span className="wb-mono text-fg-secondary">{attributes[group.key]}%</span> : null}
          </legend>
          {group.key === "lipFullness" ? (
            <Range
              min="0"
              max="100"
              step="1"
              value={attributes[group.key] ?? "72"}
              onChange={(event) => selectAttribute(group.key, event.target.value)}
              aria-label="Lip fullness"
              className="max-w-md"
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
      </div>
      <div className="flex shrink-0 grow basis-[196px] flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex-1 text-xs font-semibold leading-4 text-fg-muted">Recipe</span>
          <Button size={32} className="h-7 px-3 text-xs" onClick={onImport} aria-label="Import prompt or JSON">
            Import
          </Button>
          <Button size={32} className="h-7 px-3 text-xs" onClick={copyAttributes} aria-label="Copy attributes JSON">
            Copy JSON
          </Button>
        </div>
        <div className="wb-ring-host flex min-h-[160px] flex-1 basis-0 flex-col overflow-hidden rounded-lg bg-raised">
          <pre className="wb-scroll-fade-y wb-scroll-fade-deep wb-mono min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-4 py-3.5 text-xs leading-5 text-fg-secondary">
            {sectionRecipe(active, attributes)}
          </pre>
        </div>
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
