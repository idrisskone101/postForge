"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  Check,
  Circle,
  Film,
  Globe,
  ImageIcon,
  Layers,
  Palette,
  Sparkles,
  UserRound,
  Video,
  Volume2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [requestedType, setRequestedType] = useState<"image" | "video">(
    selected?.type ?? "image"
  );
  const activeType = selected?.type ?? requestedType;

  const visibleModels = models.filter((model) => model.type === activeType);

  const selectType = (type: "image" | "video") => {
    setRequestedType(type);
    if (selected?.type !== type) {
      const firstModel = models.find((model) => model.type === type);
      if (firstModel) onModelSelect(firstModel.id);
    }
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Generation type"
        className="grid grid-cols-2 rounded-[6px] bg-[var(--pf-active)] p-1"
      >
        {(["image", "video"] as const).map((type) => {
          const active = activeType === type;
          const Icon = type === "image" ? ImageIcon : Video;
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectType(type)}
              className={cn(
                "flex h-9 items-center justify-center gap-2 rounded-lg text-[12px] font-semibold capitalize transition-all duration-150",
                active
                  ? "bg-white text-foreground shadow-[var(--pf-shadow-2xs)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {type}
            </button>
          );
        })}
      </div>

      <div
        key={activeType}
        data-generate-model-grid="true"
        className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {visibleModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            selected={selectedModel === model.id}
            recommended={recommendedModelId === model.id}
            onClick={() => onModelSelect(model.id)}
          />
        ))}
      </div>

      {visibleModels.length === 0 && (
        <div className="mt-3 rounded-lg border border-dashed border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
          No {activeType} models are configured.
        </div>
      )}
    </div>
  );
}


const MODEL_ICON_MAP: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "nano-banana-2": Zap,
  "nano-banana-pro": Palette,
  "nano-banana": Sparkles,
  "kling-3.0": Film,
  "kling-3.0-pro": Film,
  "kling-3.0-i2v": Layers,
  veo3: Video,
  "veo3-fast": Zap,
  "veo3.1": Video,
  "seedance-2.0": Film,
  "gemini-omni-flash": Sparkles,
  "minimax-h3": Film,
  "pixverse-swap": Layers,
  "gemini-omni-edit": Video,
  "gpt-image-2": ImageIcon,
  "seedream-5.0-pro": ImageIcon,
  "flux-2-flex": Palette,
};

function capabilityItems(model: ModelDefinition): Array<{
  icon: ReactNode;
  label: string;
}> {
  const items: Array<{ icon: ReactNode; label: string }> = [];
  const capabilities = model.capabilities;

  if (capabilities.textToImage) {
    items.push({ icon: <ImageIcon className="size-3" />, label: "Text to image" });
  }
  if (capabilities.textToVideo) {
    items.push({ icon: <Video className="size-3" />, label: "Text to video" });
  }
  if (capabilities.imageToVideo) {
    items.push({ icon: <Layers className="size-3" />, label: "Image to video" });
  }
  if (capabilities.characterReference) {
    items.push({ icon: <UserRound className="size-3" />, label: "Character identity" });
  }
  if (capabilities.nativeAudio) {
    items.push({ icon: <Volume2 className="size-3" />, label: "Native audio" });
  }
  if (capabilities.webSearch) {
    items.push({ icon: <Globe className="size-3" />, label: "Web grounding" });
  }

  return items;
}

function ModelCard({
  model,
  selected,
  recommended,
  onClick,
}: {
  model: ModelDefinition;
  selected: boolean;
  recommended: boolean;
  onClick: () => void;
}) {
  const priceLabel =
    model.pricing.unit === "per_image"
      ? `${formatCost(model.pricing.amount)}/image`
      : model.pricing.unit === "per_clip"
        ? `${formatCost(model.pricing.amount)}/clip`
        : `${formatCost(model.pricing.amount)}/second`;
  const capabilityList = capabilityItems(model);
  const Icon = MODEL_ICON_MAP[model.id] ?? Sparkles;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{ height: "8.125rem" }}
      className={cn(
        "group relative h-[8.125rem] min-w-0 overflow-hidden rounded-lg border bg-card p-2.5 text-left shadow-[var(--pf-shadow-2xs)] transition-colors duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98]",
        selected
          ? "border-[var(--pf-orange)] ring-1 ring-[var(--pf-orange)]/25 shadow-[var(--pf-shadow-2xs)]"
          : "border-border hover:border-[var(--pf-border-strong)] hover:shadow-[var(--pf-shadow-2xs)]"
      )}
    >
      {recommended && (
        <span className="mb-2 inline-flex w-fit rounded-full border border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-success)]">
          Recommended
        </span>
      )}
      <span className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            selected
              ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
              : "bg-[var(--pf-active)] text-muted-foreground"
          )}
        >
          <Icon className="size-4" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <strong className="min-w-0 text-[13px] font-semibold leading-[1.25] text-foreground line-clamp-2">
              {model.name}
            </strong>
            {selected ? (
              <Check className="size-3.5 shrink-0 text-[var(--pf-orange)]" />
            ) : (
              <Circle className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </span>
          <span className="mt-1 block truncate text-[12px] text-muted-foreground">
            {priceLabel}
          </span>
        </span>
      </span>
      {capabilityList.length > 0 && (
        <span className="mt-2 flex flex-wrap gap-1" aria-label="Model capabilities">
          {capabilityList.map((item) => (
            <span
              key={item.label}
              title={item.label}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--pf-active)] px-1.5 py-1 text-[12px] font-medium text-muted-foreground"
            >
              {item.icon}
              {item.label}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}