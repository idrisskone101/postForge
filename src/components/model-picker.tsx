"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import type { ModelDefinition } from "@/lib/ai/types";
import { ImageIcon, Video, Globe, Volume2, Layers, Zap, Palette, Film, Sparkles } from "lucide-react";

interface ModelPickerProps {
  selectedModel: string | null;
  onModelSelect: (modelId: string) => void;
  models: ModelDefinition[];
}

const MODEL_ICON_MAP: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  "nano-banana-2": { icon: Zap, color: "bg-accent-blue" },
  "nano-banana-pro": { icon: Palette, color: "bg-accent-green" },
  "nano-banana": { icon: Sparkles, color: "bg-accent-coral" },
  "kling-3.0": { icon: Film, color: "bg-accent-blue" },
  "kling-3.0-pro": { icon: Film, color: "bg-accent-green" },
  "kling-3.0-i2v": { icon: Layers, color: "bg-accent-coral" },
  "veo3": { icon: Video, color: "bg-accent-blue" },
  "veo3-fast": { icon: Zap, color: "bg-accent-coral" },
};

function capabilityIcons(model: ModelDefinition) {
  const icons: Array<{ icon: React.ReactNode; label: string }> = [];
  const caps = model.capabilities;
  if (caps.textToImage) icons.push({ icon: <ImageIcon className="size-3" />, label: "Text to Image" });
  if (caps.textToVideo) icons.push({ icon: <Video className="size-3" />, label: "Text to Video" });
  if (caps.imageToVideo) icons.push({ icon: <Layers className="size-3" />, label: "Image to Video" });
  if (caps.nativeAudio) icons.push({ icon: <Volume2 className="size-3" />, label: "Native Audio" });
  if (caps.webSearch) icons.push({ icon: <Globe className="size-3" />, label: "Web Search" });
  return icons;
}

function ModelCard({
  model,
  selected,
  onClick,
}: {
  model: ModelDefinition;
  selected: boolean;
  onClick: () => void;
}) {
  const priceLabel =
    model.pricing.unit === "per_image"
      ? `${formatCost(model.pricing.amount)}/img`
      : `${formatCost(model.pricing.amount)}/s`;

  const icons = capabilityIcons(model);
  const iconConfig = MODEL_ICON_MAP[model.id] ?? { icon: Sparkles, color: "bg-accent-blue" };
  const IconComponent = iconConfig.icon;

  return (
    <div
      className={cn(
        "relative p-4 rounded-3xl border-2 cursor-pointer group transition-all duration-300",
        selected
          ? "border-accent-blue bg-accent-blue/5"
          : "border-border hover:border-accent-blue/30 hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={cn("w-8 h-8 rounded-lg text-white flex items-center justify-center", iconConfig.color)}>
          <IconComponent className="size-[18px]" />
        </div>
        {selected && (
          <span className="text-[10px] font-extrabold uppercase bg-accent-blue text-white px-2 py-0.5 rounded-full">
            Active
          </span>
        )}
      </div>
      <p className="font-bold text-sm">{model.name}</p>
      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">
        {priceLabel}
      </p>
      {icons.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2">
          {icons.map((item, i) => (
            <Tooltip key={i}>
              <TooltipTrigger className="text-muted-foreground">
                {item.icon}
              </TooltipTrigger>
              <TooltipContent>{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}

export function ModelPicker({
  selectedModel,
  onModelSelect,
  models,
}: ModelPickerProps) {
  const imageModels = models.filter((m) => m.type === "image");
  const videoModels = models.filter((m) => m.type === "video");

  return (
    <Tabs defaultValue="image">
      <TabsList>
        <TabsTrigger value="image" className="gap-1.5">
          <ImageIcon className="size-3.5" />
          Image
        </TabsTrigger>
        <TabsTrigger value="video" className="gap-1.5">
          <Video className="size-3.5" />
          Video
        </TabsTrigger>
      </TabsList>

      <TabsContent value="image">
        <div className="grid grid-cols-2 gap-4 mt-4">
          {imageModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              selected={selectedModel === model.id}
              onClick={() => onModelSelect(model.id)}
            />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="video">
        <div className="grid grid-cols-2 gap-4 mt-4">
          {videoModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              selected={selectedModel === model.id}
              onClick={() => onModelSelect(model.id)}
            />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
