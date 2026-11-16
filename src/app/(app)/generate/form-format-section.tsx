"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, Icon, Segmented, Toggle } from "@/components/workbench";
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
  const { aspectRatio, numImages, duration = 5, advancedOpen } = form;
  const { onAspectRatioChange, onNumImagesChange, onDurationChange = () => {} } = actions;
  const { model, isImage, isVideo, availableRatios, outputOptions, durationOptions } = view;

  if (!model) return null;

  const hasWebSearch = isImage && model.capabilities.webSearch === true;
  const hasAudio =
    isVideo && model.capabilities.nativeAudio === true && !model.id.startsWith("gemini-omni-flash");
  const hasAdvanced = isImage || hasAudio;

  return (
    <Collapsible
      key={model.id}
      open={advancedOpen}
      onOpenChange={actions.onAdvancedOpenChange}
      render={<section className="wb-panel gap-3 p-5" />}
    >
      <div className="flex h-7 items-center gap-2.5">
        <h2 className="wb-panel-title flex-1">Format and output</h2>
        {hasAdvanced ? (
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="wb-btn wb-btn-32 gap-1 pl-3.5 pr-2.5 text-[13px]"
              />
            }
          >
            Advanced settings
            <Icon
              name="chevron-down"
              size={16}
              className={cn(
                "text-fg-secondary transition-transform duration-200 ease-pf",
                advancedOpen && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-3">
        {/* An image-to-video model takes its shape from the start image, so it offers no ratio. */}
        {availableRatios.length ? (
        <div className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-1.5">
          <span id="generate-ratio-label" className="wb-label">
            Aspect ratio
          </span>
          <div role="group" aria-labelledby="generate-ratio-label" className="flex gap-1.5">
            {availableRatios.map((ratio) => (
              <button
                key={ratio}
                type="button"
                aria-pressed={aspectRatio === ratio}
                aria-label={`${ratio} ${RATIO_LABELS[ratio] ?? ""}`.trim()}
                onClick={() => onAspectRatioChange(ratio)}
                className="flex h-[52px] min-w-0 max-w-[140px] flex-1 flex-col items-center justify-center gap-[5px] rounded-lg bg-raised text-fg-secondary transition-[background-color,box-shadow,color,transform] duration-160 ease-pf hover:bg-raised-strong active:scale-[0.98] aria-pressed:bg-ember-wash aria-pressed:text-ember-text aria-pressed:shadow-[inset_0_0_0_2px_var(--pf-ember)]"
              >
                <RatioIcon ratio={ratio} />
                <span className="wb-mono text-current">{ratio}</span>
              </button>
            ))}
          </div>
        </div>
        ) : null}

        {isImage ? (
          <div className="flex shrink-0 flex-col gap-1.5">
            <span className="wb-label">Outputs</span>
            <div className="flex h-[52px] items-center">
              <Segmented
                label="Outputs"
                className="h-10 gap-0 [&>button]:h-[34px]"
                value={String(numImages)}
                onChange={(value) => onNumImagesChange(Number(value))}
                options={outputOptions.map((count) => ({
                  value: String(count),
                  label: String(count),
                  ariaLabel: `${count} output${count === 1 ? "" : "s"}`,
                }))}
              />
            </div>
          </div>
        ) : null}

        {isVideo && durationOptions.length > 0 ? (
          <div className="flex shrink-0 flex-col gap-1.5">
            <span className="wb-label">Duration</span>
            <div className="flex h-[52px] items-center">
              <Segmented
                label="Duration"
                className="h-10 gap-0 [&>button]:h-[34px]"
                value={String(duration)}
                onChange={(value) => onDurationChange(Number(value))}
                options={durationOptions.map((seconds) => ({
                  value: String(seconds),
                  label: `${seconds}s`,
                }))}
              />
            </div>
          </div>
        ) : null}
      </div>

      {hasAdvanced ? (
        <CollapsibleContent className="flex flex-col gap-3">
          {isImage ? (
            <Field label="Negative prompt" htmlFor="generate-negative-prompt">
              <textarea
                id="generate-negative-prompt"
                value={form.negativePrompt}
                onChange={(event) => actions.onNegativePromptChange(event.target.value)}
                placeholder="Logos, distorted hands, extra fingers"
                className="wb-input min-h-20 resize-y py-2.5"
              />
            </Field>
          ) : null}
          {hasWebSearch ? (
            <ToggleRow
              label="Web grounding"
              checked={form.enableWebSearch}
              onChange={actions.onEnableWebSearchChange}
            />
          ) : null}
          {hasAudio ? (
            <ToggleRow
              label="Native audio"
              checked={form.enableAudio}
              onChange={actions.onEnableAudioChange}
            />
          ) : null}
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-[14px] font-semibold leading-5 text-fg">{label}</span>
      <Toggle checked={checked} onCheckedChange={onChange} label={label} />
    </div>
  );
}
