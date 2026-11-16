import { Field, Panel, Toggle } from "@/components/workbench";
import { formatCost } from "@/lib/utils/format-cost";
import { calculateEstimatedCost } from "@/lib/ai/models";
import { CloneModelSelect } from "@/components/clone/model-select";
import type { CloneActionModel, CloneModelSelectModel } from "@/components/clone/view-models";

export function CloneActionBar({
  action,
}: {
  action: CloneActionModel;
}) {
  const {
    cloneVideoModels,
    referenceImageModels,
    selectedModel,
    selectedReferenceImageModel,
    keepOriginalSound,
    removeTextOverlays,
    durationSec,
    referenceBatchSize,
    textErasureCost,
    onSelectModel,
    onSelectReferenceImageModel,
    onToggleSound,
    onToggleTextOverlays,
  } = action;

  const videoSelect: CloneModelSelectModel = {
    label: "Video model",
    description: "Video model",
    accentClassName: "",
    models: cloneVideoModels,
    selectedValue: selectedModel,
    onValueChange: onSelectModel,
    getCost: (modelId) => formatCost(calculateEstimatedCost(modelId, { durationSec })),
  };
  const referenceSelect: CloneModelSelectModel = {
    label: "Image model",
    description: "Image model",
    accentClassName: "",
    models: referenceImageModels,
    selectedValue: selectedReferenceImageModel,
    onValueChange: onSelectReferenceImageModel,
    getCost: (modelId) =>
      formatCost(calculateEstimatedCost(modelId, { numImages: referenceBatchSize })),
  };

  return (
    <Panel
      pad="wide"
      data-clone-primary-action-bar="true"
      data-clone-generation-settings-bar="true"
      className="pb-[22px]"
    >
      <h2 className="wb-panel-title">Generation settings</h2>
      {/* Beside two fields the toggles leave each field too narrow for its value from 768 to 1023 and from 1280 to 1399, so there they take their own row. */}
      <div className="flex min-w-0 items-end gap-3 max-md:flex-col max-md:items-stretch md:max-lg:flex-wrap xl:max-[1399px]:flex-wrap">
        <Field label={videoSelect.label} className="min-w-0 flex-1">
          <CloneModelSelect model={videoSelect} />
        </Field>
        <Field label={referenceSelect.label} className="min-w-0 flex-1">
          <CloneModelSelect model={referenceSelect} />
        </Field>
        <div className="flex shrink-0 flex-col gap-2.5 pl-3 max-md:pl-0 max-md:pt-1 md:max-lg:basis-full md:max-lg:flex-row md:max-lg:gap-6 md:max-lg:pl-0 md:max-lg:pt-1 xl:max-[1399px]:basis-full xl:max-[1399px]:flex-row xl:max-[1399px]:gap-6 xl:max-[1399px]:pl-0 xl:max-[1399px]:pt-1">
          <div className="flex items-center gap-2.5">
            <Toggle
              size={26}
              checked={keepOriginalSound}
              onCheckedChange={onToggleSound}
              label="Keep original sound"
            />
            <span aria-hidden="true" className={TOGGLE_LABEL}>
              Keep original sound
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Toggle
              size={26}
              checked={removeTextOverlays}
              onCheckedChange={onToggleTextOverlays}
              label="Remove on-screen text"
            />
            <span aria-hidden="true" className={TOGGLE_LABEL}>
              Remove on-screen text
            </span>
            {removeTextOverlays && (
              <span className="wb-mono text-fg-secondary">+{formatCost(textErasureCost)}</span>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

const TOGGLE_LABEL = "text-[14px] font-medium leading-[18px] text-fg";
