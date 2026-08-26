"use client";

import { ModelPicker } from "@/components/model-picker";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { GenerateFormFormatSection } from "./form-format-section";
import { GenerateFormPromptSection } from "./form-prompt-section";
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
  const paintReady = useWindowLoadReady();
  const {
    models,
    selectedModel,
    avatarSection,
    referenceSection,
    continuitySection,
    swapSection,
  } = form;
  const { onModelSelect } = actions;
  const { recommendedModelId } = view;

  return (
    <div
      data-generate-controls={paintReady ? undefined : "true"}
      className="flex min-w-0 flex-col gap-3"
    >
      <GenerateFormPromptSection
        form={form}
        actions={actions}
        view={view}
        paintReady={paintReady}
      />

      <section
        data-generate-models={paintReady ? undefined : "true"}
        className="pf-card p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="pf-section-title">Choose a model</h2>
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
          paintReady={paintReady}
        />
      </section>

      <GenerateFormFormatSection form={form} actions={actions} view={view} />

      {avatarSection}
      {referenceSection}
      {continuitySection}
      {swapSection}
    </div>
  );
}
