"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  Search,
  Sparkles,
  Undo2,
  Volume2,
} from "lucide-react";
import { ModelPicker } from "@/components/model-picker";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { canRunPromptImprovement } from "@/lib/ai/prompt-improvement-ui";
import { cn } from "@/lib/utils";
import { CREATIVE_SPARKS, RATIO_LABELS } from "./form-constants";
import { RatioIcon } from "./form-ratio-icon";
import { PromptTemplatesControl } from "./prompt-templates-control";
import type { GenerateFormActions, GenerateFormModel } from "./form-types";
import type { GenerateFormViewModel } from "./form-view-model";

export function GenerateFormControls({
  form,
  actions,
  view,
}: {
  form: GenerateFormModel;
  actions: GenerateFormActions;
  view: GenerateFormViewModel;
}) {
  const {
    models,
    selectedModel,
    prompt,
    aspectRatio,
    numImages,
    duration = 5,
    negativePrompt,
    enableWebSearch,
    enableAudio,
    isImprovingPrompt = false,
    advancedOpen,
    promptImprovementError = null,
    promptImprovementNotice = null,
    promptEnhancerConfigured = null,
    canUndoPromptImprovement = false,
    avatarSection,
    referenceSection,
    continuitySection,
    swapSection,
  } = form;
  const {
    onModelSelect,
    onPromptChange,
    onAspectRatioChange,
    onNumImagesChange,
    onDurationChange = () => {},
    onNegativePromptChange,
    onEnableWebSearchChange,
    onEnableAudioChange,
    onAdvancedOpenChange,
    onImprovePrompt = () => {},
    onUndoPromptImprovement = () => {},
    onAppendToPrompt,
  } = actions;
  const {
    model,
    isImage,
    isVideo,
    recommendedModelId,
    availableRatios,
    outputOptions,
    durationOptions,
  } = view;

  return (
    <div data-generate-controls="true" className="flex min-w-0 flex-col gap-3">
      <section
        data-generate-prompt="true"
        className="rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="max-w-[8rem] line-clamp-1 text-[10px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
              Describe your {isVideo ? "video" : "image"}
            </h2>
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
                  hasModel: Boolean(model),
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
          data-generate-prompt-meta="true"
          className="mt-2 flex h-[3.5rem] flex-col overflow-hidden text-[12px] leading-5 text-muted-foreground"
        >
          <div className="flex h-5 items-center justify-between">
            <span>{prompt.length}/1,500</span>
            <span>Be specific about the opening frame</span>
          </div>
          <div className="min-h-9 leading-4">
            {promptEnhancerConfigured === false && !promptImprovementError ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Prompt improvement needs a Gemini API key.</span>
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

        <div data-generate-sparks="true" className="mt-3 flex h-[6.75rem] flex-wrap gap-1.5 overflow-hidden">
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

      <section
        data-generate-models="true"
        className="rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Choose a model
            </h2>
          </div>
          <span className="rounded-full bg-[var(--pf-success)]/10 px-2 py-1 text-[13px] font-semibold text-[var(--pf-success)]">
            Live pricing
          </span>
        </div>
        <ModelPicker
          selectedModel={selectedModel}
          onModelSelect={onModelSelect}
          models={models}
          recommendedModelId={recommendedModelId}
        />
      </section>

      {model && (
        <section
          key={model.id}
          className="animate-content-enter rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]"
        >
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Format and output
            </h2>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
              <label className="text-[12px] text-muted-foreground">Aspect Ratio</label>
              <div className="flex flex-wrap gap-1.5">
                {availableRatios.map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    aria-pressed={aspectRatio === ratio}
                    onClick={() => onAspectRatioChange(ratio)}
                    className={cn(
                      "flex h-8 min-w-[64px] items-center justify-center gap-1.5 rounded-lg border px-2 text-[12px] font-medium transition-colors",
                      aspectRatio === ratio
                        ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)] text-foreground"
                        : "border-border bg-white text-muted-foreground hover:border-[var(--pf-border-strong)]"
                    )}
                    title={RATIO_LABELS[ratio] ?? ratio}
                  >
                    <RatioIcon ratio={ratio} />
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {isImage && (
              <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
                <label className="text-[12px] text-muted-foreground">Outputs</label>
                <div className="flex gap-1.5">
                  {outputOptions.map((count) => (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={numImages === count}
                      onClick={() => onNumImagesChange(count)}
                      className={cn(
                        "grid size-8 place-items-center rounded-lg border text-[12px] font-semibold transition-colors",
                        numImages === count
                          ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)] text-foreground"
                          : "border-border bg-white text-muted-foreground hover:border-[var(--pf-border-strong)]"
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isVideo && (
              <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
                <label className="text-[12px] text-muted-foreground">Duration</label>
                <div className="flex flex-wrap gap-1.5">
                  {durationOptions.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      aria-pressed={duration === seconds}
                      onClick={() => onDurationChange(seconds)}
                      className={cn(
                        "flex h-8 min-w-12 items-center justify-center gap-1 rounded-lg border px-2 text-[12px] font-semibold transition-colors",
                        duration === seconds
                          ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)] text-foreground"
                          : "border-border bg-white text-muted-foreground hover:border-[var(--pf-border-strong)]"
                      )}
                    >
                      <Clock3 className="size-3" /> {seconds}s
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Collapsible open={advancedOpen} onOpenChange={onAdvancedOpenChange}>
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-between border-t border-border pt-3 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
                />
              }
            >
              Advanced settings
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-150",
                  advancedOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {isImage && (
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                    Negative prompt
                  </span>
                  <Textarea
                    value={negativePrompt}
                    onChange={(event) => onNegativePromptChange(event.target.value)}
                    placeholder="Logos, distorted hands, extra fingers..."
                    className="min-h-20 resize-none rounded-lg border-border bg-card text-[12px] shadow-none"
                  />
                </label>
              )}

              {isImage && model.capabilities.webSearch && (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-[var(--pf-active)] px-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <Search className="size-3.5 text-muted-foreground" />
                    <span>
                      <strong className="block text-[12px] font-semibold text-foreground">
                        Web grounding
                      </strong>
                      <small className="mt-0.5 block text-[12px] text-muted-foreground">
                        Use current context to enrich the prompt
                      </small>
                    </span>
                  </span>
                  <Switch
                    aria-label="Web grounding"
                    checked={enableWebSearch}
                    onCheckedChange={onEnableWebSearchChange}
                  />
                </div>
              )}

              {isVideo &&
                model.capabilities.nativeAudio === true &&
                model.id !== "gemini-omni-flash" && (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-[var(--pf-active)] px-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <Volume2 className="size-3.5 text-muted-foreground" />
                    <span>
                      <strong className="block text-[12px] font-semibold text-foreground">
                        Native audio
                      </strong>
                      <small className="mt-0.5 block text-[12px] text-muted-foreground">
                        Generate ambient sound and dialogue
                      </small>
                    </span>
                  </span>
                  <Switch
                    aria-label="Native audio"
                    checked={enableAudio}
                    onCheckedChange={onEnableAudioChange}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </section>
      )}

      {avatarSection}
      {referenceSection}
      {continuitySection}
      {swapSection}
    </div>
  );
}
