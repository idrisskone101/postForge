"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ModelPicker } from "@/components/model-picker";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { apiPost } from "@/lib/api/client";
import { calculateEstimatedCost } from "@/lib/ai/models";
import type { ModelDefinition } from "@/lib/ai/types";
import {
  Loader2,
  Search,
  Volume2,
  ChevronDown,
  Zap,
  Info,
  Wand2,
} from "lucide-react";

interface GenerationFormProps {
  models: ModelDefinition[];
}

const CREATIVE_SPARKS = [
  { label: "Cinematic Lighting", color: "blue" as const },
  { label: "Octane Render", color: "green" as const },
  { label: "Bouncy Style", color: "coral" as const },
  { label: "Hyper Realistic", color: "blue" as const },
  { label: "Neon Glow", color: "green" as const },
  { label: "Soft Focus", color: "coral" as const },
];

const SPARK_COLORS = {
  blue: "bg-accent-blue/5 border-accent-blue/10 text-accent-blue hover:bg-accent-blue/10",
  green: "bg-accent-green/5 border-accent-green/10 text-accent-green hover:bg-accent-green/10",
  coral: "bg-accent-coral/5 border-accent-coral/10 text-accent-coral hover:bg-accent-coral/10",
};

export function GenerationForm({ models }: GenerationFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedModel, setSelectedModel] = useState<string | null>(
    searchParams.get("model") || null
  );
  const [prompt, setPrompt] = useState(searchParams.get("prompt") || "");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [numImages, setNumImages] = useState(1);
  const [duration, setDuration] = useState(5);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [enableAudio, setEnableAudio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [genSpeed, setGenSpeed] = useState("balanced");

  const model = models.find((m) => m.id === selectedModel);
  const isImage = model?.type === "image";
  const isVideo = model?.type === "video";

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    const m = models.find((mod) => mod.id === modelId);
    if (m) {
      setAspectRatio(m.defaults.aspectRatio);
      if (m.type === "image") {
        setNumImages(m.defaults.numImages ?? 1);
      } else {
        setDuration(m.defaults.duration ?? 5);
      }
    }
  };

  const estimatedCost = selectedModel
    ? calculateEstimatedCost(selectedModel, {
        numImages: isImage ? numImages : undefined,
        durationSec: isVideo ? duration : undefined,
        enableAudio: enableAudio && selectedModel === "veo3",
      })
    : 0;

  const canSubmit = selectedModel && prompt.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !model) return;
    setIsSubmitting(true);

    try {
      if (isImage) {
        const result = await apiPost<{ id: string }>("/api/generate/images", {
          prompt,
          model: selectedModel,
          aspectRatio,
          numImages,
          negativePrompt: negativePrompt || undefined,
          enableWebSearch,
        });
        router.push(`/generate/${result.id}`);
      } else {
        const result = await apiPost<{ id: string }>("/api/generate/videos", {
          prompt,
          model: selectedModel,
          aspectRatio,
          duration,
          enableAudio: enableAudio && selectedModel === "veo3",
        });
        router.push(`/generate/${result.id}`);
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  const appendToPrompt = (text: string) => {
    setPrompt((prev) => (prev ? `${prev}, ${text}` : text));
  };

  const COMMON_RATIOS = ["9:16", "16:9", "1:1"];
  const availableRatios = model?.limits.aspectRatios ?? COMMON_RATIOS;
  const displayRatios = COMMON_RATIOS.filter((r) =>
    availableRatios.includes(r)
  );

  const ratioLabels: Record<string, string> = {
    "16:9": "Cinema",
    "1:1": "Square",
    "9:16": "Portrait",
  };

  const ratioShapes: Record<string, { w: string; h: string }> = {
    "1:1": { w: "w-4", h: "h-4" },
    "16:9": { w: "w-6", h: "h-4" },
    "9:16": { w: "w-4", h: "h-6" },
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Prompt */}
        <div className="lg:col-span-7 space-y-8">
          <div className="launch-card bg-card p-8 border border-border">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold uppercase tracking-widest">
                Prompt Vision
              </label>
              <span className="text-xs font-bold text-muted-foreground">
                {prompt.length} / 1000 characters
              </span>
            </div>
            <Textarea
              placeholder="Describe your magic... What do you see? E.g., 'A whimsical forest where the trees are made of giant bioluminescent mushrooms in a bouncy Pixar style...'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
              maxLength={1000}
              className="min-h-[280px] resize-none bg-muted border-2 border-transparent focus:border-accent-blue/30 focus:bg-card rounded-3xl p-6 text-lg leading-relaxed transition-all duration-300"
            />

            {/* Creative Sparks */}
            <div className="mt-8">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Creative Sparks
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {CREATIVE_SPARKS.map((spark) => (
                  <button
                    key={spark.label}
                    className={cn(
                      "whitespace-nowrap border px-5 py-2.5 rounded-2xl text-sm font-semibold transition-colors",
                      SPARK_COLORS[spark.color]
                    )}
                    onClick={() => appendToPrompt(spark.label)}
                  >
                    {spark.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-5 space-y-8">
          {/* Model Selection */}
          <div className="launch-card bg-card p-8 border border-border">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6">
              Select Engine
            </h3>
            <ModelPicker
              selectedModel={selectedModel}
              onModelSelect={handleModelSelect}
              models={models}
            />
          </div>

          {/* Parameters */}
          {model && (
            <div className="launch-card bg-card p-8 border border-border">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-8">
                Parameters
              </h3>

              <div className="space-y-8">
                {/* Aspect Ratio */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Aspect Ratio
                    </label>
                    <span className="text-xs font-bold text-accent-blue">
                      {aspectRatio} {ratioLabels[aspectRatio] ?? ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {displayRatios.map((ratio) => {
                      const shape = ratioShapes[ratio] ?? { w: "w-4", h: "h-4" };
                      const active = aspectRatio === ratio;
                      return (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={cn(
                            "flex-1 p-3 rounded-2xl flex flex-col items-center transition-all border",
                            active
                              ? "bg-accent-blue/5 border-accent-blue text-accent-blue"
                              : "bg-muted border-border hover:bg-accent-blue/10 hover:border-accent-blue"
                          )}
                        >
                          <div className={cn(shape.w, shape.h, "border-2 border-current rounded-sm mb-1")} />
                          <span className="text-[10px] font-bold">{ratio}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Image-specific: Number of Images */}
                {isImage && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Number of Images
                      </label>
                      <span className="text-sm font-bold">{numImages}</span>
                    </div>
                    <Slider
                      value={[numImages]}
                      onValueChange={(val) => setNumImages(Array.isArray(val) ? val[0] : val)}
                      min={1}
                      max={model.limits.maxImages ?? 4}
                      step={1}
                    />
                  </div>
                )}

                {/* Video-specific: Duration */}
                {isVideo && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Duration
                      </label>
                      <span className="text-sm font-bold">{duration}s</span>
                    </div>
                    <Slider
                      value={[duration]}
                      onValueChange={(val) => setDuration(Array.isArray(val) ? val[0] : val)}
                      min={model.defaults.duration ?? 2}
                      max={model.limits.maxDuration ?? 15}
                      step={1}
                    />
                  </div>
                )}

                {/* Guidance Scale */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Guidance Scale
                      </label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="size-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>Visual control only - does not affect API</TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-sm font-bold">{guidanceScale}</span>
                  </div>
                  <Slider
                    value={[guidanceScale]}
                    onValueChange={(val) => setGuidanceScale(Array.isArray(val) ? val[0] : val)}
                    min={1}
                    max={15}
                    step={0.5}
                  />
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase px-1">
                    <span>Organic</span>
                    <span>Chaos</span>
                  </div>
                </div>

                {/* Generation Speed */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Generation Speed
                    </label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="size-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>Visual control only - does not affect API</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex bg-muted p-1.5 rounded-3xl border border-border">
                    {["turbo", "balanced", "premium"].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setGenSpeed(speed)}
                        className={cn(
                          "flex-1 py-3 text-xs font-bold rounded-[18px] transition-all capitalize",
                          genSpeed === speed
                            ? "bg-card shadow-sm"
                            : "hover:bg-card/50"
                        )}
                      >
                        {speed === "turbo" && <Zap className="size-3 inline mr-1" />}
                        {speed}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger
                  render={
                    <button className="w-full mt-10 pt-6 border-t border-border flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest hover:text-accent-blue transition-colors group" />
                  }
                >
                  {advancedOpen ? "Hide" : "Show"} Advanced Settings
                  <ChevronDown className={cn("size-4 transition-transform group-hover:translate-y-0.5", advancedOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-6">
                  {/* Negative Prompt */}
                  {isImage && (
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Negative Prompt
                      </label>
                      <Textarea
                        placeholder="What to avoid in the generation..."
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        className="min-h-16 resize-none rounded-2xl"
                      />
                    </div>
                  )}

                  {/* Web Search */}
                  {isImage && model.capabilities.webSearch && (
                    <div className="flex items-center justify-between rounded-2xl border p-4">
                      <div className="flex items-center gap-3">
                        <Search className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Web Search</p>
                          <p className="text-xs text-muted-foreground">
                            Enhance prompt with web results
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={enableWebSearch}
                        onCheckedChange={setEnableWebSearch}
                      />
                    </div>
                  )}

                  {/* Audio (veo3) */}
                  {isVideo && model.id === "veo3" && (
                    <div className="flex items-center justify-between rounded-2xl border p-4">
                      <div className="flex items-center gap-3">
                        <Volume2 className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Native Audio</p>
                          <p className="text-xs text-muted-foreground">
                            Doubles cost per second
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={enableAudio}
                        onCheckedChange={setEnableAudio}
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Cost Preview */}
          {selectedModel && (
            <div className="bg-accent-blue rounded-[32px] p-8 text-white shadow-[0_20px_40px_rgba(79,159,217,0.3)] relative overflow-hidden">
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-xl" />
              <div className="relative z-10 flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                    Baking Estimate
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {formatCost(estimatedCost)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                    Completion
                  </p>
                  <p className="font-bold">
                    {genSpeed === "turbo" ? "~30s" : genSpeed === "premium" ? "~2-5min" : "~1-2min"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Generation Bar */}
      <div className="fixed bottom-0 left-0 md:left-24 right-0 h-24 bg-card/90 backdrop-blur-xl border-t border-border px-6 md:px-12 z-50">
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-end gap-4">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-accent-coral text-white font-extrabold px-12 py-4 rounded-full text-lg shadow-[0_8px_24px_rgba(255,122,89,0.3)] hover:scale-105 hover:bg-[#ff6540] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] h-auto flex items-center gap-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Forging...
              </>
            ) : (
              <>
                Launch Generation
                <Wand2 className="size-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
