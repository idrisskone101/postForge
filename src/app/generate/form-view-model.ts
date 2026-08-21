import { calculateEstimatedCost } from "@/lib/ai/models";
import type { ModelDefinition } from "@/lib/ai/types";
import { RATIO_LABELS } from "./form-constants";

export function getGenerateFormViewModel({
  models,
  selectedModel,
  prompt,
  aspectRatio,
  numImages,
  duration,
  enableAudio,
  isSubmitting,
  isImprovingPrompt,
  swapReady,
  swapSourceDurationSec,
  avatarName,
  vibeRequirement,
}: {
  models: ModelDefinition[];
  selectedModel: string | null;
  prompt: string;
  aspectRatio: string;
  numImages: number;
  duration: number;
  enableAudio: boolean;
  isSubmitting: boolean;
  isImprovingPrompt: boolean;
  swapReady: boolean;
  swapSourceDurationSec?: number;
  avatarName?: string | null;
  vibeRequirement: string | null;
}) {
  const model = models.find((item) => item.id === selectedModel);
  const isImage = model?.type === "image";
  const isVideo = model?.type === "video";
  const isSwap = model?.capabilities.subjectSwap === true;
  const requiresVideoSeed = model?.id === "kling-3.0-i2v" && !avatarName;
  const canSubmit =
    Boolean(model) &&
    prompt.trim().length > 0 &&
    !requiresVideoSeed &&
    !vibeRequirement &&
    !isSubmitting &&
    !isImprovingPrompt &&
    swapReady;
  const missing: string[] = [];
  if (!model) missing.push("a model");
  if (!prompt.trim()) missing.push("a prompt");
  if (requiresVideoSeed) missing.push("a character or seed image");
  const activeType = model?.type ?? "image";
  const recommendedModelId =
    models.find((item) => item.type === activeType)?.id ?? undefined;
  const characterVideoAnchorModel = models.find(
    (item) => item.type === "image" && item.capabilities.referenceImages === true
  );
  const characterVideoAnchorCost =
    isVideo && avatarName === "Character identity" && characterVideoAnchorModel
      ? calculateEstimatedCost(characterVideoAnchorModel.id, { numImages: 1 })
      : 0;
  const estimatedCost = model
    ? characterVideoAnchorCost +
      calculateEstimatedCost(model.id, {
        numImages: isImage ? numImages : undefined,
        durationSec: isSwap ? swapSourceDurationSec : isVideo ? duration : undefined,
        enableAudio: enableAudio && model.capabilities.nativeAudio === true,
      })
    : 0;
  const availableRatios = model?.limits.aspectRatios ?? ["9:16", "1:1", "16:9"];
  const outputOptions = Array.from(
    { length: Math.max(1, model?.limits.maxImages ?? 1) },
    (_, index) => index + 1
  );
  const durationOptions = (() => {
    if (!model || model.type !== "video") return [];
    const minimum = model.limits.minDuration ?? model.defaults.duration ?? 5;
    const maximum = model.limits.maxDuration ?? model.defaults.duration ?? 5;
    const defaultDuration = model.defaults.duration ?? minimum;
    const middle = Math.round((minimum + maximum) / 2);
    return Array.from(new Set([minimum, defaultDuration, middle, maximum])).sort(
      (a, b) => a - b
    );
  })();
  const previewWidthClass =
    aspectRatio === "9:16"
      ? "w-[min(72%,310px)]"
      : aspectRatio === "16:9"
        ? "w-[min(96%,560px)]"
        : "w-[min(86%,430px)]";
  const variationCount = isImage ? numImages : 1;
  const ratioLabel = RATIO_LABELS[aspectRatio] ?? aspectRatio;

  return {
    model,
    isImage,
    isVideo,
    isSwap,
    canSubmit,
    missing,
    recommendedModelId,
    estimatedCost,
    availableRatios,
    outputOptions,
    durationOptions,
    previewWidthClass,
    variationCount,
    ratioLabel,
  };
}

export type GenerateFormViewModel = ReturnType<typeof getGenerateFormViewModel>;
