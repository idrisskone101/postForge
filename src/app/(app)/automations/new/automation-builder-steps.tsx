"use client";

import { ImageIcon } from "lucide-react";
import { Button, Chip, Field, Icon, IconButton } from "@/components/workbench";
import { composeAutomationHook } from "@/lib/automations";
import { AUTOMATION_TEMPLATES } from "@/lib/automations/templates";
import { CTA_STYLES, HOOK_STRATEGIES, STORY_STRUCTURES } from "./automation-builder-fields";
import type { AutomationBuilderWorkspace } from "./use-automation-builder";

type StepProps = { workspace: AutomationBuilderWorkspace };

export function HookStep({ workspace }: StepProps) {
  const { record, updateHook, applyTemplate, openTemplatePicker } = workspace;
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="wb-label" id="builder-template-label">
          Template
        </span>
        <div role="group" aria-labelledby="builder-template-label" className="flex flex-wrap gap-2">
          {AUTOMATION_TEMPLATES.map((template) => (
            <Chip
              key={template.id}
              chosen={record.template === template.id}
              onClick={() => applyTemplate(template.id)}
            >
              {template.name}
            </Chip>
          ))}
          <Button data-playbook-opener="true" onClick={openTemplatePicker}>
            Browse playbooks
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="wb-panel-title pb-0.5" id="builder-hook-heading">
          Stop the scroll
        </h2>
        <div role="group" aria-labelledby="builder-hook-heading" className="flex flex-col gap-2">
          {HOOK_STRATEGIES.map((strategy) => {
            const example = composeAutomationHook(strategy, record.hook.prompt);
            const chosen = record.hook.strategy === strategy;
            return (
              <button
                key={strategy}
                type="button"
                className="wb-option flex-wrap gap-y-0.5 py-2 text-left"
                aria-pressed={chosen}
                onClick={() => updateHook({ strategy })}
              >
                <span className="wb-radio">
                  <Icon name="check-chosen" size={14} strokeWidth={2.5} />
                </span>
                <span
                  className={
                    chosen
                      ? "w-[190px] shrink-0 text-[14px] font-bold leading-5 text-fg"
                      : "w-[190px] shrink-0 text-[14px] font-semibold leading-5 text-fg"
                  }
                >
                  {strategy}
                </span>
                <span className="min-w-0 flex-1 basis-[220px] text-[14px] leading-5 text-fg-secondary">
                  {example || "Add a hook prompt to see this hook"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Hook prompt" htmlFor="builder-hook-prompt">
          <textarea
            id="builder-hook-prompt"
            value={record.hook.prompt}
            onChange={(event) => updateHook({ prompt: event.target.value })}
            className="wb-input h-16 min-h-16 resize-none py-2.5"
          />
        </Field>
        <Field label="Selected hook" htmlFor="builder-hook-selected">
          <div className="wb-input-wrap pr-[5px]">
            <input
              id="builder-hook-selected"
              value={record.hook.selected}
              onChange={(event) => updateHook({ selected: event.target.value })}
              className="text-[14px] leading-[18px]"
            />
            <Button
              variant="strong"
              size={32}
              className="shrink-0"
              aria-label="Compose from prompt"
              title="Composed locally from your prompt and strategy. No network request."
              disabled={!record.hook.prompt.trim()}
              onClick={() =>
                updateHook({
                  selected: composeAutomationHook(record.hook.strategy, record.hook.prompt),
                })
              }
            >
              Compose
            </Button>
          </div>
        </Field>
      </div>
    </>
  );
}

export function ContentStep({ workspace }: StepProps) {
  const { record, updateContent, sourceFile, sourceFileLoading } = workspace;
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="wb-panel-title pb-0.5" id="builder-structure-heading">
          Deliver the value
        </h2>
        <div role="group" aria-labelledby="builder-structure-heading" className="flex flex-wrap gap-2">
          {STORY_STRUCTURES.map((structure) => (
            <Chip
              key={structure}
              chosen={record.content.structure === structure}
              onClick={() => updateContent({ structure })}
            >
              {structure}
            </Chip>
          ))}
        </div>
      </div>
      <Field label="Slides per post" htmlFor="builder-slide-count">
        <div className="flex h-[42px] items-center gap-3.5 rounded-lg bg-raised px-3.5">
          <input
            id="builder-slide-count"
            type="range"
            min="3"
            max="9"
            value={record.content.slideCount}
            onChange={(event) => updateContent({ slideCount: Number(event.target.value) })}
            className="min-w-0 flex-1 accent-[var(--pf-ember)]"
          />
          <output htmlFor="builder-slide-count" className="w-5 text-right text-[14px] font-semibold leading-[18px] text-fg tabular-nums">
            {record.content.slideCount}
          </output>
        </div>
      </Field>
      {record.content.sourceFileId && (
        <Field label="Attached generated asset">
          <div className="flex min-h-[60px] items-center gap-3 rounded-lg bg-raised px-3 py-2">
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-media text-fg-muted">
              {sourceFile?.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sourceFile.previewUrl} alt="" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-[18px]" strokeWidth={1.5} />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-5 text-fg">
              {sourceFileLoading
                ? "Checking source asset"
                : sourceFile?.filename ?? "Source asset unavailable"}
            </span>
            <IconButton
              icon="x"
              size={30}
              variant="ghost"
              label="Remove source asset"
              onClick={() => updateContent({ sourceFileId: null })}
            />
          </div>
        </Field>
      )}
      <Field label="Writing guidance" htmlFor="builder-guidance">
        <textarea
          id="builder-guidance"
          value={record.content.guidance}
          onChange={(event) => updateContent({ guidance: event.target.value })}
          className="wb-input h-[132px] resize-none py-2.5"
        />
      </Field>
    </>
  );
}

export function CloseStep({ workspace }: StepProps) {
  const { record, updateCta } = workspace;
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="wb-panel-title pb-0.5" id="builder-cta-heading">
          Close with intent
        </h2>
        <div role="group" aria-labelledby="builder-cta-heading" className="flex flex-wrap gap-2">
          {CTA_STYLES.map((style) => (
            <Chip
              key={style}
              chosen={record.cta.style === style}
              onClick={() => updateCta({ style })}
            >
              {style}
            </Chip>
          ))}
        </div>
      </div>
      <Field label="Close prompt" htmlFor="builder-cta-prompt">
        <textarea
          id="builder-cta-prompt"
          value={record.cta.prompt}
          onChange={(event) => updateCta({ prompt: event.target.value })}
          className="wb-input h-[132px] resize-none py-2.5"
        />
      </Field>
    </>
  );
}
