"use client";

import { useState } from "react";
import { Segmented } from "@/components/workbench";
import { formatCost } from "@/lib/utils/format-cost";
import type { ModelDefinition } from "@/lib/ai/types";

interface ModelPickerProps {
  selectedModel: string | null;
  onModelSelect: (modelId: string) => void;
  models: ModelDefinition[];
  recommendedModelId?: string;
}

export function ModelPicker({
  selectedModel,
  onModelSelect,
  models,
  recommendedModelId,
}: ModelPickerProps) {
  const selected = models.find((model) => model.id === selectedModel);
  const [requestedMode, setRequestedMode] = useState<ModelMode>(
    () => (selected ? modesOf(selected)[0] : "image")
  );
  const selectedModes = selected ? modesOf(selected) : [];
  const activeMode =
    selectedModes.length === 0 || selectedModes.includes(requestedMode)
      ? requestedMode
      : selectedModes[0];
  const options = MODES.filter((mode) =>
    models.some((model) => modesOf(model).includes(mode.value))
  );
  const visibleModels = models.filter((model) => modesOf(model).includes(activeMode));

  const selectMode = (mode: ModelMode) => {
    setRequestedMode(mode);
    if (selected && modesOf(selected).includes(mode)) return;
    const first = models.find((model) => modesOf(model).includes(mode));
    if (first) onModelSelect(first.id);
  };

  return (
    <>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-2.5 gap-y-2">
        <h2 className="wb-panel-title">Choose a model</h2>
        <div className="max-w-full max-sm:w-full">
          <Segmented
            label="Generation type"
            className="gap-0 max-sm:grid max-sm:h-auto max-sm:w-full max-sm:grid-cols-2 max-sm:rounded-[20px] max-sm:[&>button]:h-[30px] max-sm:[&>button]:justify-center"
            options={options}
            value={activeMode}
            onChange={selectMode}
          />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {visibleModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            selected={selectedModel === model.id}
            recommended={recommendedModelId === model.id}
            onSelect={onModelSelect}
          />
        ))}
      </div>
    </>
  );
}

type ModelMode = "image" | "text-video" | "image-video" | "swap";

const MODES: { value: ModelMode; label: string }[] = [
  { value: "image", label: "Text to image" },
  { value: "text-video", label: "Text to video" },
  { value: "image-video", label: "Image to video" },
  { value: "swap", label: "Subject swap" },
];

/** Every model lands in at least one mode, so no configured model can drop out of the picker. */
function modesOf(model: ModelDefinition): ModelMode[] {
  if (model.type === "image") return ["image"];
  const { capabilities } = model;
  if (capabilities.subjectSwap) return ["swap"];
  const modes: ModelMode[] = [];
  if (capabilities.textToVideo) modes.push("text-video");
  if (capabilities.imageToVideo) modes.push("image-video");
  return modes.length > 0 ? modes : ["text-video"];
}

function priceLabel(model: ModelDefinition) {
  const unit =
    model.pricing.unit === "per_image"
      ? "image"
      : model.pricing.unit === "per_clip"
        ? "clip"
        : "second";
  return `${formatCost(model.pricing.amount)} / ${unit}`;
}

function capabilityLine(model: ModelDefinition) {
  const { capabilities } = model;
  const parts: string[] = [];
  if (capabilities.characterReference || capabilities.referenceImages) {
    parts.push("Character identity");
  }
  if (capabilities.nativeAudio) parts.push("Native audio");
  if (capabilities.webSearch) parts.push("Web grounding");
  if (capabilities.keepOriginalAudio) parts.push("Keeps audio");
  return parts.slice(0, 2).join(", ");
}

function ModelCard({
  model,
  selected,
  recommended,
  onSelect,
}: {
  model: ModelDefinition;
  selected: boolean;
  recommended: boolean;
  onSelect: (modelId: string) => void;
}) {
  const line = recommended ? "Recommended" : capabilityLine(model);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(model.id)}
      className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-raised px-3.5 py-3 text-left transition-[background-color,box-shadow,transform] duration-160 ease-pf hover:bg-raised-strong active:scale-[0.98] aria-pressed:shadow-[inset_0_0_0_2px_var(--pf-ember)] aria-pressed:hover:bg-raised"
    >
      <span
        className={
          selected
            ? "text-[14px] font-bold leading-5 text-fg"
            : "text-[14px] font-semibold leading-5 text-fg"
        }
      >
        {model.name}
      </span>
      <span
        className={
          recommended
            ? "line-clamp-2 min-h-8 text-[12px] font-semibold leading-4 text-fg-secondary"
            : "line-clamp-2 min-h-8 text-[12px] leading-4 text-fg-muted"
        }
      >
        {line}
      </span>
      <span className="wb-mono mt-auto pt-1 text-fg-secondary">{priceLabel(model)}</span>
    </button>
  );
}
