"use client";

import Link from "next/link";
import { Button, Chip, Icon } from "@/components/workbench";
import { canRunPromptImprovement } from "@/lib/ai/prompt-improvement-ui";
import { CREATIVE_SPARKS, PROMPT_MAX_LENGTH } from "./form-constants";
import { PromptTemplatesControl } from "./prompt-templates-control";
import type { GenerateFormActions, GenerateFormModel } from "./form-types";
import type { GenerateFormViewModel } from "./form-view-model";

export function GenerateFormPromptSection({
  form,
  actions,
  view,
}: {
  form: GenerateFormModel;
  actions: GenerateFormActions;
  view: GenerateFormViewModel;
}) {
  const {
    prompt,
    isImprovingPrompt = false,
    promptImprovementError = null,
    promptImprovementNotice = null,
    promptEnhancerConfigured = null,
    canUndoPromptImprovement = false,
  } = form;
  const {
    onPromptChange,
    onImprovePrompt = () => {},
    onUndoPromptImprovement = () => {},
    onAppendToPrompt,
  } = actions;
  const canImprove = canRunPromptImprovement({
    hasModel: Boolean(view.model),
    hasPrompt: Boolean(prompt.trim()),
    isRunning: isImprovingPrompt,
    configured: promptEnhancerConfigured,
  });

  return (
    <section className="wb-panel gap-3 p-5">
      <div className="flex min-h-7 items-center gap-2.5">
        <h2 className="wb-panel-title flex-1">Creative prompt</h2>
        <PromptTemplatesControl prompt={prompt} onPromptChange={onPromptChange} />
      </div>

      <div className="flex min-h-[104px] flex-col justify-between gap-2 rounded-lg bg-raised pb-2.5 pl-3.5 pr-3 pt-3 shadow-[inset_0_0_0_0_var(--pf-ember)] transition-shadow duration-160 ease-pf focus-within:shadow-[inset_0_0_0_2px_var(--pf-ember)]">
        <textarea
          aria-label="Creative prompt"
          placeholder="Scene, subject, lighting, camera"
          value={prompt}
          maxLength={PROMPT_MAX_LENGTH}
          rows={3}
          onChange={(event) => onPromptChange(event.target.value.slice(0, PROMPT_MAX_LENGTH))}
          className="min-h-[63px] w-full resize-y bg-transparent text-[14px] leading-[21px] text-fg outline-none placeholder:text-fg-muted"
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="wb-mono mr-auto text-fg-secondary">
            {prompt.length} / {PROMPT_MAX_LENGTH.toLocaleString("en-US")}
          </span>
          {canUndoPromptImprovement ? (
            <Button variant="link" onClick={onUndoPromptImprovement}>
              Undo
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onImprovePrompt}
            disabled={!canImprove}
            aria-busy={isImprovingPrompt}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-strong pl-2.5 pr-3 text-[13px] font-semibold leading-4 text-strong-fg transition-[background-color,transform] duration-160 ease-pf hover:bg-[var(--pf-strong-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-raised-strong disabled:text-fg-disabled disabled:active:scale-100"
          >
            <Icon name="generate" size={14} strokeWidth={1.8} />
            {isImprovingPrompt ? "Improving" : "Improve prompt"}
          </button>
        </div>
      </div>

      {promptImprovementError ? (
        <p role="alert" className="wb-notice wb-fade-in" data-tone="bad">
          {promptImprovementError}
        </p>
      ) : promptEnhancerConfigured === false ? (
        <p className="wb-notice" data-tone="warn">
          <strong className="min-w-0 flex-1">Prompt improvement needs a Gemini API key.</strong>
          <Link href="/settings?tab=api-keys" className="shrink-0 font-semibold text-fg underline underline-offset-2">
            Add key in Settings
          </Link>
        </p>
      ) : promptImprovementNotice ? (
        <p role="status" className="wb-notice wb-fade-in" data-tone="ok">
          {promptImprovementNotice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {CREATIVE_SPARKS.map((spark) => {
          const chosen = hasSpark(prompt, spark);
          return (
            <Chip
              key={spark}
              chosen={chosen}
              className="h-8 px-3 aria-pressed:pl-[9px] [&>svg]:size-3.5"
              onClick={() =>
                chosen ? onPromptChange(withoutSpark(prompt, spark)) : onAppendToPrompt(spark)
              }
            >
              {spark}
            </Chip>
          );
        })}
      </div>
    </section>
  );
}

function hasSpark(prompt: string, spark: string) {
  return prompt.toLowerCase().includes(spark.toLowerCase());
}

function withoutSpark(prompt: string, spark: string) {
  const escaped = spark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return prompt
    .replace(new RegExp(`(,\\s*)?${escaped}`, "i"), "")
    .replace(/^\s*,\s*/, "")
    .trim();
}
