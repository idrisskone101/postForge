"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { canRunPromptImprovement } from "@/lib/ai/prompt-improvement-ui";
import { cn } from "@/lib/utils";
import { CREATIVE_SPARKS } from "./form-constants";
import { PromptTemplatesControl } from "./prompt-templates-control";
import type { GenerateFormActions, GenerateFormModel } from "./form-types";
import type { GenerateFormViewModel } from "./form-view-model";

export function GenerateFormPromptSection({
  form,
  actions,
  view,
  paintReady,
}: {
  form: GenerateFormModel;
  actions: GenerateFormActions;
  view: GenerateFormViewModel;
  paintReady: boolean;
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
  const { isVideo } = view;
  const heading = `Describe your ${isVideo ? "video" : "image"}`;

  return (
    <section data-generate-prompt={paintReady ? undefined : "true"} className="pf-card p-4">
      <div
        data-generate-prompt-toolbar={paintReady ? undefined : "true"}
        className={cn(
          "mb-3 flex items-center justify-between gap-3",
          paintReady ? "min-h-9 flex-wrap" : "h-9 overflow-hidden"
        )}
      >
        <div className="flex items-center gap-2">
          <h2 className="pf-section-title">{heading}</h2>
        </div>
        <div className="flex items-center gap-2">
          {canUndoPromptImprovement && (
            <button
              type="button"
              onClick={onUndoPromptImprovement}
              className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted-foreground hover:bg-[var(--pf-active)] hover:text-foreground"
            >
              <Undo2 className="size-3" /> Undo
            </button>
          )}
          <PromptTemplatesControl prompt={prompt} onPromptChange={onPromptChange} />
          <button
            type="button"
            onClick={onImprovePrompt}
            disabled={
              !canRunPromptImprovement({
                hasModel: Boolean(view.model),
                hasPrompt: Boolean(prompt.trim()),
                isRunning: isImprovingPrompt,
                configured: promptEnhancerConfigured,
              })
            }
            aria-busy={isImprovingPrompt}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold text-[var(--pf-link)] hover:bg-[var(--pf-active)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isImprovingPrompt ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Sparkles className="size-3" />
            )}
            {isImprovingPrompt ? "Improving…" : "Improve prompt"}
          </button>
        </div>
      </div>

      <Textarea
        aria-label="Creative prompt"
        placeholder="Scene, subject, lighting, camera…"
        value={prompt}
        maxLength={1500}
        onChange={(event) => onPromptChange(event.target.value.slice(0, 1500))}
        className="field-sizing-fixed min-h-[118px] h-[118px] resize-none rounded-lg border-border bg-card px-3 py-3 text-[12px] leading-5 text-foreground shadow-none focus-visible:border-[var(--pf-orange)] focus-visible:ring-[var(--pf-orange)]/10"
      />
      <div
        data-generate-prompt-meta={paintReady ? undefined : "true"}
        className={cn(
          "mt-2 flex flex-col text-[12px] leading-5 text-muted-foreground",
          paintReady ? "min-h-[3.5rem]" : "h-[3.5rem] overflow-hidden"
        )}
      >
        <div className="flex h-5 items-center justify-between">
          <span>{prompt.length}/1,500</span>
          <span>Be specific about the opening frame</span>
        </div>
        <div className="min-h-9 leading-4">
          {promptEnhancerConfigured === false && !promptImprovementError ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span data-generate-notice="Prompt improvement needs a Gemini API key.">
                <span className="sr-only">Prompt improvement needs a Gemini API key.</span>
              </span>
              <Link
                href="/settings?tab=api-keys"
                className="inline-flex min-h-9 items-center font-semibold text-[var(--pf-link)] hover:underline"
              >
                Add key in Settings
              </Link>
            </div>
          ) : promptImprovementError ? (
            <div role="alert" className="flex items-start gap-1.5 text-[var(--pf-danger)]">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{promptImprovementError}</span>
            </div>
          ) : promptImprovementNotice ? (
            <div role="status" className="flex items-start gap-1.5 text-[var(--pf-link)]">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              <span>{promptImprovementNotice}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div
        data-generate-sparks={paintReady ? undefined : "true"}
        className={
          paintReady
            ? "mt-3 flex flex-wrap gap-1.5"
            : "mt-3 flex h-[6.75rem] flex-wrap gap-1.5 overflow-hidden"
        }
      >
        {CREATIVE_SPARKS.map((spark) => (
          <button
            key={spark}
            type="button"
            onClick={() => onAppendToPrompt(spark)}
            className="rounded-md border border-border bg-[var(--pf-active)] px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-[var(--pf-border-strong)] hover:text-foreground"
          >
            {spark}
          </button>
        ))}
      </div>
    </section>
  );
}
