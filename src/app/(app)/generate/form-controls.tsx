"use client";

import { ModelPicker } from "@/components/model-picker";
import { Panel } from "@/components/workbench";
import { GENERATE_LAYOUT } from "./form-constants";
import { GenerateFormFormatSection } from "./form-format-section";
import { GenerateFormPromptSection } from "./form-prompt-section";
import { PhoneCompositeSection } from "./phone-composite/phone-composite-section";
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
  const { avatarSection, referenceSection, continuitySection, swapSection } = form;
  const hasReferences = Boolean(avatarSection || referenceSection || (view.isVideo && continuitySection));

  return (
    <div className={GENERATE_LAYOUT.controls}>
      <Panel pad="roomy" className="gap-3 p-5">
        <ModelPicker
          selectedModel={form.selectedModel}
          onModelSelect={actions.onModelSelect}
          models={form.models}
          recommendedModelId={view.recommendedModelId}
        />
      </Panel>

      <GenerateFormPromptSection form={form} actions={actions} view={view} />

      {view.isSwap ? swapSection : null}

      {hasReferences && !view.isSwap ? (
        <Panel title="References" className="gap-3 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            {avatarSection}
            {referenceSection}
            {continuitySection}
          </div>
        </Panel>
      ) : null}

      <GenerateFormFormatSection form={form} actions={actions} view={view} />

      {view.isImage ? (
        <PhoneCompositeSection onUseScenePrompt={actions.onPromptChange} />
      ) : null}
    </div>
  );
}
