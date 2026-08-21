import type { ModelDefinition } from "./types";
import { MODEL_REGISTRY } from "./model-registry";

export { MODEL_REGISTRY };

/** Cost per second of video for Bria Video Eraser text overlay removal */
export const BRIA_ERASER_COST_PER_SEC = 0.14;

export function getModel(modelId: string): ModelDefinition | undefined {
  return MODEL_REGISTRY[modelId];
}

export function getModelsByType(type: "image" | "video"): ModelDefinition[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.type === type);
}

/** First video model that accepts a video seed reference (character continuity). */
export function getContinuityVideoModel(): ModelDefinition | undefined {
  return Object.values(MODEL_REGISTRY).find(
    (m) =>
      m.type === "video" &&
      m.capabilities.videoToVideo === true &&
      m.capabilities.subjectSwap !== true
  );
}

export function acceptsVideoContinuity(model: ModelDefinition | undefined): boolean {
  return (
    model?.type === "video" &&
    model.capabilities.videoToVideo === true &&
    model.capabilities.subjectSwap !== true
  );
}

export function getAllModels(): ModelDefinition[] {
  return Object.values(MODEL_REGISTRY);
}

export function calculateEstimatedCost(
  modelId: string,
  params: { numImages?: number; durationSec?: number; enableAudio?: boolean }
): number {
  const model = MODEL_REGISTRY[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  if (model.pricing.unit === "per_image") {
    const count = params.numImages ?? model.defaults.numImages ?? 1;
    return model.pricing.amount * count;
  }

  if (model.pricing.unit === "per_clip") {
    // Swap endpoints bill per clip. PixVerse Swap doubles for input videos
    // longer than 5 seconds.
    const duration = params.durationSec ?? model.defaults.duration ?? 5;
    return model.pricing.amount * (duration > 5 ? 2 : 1);
  }

  // per_second pricing
  const duration = params.durationSec ?? model.defaults.duration ?? 5;

  // Models with native audio charge an audio multiplier when enabled
  const audioMultiplier = model.audioMultiplier ?? 1;
  if (params.enableAudio && model.capabilities.nativeAudio) {
    return model.pricing.amount * audioMultiplier * duration;
  }

  return model.pricing.amount * duration;
}

const ASPECT_RATIO_FAL_MAP: Record<string, string> = {
  "9:16": "portrait_9_16",
  "16:9": "landscape_16_9",
  "1:1": "square",
  "4:5": "portrait_4_5",
  "3:2": "landscape_3_2",
  "4:3": "landscape_4_3",
};

// GPT Image 2 has no portrait_9_16 preset; its closest portrait options
// are portrait_16_9 (576x1024) and portrait_4_3 (768x1024). A true 9:16
// requires an explicit { width, height } object (multiples of 16, max edge
// 3840px, aspect ratio <= 3:1, 655,360..8,294,400 total pixels).
const GPT_IMAGE_2_SIZE_MAP: Record<string, string> = {
  "16:9": "landscape_16_9",
  "1:1": "square_hd",
  "4:5": "portrait_4_3",
  "3:2": "landscape_4_3",
  "4:3": "landscape_4_3",
};

// Explicit 9:16 portrait dimensions for GPT Image 2 (1080x1920 equivalents
// that are multiples of 16): 1152x2048 is exactly 9:16 and within fal's
// pixel budget.
export const GPT_IMAGE_2_PORTRAIT_9_16 = { width: 1152, height: 2048 } as const;

export type FalImageSize = string | { width: number; height: number };

function gptImage2FalSize(aspectRatio: string): FalImageSize {
  if (aspectRatio === "9:16") return GPT_IMAGE_2_PORTRAIT_9_16;
  return GPT_IMAGE_2_SIZE_MAP[aspectRatio] ?? "landscape_4_3";
}

// Seedream 5.0 Pro accepts the same preset set as GPT Image 2; portrait_9_16
// is not a valid preset, so 9:16 maps to portrait_16_9.
const SEEDREAM_5_SIZE_MAP: Record<string, string> = {
  "9:16": "portrait_16_9",
  "16:9": "landscape_16_9",
  "1:1": "square_hd",
  "4:5": "portrait_4_3",
  "3:2": "landscape_4_3",
  "4:3": "landscape_4_3",
};

export function mapAspectRatioToFalFormat(
  aspectRatio: string,
  modelId: string
): FalImageSize {
  const model = MODEL_REGISTRY[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  // Image models use the mapped format, video models pass through
  if (model.type === "image") {
    if (modelId === "gpt-image-2") {
      return gptImage2FalSize(aspectRatio);
    }
    if (modelId === "seedream-5.0-pro") {
      return SEEDREAM_5_SIZE_MAP[aspectRatio] ?? "landscape_4_3";
    }
    if (modelId === "flux-2-flex") {
      // FLUX.2 flex accepts explicit 1K/2K size keys; map to 1K dimensions.
      return ASPECT_RATIO_FAL_MAP[aspectRatio] ?? aspectRatio;
    }
    return ASPECT_RATIO_FAL_MAP[aspectRatio] ?? aspectRatio;
  }

  return aspectRatio;
}
