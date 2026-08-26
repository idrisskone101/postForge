"use client";

import { ChevronDown, Clock3, Search, Volume2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { RATIO_LABELS } from "./form-constants";
import { RatioIcon } from "./form-ratio-icon";
import type { GenerateFormActions, GenerateFormModel } from "./form-types";
import type { GenerateFormViewModel } from "./form-view-model";

export function GenerateFormFormatSection({
  form,
  actions,
  view,
}: {
  form: GenerateFormModel;
  actions: GenerateFormActions;
  view: GenerateFormViewModel;
}) {
  const {
    aspectRatio,
    numImages,
    duration = 5,
    negativePrompt,
    enableWebSearch,
    enableAudio,
    advancedOpen,
  } = form;
  const {
    onAspectRatioChange,
    onNumImagesChange,
    onDurationChange = () => {},
    onNegativePromptChange,
    onEnableWebSearchChange,
    onEnableAudioChange,
    onAdvancedOpenChange,
  } = actions;
  const {
    model,
    isImage,
    isVideo,
    availableRatios,
    outputOptions,
    durationOptions,
  } = view;

  if (!model) return null;

  return (
    <section key={model.id} className="pf-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="pf-section-title">Format and output</h2>
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
                    : "border-border bg-[var(--pf-surface)] text-muted-foreground hover:border-[var(--pf-border-strong)]"
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
                      : "border-border bg-[var(--pf-surface)] text-muted-foreground hover:border-[var(--pf-border-strong)]"
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
                      : "border-border bg-[var(--pf-surface)] text-muted-foreground hover:border-[var(--pf-border-strong)]"
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
  );
}
