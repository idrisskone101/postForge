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

const MODEL_ICON_MAP: Record<
  string,
  {
    icon: ComponentType<{ className?: string; strokeWidth?: number }>;
    accent: string;
  }
> = {
  "nano-banana-2": { icon: Zap, accent: "from-[#FFB49F] to-[#FF4A20]" },
  "nano-banana-pro": { icon: Palette, accent: "from-[#B9EEE4] to-[#22A887]" },
  "nano-banana": { icon: Sparkles, accent: "from-[#E2D3FF] to-[#8B5CF6]" },
  "kling-3.0": { icon: Film, accent: "from-[#B7DDFF] to-[#378EFF]" },
  "kling-3.0-pro": { icon: Film, accent: "from-[#B9EEE4] to-[#22A887]" },
  "kling-3.0-i2v": { icon: Layers, accent: "from-[#FFB49F] to-[#FF4A20]" },
  veo3: { icon: Video, accent: "from-[#B7DDFF] to-[#378EFF]" },
  "veo3-fast": { icon: Zap, accent: "from-[#FFB49F] to-[#FF4A20]" },
  "veo3.1": { icon: Video, accent: "from-[#B9EEE4] to-[#22A887]" },
  "seedance-2.0": { icon: Film, accent: "from-[#E2D3FF] to-[#8B5CF6]" },
  "gemini-omni-flash": { icon: Sparkles, accent: "from-[#B7DDFF] to-[#378EFF]" },
  "minimax-h3": { icon: Film, accent: "from-[#FFB49F] to-[#FF4A20]" },
  "pixverse-swap": { icon: Layers, accent: "from-[#B9EEE4] to-[#22A887]" },
  "gemini-omni-edit": { icon: Video, accent: "from-[#E2D3FF] to-[#8B5CF6]" },
  "gpt-image-2": { icon: ImageIcon, accent: "from-[#B7DDFF] to-[#378EFF]" },
  "seedream-5.0-pro": { icon: ImageIcon, accent: "from-[#FFB49F] to-[#FF4A20]" },
  "flux-2-flex": { icon: Palette, accent: "from-[#E2D3FF] to-[#8B5CF6]" },
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
  const iconConfig = MODEL_ICON_MAP[model.id] ?? {
    icon: Sparkles,
    accent: "from-[#B7DDFF] to-[#378EFF]",
  };
  const Icon = iconConfig.icon;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "group relative min-w-0 rounded-[9px] border bg-white p-2.5 text-left shadow-[var(--pf-shadow-2xs)] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98]",
        selected
          ? "border-[#FF4A20] shadow-[0_0_0_2px_rgba(255,74,32,0.09),var(--pf-shadow-sm)]"
          : "border-[#DEDFD8] hover:-translate-y-px hover:border-[#BFC0B9] hover:bg-[#FCFCFA] hover:shadow-[var(--pf-shadow-xs)]"
      )}
    >
      {recommended && (
        <span className="absolute -top-2 left-2.5 rounded-md bg-[#22C55E] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          Recommended
        </span>
      )}
      <span className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white",
            iconConfig.accent
          )}
        >
          <Icon className="size-4" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <strong className="block truncate text-[11px] font-semibold text-[#30312E]">
              {model.name}
            </strong>
            {selected ? (
              <Check className="mt-0.5 size-3.5 shrink-0 text-[#FF4A20]" />
            ) : (
              <Circle className="mt-0.5 size-3.5 shrink-0 text-[#C5C6BF]" />
            )}
          </span>
          <span className="mt-1 block truncate text-[10px] text-[#91928E]">
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
              className="inline-flex items-center gap-1 rounded-md bg-[#F1F2EC] px-1.5 py-1 text-[10px] font-medium text-[#72736F]"
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
        className="grid grid-cols-2 rounded-[11px] bg-[#E8E9E2] p-1"
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
                  ? "bg-white text-[#232323] shadow-[0_1px_4px_rgba(36,37,32,0.07)]"
                  : "text-[#777873] hover:text-[#3F403C]"
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
        className="mt-3 grid animate-content-enter grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3"
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
        <div className="mt-3 rounded-[9px] border border-dashed border-[#DADBD2] px-4 py-8 text-center text-[11px] text-[#868686]">
          No {activeType} models are configured.
        </div>
      )}
    </div>
  );
}
