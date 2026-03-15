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
  ArrowRight,
} from "lucide-react";

interface GenerationFormProps {
  models: ModelDefinition[];
}

const CREATIVE_SPARKS = [
  { label: "Cinematic Lighting" },
  { label: "Octane Render" },
  { label: "Bouncy Style" },
  { label: "Hyper Realistic" },
  { label: "Neon Glow" },
  { label: "Soft Focus" },
];

export function GenerationForm({ models }: GenerationFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedModel, setSelectedModel] = useState<string | null>(
    searchParams.get("model") || null
  );
  const [prompt, setPrompt] = useState(searchParams.get("prompt") || "");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [numImages, setNumImages] = useState(1);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [enableAudio, setEnableAudio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
      }
    }
  };

  const estimatedCost = selectedModel
    ? calculateEstimatedCost(selectedModel, {
        numImages: isImage ? numImages : undefined,
        durationSec: isVideo ? model?.defaults.duration : undefined,
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
          duration: model.defaults.duration,
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Prompt */}
        <div className="lg:col-span-7 space-y-6">
          <div className="launch-card bg-card p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <label className="text-[10px] font-bold uppercase tracking-widest">
                Prompt Vision
              </label>
              <span className="text-xs font-bold text-muted-foreground font-mono">
                {prompt.length} / 1000
              </span>
            </div>
            <Textarea
              placeholder="Describe your vision... E.g., 'A whimsical forest where the trees are made of giant bioluminescent mushrooms in a bouncy Pixar style...'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
              maxLength={1000}
              className="min-h-[280px] resize-none bg-muted/50 border border-border focus:border-accent-blue/20 focus:bg-card rounded-lg p-6 text-lg leading-relaxed transition-all duration-150"
            />

            {/* Style Presets */}
            <div className="mt-6">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Style Presets
              </p>
              <div className="flex flex-wrap gap-2">
                {CREATIVE_SPARKS.map((spark) => (
                  <button
                    key={spark.label}
                    className="whitespace-nowrap border border-border bg-muted px-3 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-colors duration-150"
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
        <div className="lg:col-span-5 space-y-6">
          {/* Model Selection */}
          <div className="launch-card bg-card p-6 border border-border">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4">
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
            <div className="launch-card bg-card p-6 border border-border">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-6">
                Parameters
              </h3>

              <div className="space-y-6">
                {/* Aspect Ratio */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Aspect Ratio
                    </label>
                    <span className="text-xs font-bold text-accent-blue font-mono">
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
                            "flex-1 p-2 rounded-md flex flex-col items-center transition-all duration-150 border",
                            active
                              ? "bg-accent-blue/5 border-accent-blue text-accent-blue"
                              : "bg-muted border-border hover:bg-accent-blue/10 hover:border-accent-blue"
                          )}
                        >
                          <div className={cn(shape.w, shape.h, "border-2 border-current rounded-[1px] mb-1")} />
                          <span className="text-[10px] font-bold font-mono">{ratio}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Image-specific: Number of Images */}
                {isImage && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Number of Images
                      </label>
                      <span className="text-sm font-bold font-mono">{numImages}</span>
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

              </div>

              {/* Advanced Settings */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger
                  render={
                    <button className="w-full mt-8 pt-6 border-t border-border flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-accent-blue transition-colors duration-150 group" />
                  }
                >
                  {advancedOpen ? "Hide" : "Show"} Advanced Settings
                  <ChevronDown className={cn("size-4 transition-transform duration-150", advancedOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-6">
                  {/* Negative Prompt */}
                  {isImage && (
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Negative Prompt
                      </label>
                      <Textarea
                        placeholder="What to avoid in the generation..."
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        className="min-h-16 resize-none rounded-md"
                      />
                    </div>
                  )}

                  {/* Web Search */}
                  {isImage && model.capabilities.webSearch && (
                    <div className="flex items-center justify-between rounded-md border p-4">
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
                    <div className="flex items-center justify-between rounded-md border p-4">
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
            <div className="bg-muted rounded-lg p-6 border border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Cost Estimate
              </p>
              <span className="text-2xl font-bold tracking-tight">
                {formatCost(estimatedCost)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Generation Bar */}
      <div className="fixed bottom-0 left-0 md:left-24 right-0 h-20 bg-card/90 backdrop-blur-xl border-t border-border px-6 md:px-12 z-50">
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between gap-4">
          {/* Desktop config summary */}
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-bold uppercase tracking-wider text-[10px]">Current Config</span>
            {model && (
              <>
                <span className="text-border">|</span>
                <span className="font-mono">{model.name}</span>
                <span className="text-border">|</span>
                <span className="font-mono">{aspectRatio}</span>
                {isImage && <><span className="text-border">|</span><span className="font-mono">{numImages} img</span></>}
              </>
            )}
          </div>
          <div className="md:hidden" />
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-accent-coral text-white font-bold px-8 py-3 rounded-md text-sm hover:bg-[#ff6540] transition-all duration-150 h-auto flex items-center gap-3 uppercase tracking-wider"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Forging...
              </>
            ) : (
              <>
                Execute Generation
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
