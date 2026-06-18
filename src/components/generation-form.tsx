"use client";

import { useState, useEffect, type ReactNode } from "react";
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
import { AvatarPicker } from "@/components/avatar-picker";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { apiGet, apiPost } from "@/lib/api/client";
import { calculateEstimatedCost } from "@/lib/ai/models";
import type { ModelDefinition } from "@/lib/ai/types";
import {
  Loader2,
  Search,
  Volume2,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react";
import {
  FloatingToolbar,
  ToolbarHeading,
  ToolbarDivider,
  ToolbarLabel,
} from "@/components/floating-toolbar";
import { WorkspaceState } from "@/components/workspace-state";

interface GenerationFormProps {
  models: ModelDefinition[];
}

interface AvatarIdentityPackSummary {
  id: string;
  avatarId: string;
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  images: { id: string }[];
}

function describeIdentityStatus(
  pack: AvatarIdentityPackSummary | null
): { label: string; tone: "ready" | "working" | "failed" } {
  if (!pack) {
    return {
      label: "Using the original avatar image while identity references prepare.",
      tone: "working",
    };
  }
  if (pack.status === "completed") {
    return {
      label: `${pack.images.length} identity references ready.`,
      tone: "ready",
    };
  }
  if (pack.status === "failed") {
    return {
      label: "Identity prep failed; the original avatar image will be used.",
      tone: "failed",
    };
  }
  return {
    label: "Preparing identity references; the original avatar is usable now.",
    tone: "working",
  };
}

interface GenerateFormViewProps {
  models: ModelDefinition[];
  selectedModel: string | null;
  prompt: string;
  aspectRatio: string;
  numImages: number;
  negativePrompt: string;
  enableWebSearch: boolean;
  enableAudio: boolean;
  isSubmitting: boolean;
  advancedOpen: boolean;
  onModelSelect: (modelId: string) => void;
  onPromptChange: (prompt: string) => void;
  onAspectRatioChange: (ratio: string) => void;
  onNumImagesChange: (numImages: number) => void;
  onNegativePromptChange: (prompt: string) => void;
  onEnableWebSearchChange: (enabled: boolean) => void;
  onEnableAudioChange: (enabled: boolean) => void;
  onAdvancedOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onAppendToPrompt: (text: string) => void;
  avatarSection?: ReactNode;
  avatarName?: string | null;
}

const CREATIVE_SPARKS = [
  { label: "Cinematic Lighting" },
  { label: "Octane Render" },
  { label: "Bouncy Style" },
  { label: "Hyper Realistic" },
  { label: "Neon Glow" },
  { label: "Soft Focus" },
];

export function GenerateEmptyState() {
  return (
    <WorkspaceState
      tone="empty"
      icon={Sparkles}
      title="No generation models available"
      description="Model configuration could not be loaded. Use Clone or return Home while the Generate engines are unavailable."
      action={{ href: "/ugc-clone", label: "Open Clone" }}
      secondaryAction={{ href: "/", label: "Return Home" }}
      className="min-h-96"
    />
  );
}

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

  // Optional avatar identity: when set, the image is rendered from this avatar's
  // identity references (same identity-locking approach as the Clone tab).
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [identityPack, setIdentityPack] = useState<AvatarIdentityPackSummary | null>(null);

  // Keep a fresh identity-pack status so we can tell the user whether the
  // multi-angle references are ready (the backend falls back to the original
  // avatar image while they prepare).
  useEffect(() => {
    if (!avatarId) {
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const pack = await apiGet<AvatarIdentityPackSummary | null>(
          `/api/avatars/${encodeURIComponent(avatarId)}/identity-pack`
        );
        if (!active) return;
        setIdentityPack(pack);
        if (pack && (pack.status === "queued" || pack.status === "processing")) {
          timeoutId = setTimeout(load, 4000);
        }
      } catch {
        if (active) setIdentityPack(null);
      }
    };

    void load();
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [avatarId]);

  if (models.length === 0) {
    return <GenerateEmptyState />;
  }

  const isReferenceImageModel = (modelId: string | null) => {
    const m = models.find((mod) => mod.id === modelId);
    return m?.type === "image" && m.capabilities.referenceImages === true;
  };

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

  // Avatar identity needs an edit-capable image model. Selecting an avatar while
  // a non-compatible model is active auto-switches to one that accepts
  // reference images so the parameters (aspect ratio, image count) stay coherent.
  const handleAvatarSelect = (id: string) => {
    const next = id || null;
    setAvatarId(next);
    if (!next) {
      setIdentityPack(null);
    }
    if (next && !isReferenceImageModel(selectedModel)) {
      const fallback = models.find(
        (m) => m.type === "image" && m.capabilities.referenceImages === true
      );
      if (fallback) handleModelSelect(fallback.id);
    }
  };

  const model = models.find((m) => m.id === selectedModel);
  const isImage = model?.type === "image";
  const canSubmit = selectedModel && prompt.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !model) return;
    setIsSubmitting(true);

    try {
      if (avatarId) {
        const result = await apiPost<{ id: string }>("/api/generate/images", {
          prompt,
          model: selectedModel,
          aspectRatio,
          numImages,
          negativePrompt: negativePrompt || undefined,
          avatarId,
        });
        router.push(`/generate/${result.id}`);
      } else if (isImage) {
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

  const identityStatus = describeIdentityStatus(identityPack);
  const avatarSection = (
    <div className="launch-card bg-card p-6 border border-border">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-accent-green" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest">
            AI Avatar
          </h3>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Optional
          </span>
        </div>
        {avatarId && (
          <button
            type="button"
            onClick={() => handleAvatarSelect("")}
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      <p className="mb-4 text-xs leading-5 text-muted-foreground">
        Select an avatar to generate this image from their identity references —
        the same identity used for Clone reference images.
      </p>
      {avatarId && (
        <p
          className={cn(
            "mb-4 text-xs leading-5",
            identityStatus.tone === "ready"
              ? "text-accent-green"
              : identityStatus.tone === "failed"
                ? "text-destructive"
                : "text-accent-blue"
          )}
        >
          {identityStatus.label}
        </p>
      )}
      <AvatarPicker selectedId={avatarId} onSelect={handleAvatarSelect} />
    </div>
  );

  return (
    <GenerateFormView
      models={models}
      selectedModel={selectedModel}
      prompt={prompt}
      aspectRatio={aspectRatio}
      numImages={numImages}
      negativePrompt={negativePrompt}
      enableWebSearch={enableWebSearch}
      enableAudio={enableAudio}
      isSubmitting={isSubmitting}
      advancedOpen={advancedOpen}
      onModelSelect={handleModelSelect}
      onPromptChange={setPrompt}
      onAspectRatioChange={setAspectRatio}
      onNumImagesChange={setNumImages}
      onNegativePromptChange={setNegativePrompt}
      onEnableWebSearchChange={setEnableWebSearch}
      onEnableAudioChange={setEnableAudio}
      onAdvancedOpenChange={setAdvancedOpen}
      onSubmit={handleSubmit}
      onAppendToPrompt={appendToPrompt}
      avatarSection={avatarSection}
      avatarName={avatarId ? "Avatar" : null}
    />
  );
}

export function GenerateFormView({
  models,
  selectedModel,
  prompt,
  aspectRatio,
  numImages,
  negativePrompt,
  enableWebSearch,
  enableAudio,
  isSubmitting,
  advancedOpen,
  onModelSelect,
  onPromptChange,
  onAspectRatioChange,
  onNumImagesChange,
  onNegativePromptChange,
  onEnableWebSearchChange,
  onEnableAudioChange,
  onAdvancedOpenChange,
  onSubmit,
  onAppendToPrompt,
  avatarSection,
  avatarName,
}: GenerateFormViewProps) {
  const model = models.find((m) => m.id === selectedModel);
  const isImage = model?.type === "image";
  const isVideo = model?.type === "video";

  const estimatedCost = selectedModel
    ? calculateEstimatedCost(selectedModel, {
        numImages: isImage ? numImages : undefined,
        durationSec: isVideo ? model?.defaults.duration : undefined,
        enableAudio: enableAudio && selectedModel === "veo3",
      })
    : 0;

  const canSubmit = selectedModel && prompt.trim().length > 0 && !isSubmitting;

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
                Creative Prompt
              </label>
              <span className="text-xs font-bold text-muted-foreground font-mono">
                {prompt.length} / 1000
              </span>
            </div>
            <Textarea
              placeholder="Describe the image or video scene in detail..."
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value.slice(0, 1000))}
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
                    onClick={() => onAppendToPrompt(spark.label)}
                  >
                    {spark.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {avatarSection}
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-5 space-y-6">
          {/* Model Selection */}
          <div className="launch-card bg-card p-6 border border-border">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4">
              Model Selection
            </h3>
            <ModelPicker
              selectedModel={selectedModel}
              onModelSelect={onModelSelect}
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
                          onClick={() => onAspectRatioChange(ratio)}
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
                      onValueChange={(val) => onNumImagesChange(Array.isArray(val) ? val[0] : val)}
                      min={1}
                      max={model.limits.maxImages ?? 4}
                      step={1}
                    />
                  </div>
                )}

              </div>

              {/* Advanced Settings */}
              <Collapsible open={advancedOpen} onOpenChange={onAdvancedOpenChange}>
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
                        onChange={(e) => onNegativePromptChange(e.target.value)}
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
                        onCheckedChange={onEnableWebSearchChange}
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
                        onCheckedChange={onEnableAudioChange}
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

      <FloatingToolbar
        summary={
          <>
            <ToolbarHeading>Current Config</ToolbarHeading>
            {model && (
              <>
                <ToolbarDivider />
                <ToolbarLabel>{model.name}</ToolbarLabel>
                <ToolbarDivider />
                <ToolbarLabel>{aspectRatio}</ToolbarLabel>
                {isImage && <><ToolbarDivider /><ToolbarLabel>{numImages} img</ToolbarLabel></>}
                {avatarName && <><ToolbarDivider /><ToolbarLabel>{avatarName}</ToolbarLabel></>}
              </>
            )}
          </>
        }
      >
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="bg-accent-coral text-white font-bold px-8 py-3 rounded-md text-sm hover:bg-[#ff6540] transition-all duration-150 h-auto flex items-center gap-3 uppercase tracking-wider"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              Generate Now
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </FloatingToolbar>
    </>
  );
}
