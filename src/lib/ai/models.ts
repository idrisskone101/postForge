import type { ModelDefinition } from "./types";

/** Cost per second of video for Bria Video Eraser text overlay removal */
export const BRIA_ERASER_COST_PER_SEC = 0.14;

const IMAGE_ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:5", "3:2", "4:3"];
const VIDEO_ASPECT_RATIOS = ["9:16", "16:9", "1:1"];

export const MODEL_REGISTRY: Record<string, ModelDefinition> = {
  "nano-banana-2": {
    id: "nano-banana-2",
    name: "Nano Banana 2",
    type: "image",
    provider: "fal",
    endpoint: "fal-ai/nano-banana-2",
    pricing: { unit: "per_image", amount: 0.08 },
    capabilities: {
      textToImage: true,
      referenceImages: true,
      maxReferenceImages: 14,
      webSearch: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 4, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "nano-banana-pro": {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    type: "image",
    provider: "fal",
    endpoint: "fal-ai/nano-banana-pro",
    pricing: { unit: "per_image", amount: 0.15 },
    capabilities: {
      textToImage: true,
      referenceImages: true,
      maxReferenceImages: 14,
      webSearch: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 4, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "nano-banana": {
    id: "nano-banana",
    name: "Nano Banana",
    type: "image",
    provider: "fal",
    endpoint: "fal-ai/nano-banana",
    pricing: { unit: "per_image", amount: 0.039 },
    capabilities: {
      textToImage: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 4, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "gpt-image-2": {
    id: "gpt-image-2",
    name: "GPT Image 2",
    type: "image",
    provider: "fal",
    endpoint: "openai/gpt-image-2",
    pricing: { unit: "per_image", amount: 0.211 },
    capabilities: {
      textToImage: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: {
      maxImages: 1,
      // 9:16 is supported via an explicit { width, height } image_size object;
      // the rest map to presets.
      aspectRatios: ["9:16", "16:9", "1:1", "4:5", "3:2", "4:3"],
    },
  },
  "seedream-5.0-pro": {
    id: "seedream-5.0-pro",
    name: "Seedream 5.0 Pro",
    type: "image",
    provider: "fal",
    endpoint: "bytedance/seedream/v5/pro/text-to-image",
    pricing: { unit: "per_image", amount: 0.0675 },
    capabilities: {
      textToImage: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 4, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "flux-2-flex": {
    id: "flux-2-flex",
    name: "FLUX.2 Flex",
    type: "image",
    provider: "fal",
    endpoint: "fal-ai/flux-2-flex",
    pricing: { unit: "per_image", amount: 0.075 },
    capabilities: {
      textToImage: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 4, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "kling-3.0": {
    id: "kling-3.0",
    name: "Kling 3.0",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/kling-video/v3/standard/text-to-video",
    pricing: { unit: "per_second", amount: 0.029 },
    capabilities: {
      textToVideo: true,
      multiShot: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { maxDuration: 15, aspectRatios: VIDEO_ASPECT_RATIOS },
  },
  "kling-3.0-pro": {
    id: "kling-3.0-pro",
    name: "Kling 3.0 Pro",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/kling-video/v3/pro/text-to-video",
    pricing: { unit: "per_second", amount: 0.07 },
    capabilities: {
      textToVideo: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { maxDuration: 15, aspectRatios: VIDEO_ASPECT_RATIOS },
  },
  "kling-3.0-i2v": {
    id: "kling-3.0-i2v",
    name: "Kling 3.0 Image-to-Video",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/kling-video/v3/standard/image-to-video",
    pricing: { unit: "per_second", amount: 0.029 },
    capabilities: {
      imageToVideo: true,
      videoToVideo: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { maxDuration: 15, aspectRatios: VIDEO_ASPECT_RATIOS },
  },
  veo3: {
    id: "veo3",
    name: "Veo 3",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/veo3",
    pricing: { unit: "per_second", amount: 0.2 },
    audioMultiplier: 2,
    capabilities: {
      textToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "9:16", duration: 8 },
    limits: { maxDuration: 8, aspectRatios: VIDEO_ASPECT_RATIOS },
  },
  "veo3-fast": {
    id: "veo3-fast",
    name: "Veo 3 Fast",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/veo3/fast",
    pricing: { unit: "per_second", amount: 0.25 },
    capabilities: {
      textToVideo: true,
    },
    defaults: { aspectRatio: "9:16", duration: 8 },
    limits: { maxDuration: 8, aspectRatios: VIDEO_ASPECT_RATIOS },
  },
  "kling-2.6-motion": {
    id: "kling-2.6-motion",
    name: "Kling 2.6 Motion Control",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/kling-video/v2.6/standard/motion-control",
    pricing: { unit: "per_second", amount: 0.07 },
    capabilities: {
      motionControl: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { minDuration: 3, maxDuration: 30, aspectRatios: VIDEO_ASPECT_RATIOS },
  },
  "kling-3.0-motion": {
    id: "kling-3.0-motion",
    name: "Kling 3.0 Motion Control",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/kling-video/v3/standard/motion-control",
    pricing: { unit: "per_second", amount: 0.126 },
    capabilities: {
      motionControl: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { minDuration: 3, maxDuration: 30, aspectRatios: VIDEO_ASPECT_RATIOS },
  },
  "kling-3.0-pro-motion": {
    id: "kling-3.0-pro-motion",
    name: "Kling 3.0 Pro Motion Control",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/kling-video/v3/pro/motion-control",
    pricing: { unit: "per_second", amount: 0.168 },
    capabilities: {
      motionControl: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { minDuration: 3, maxDuration: 30, aspectRatios: VIDEO_ASPECT_RATIOS },
  },
  "veo3.1": {
    id: "veo3.1",
    name: "Veo 3.1",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/veo3.1",
    pricing: { unit: "per_second", amount: 0.2 },
    audioMultiplier: 2,
    capabilities: {
      textToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "16:9", duration: 8 },
    limits: { maxDuration: 8, aspectRatios: ["16:9", "9:16"] },
  },
  "seedance-2.0": {
    id: "seedance-2.0",
    name: "Seedance 2.0",
    type: "video",
    provider: "fal",
    endpoint: "bytedance/seedance-2.0/text-to-video",
    pricing: { unit: "per_second", amount: 0.3034 },
    capabilities: {
      textToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "16:9", duration: 8 },
    limits: { minDuration: 4, maxDuration: 15, aspectRatios: ["16:9", "9:16", "1:1", "21:9"] },
  },
  "gemini-omni-flash": {
    id: "gemini-omni-flash",
    name: "Gemini Omni Flash",
    type: "video",
    provider: "fal",
    endpoint: "google/gemini-omni-flash",
    pricing: { unit: "per_second", amount: 0.125 },
    capabilities: {
      textToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "16:9", duration: 8 },
    limits: { minDuration: 3, maxDuration: 10, aspectRatios: ["16:9", "9:16"] },
  },
  "minimax-h3": {
    id: "minimax-h3",
    name: "MiniMax H3",
    type: "video",
    provider: "fal",
    endpoint: "minimax/h3/text-to-video",
    pricing: { unit: "per_second", amount: 0.26 },
    capabilities: {
      textToVideo: true,
    },
    defaults: { aspectRatio: "16:9", duration: 8 },
    limits: { minDuration: 5, maxDuration: 15, aspectRatios: ["16:9", "9:16", "1:1", "21:9"] },
  },
  "pixverse-swap": {
    id: "pixverse-swap",
    name: "PixVerse Swap",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/pixverse/swap",
    pricing: { unit: "per_clip", amount: 0.2 },
    capabilities: {
      videoToVideo: true,
      subjectSwap: true,
      keepOriginalAudio: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { maxDuration: 30, aspectRatios: VIDEO_ASPECT_RATIOS },
  },
  "gemini-omni-edit": {
    id: "gemini-omni-edit",
    name: "Gemini Omni Edit",
    type: "video",
    provider: "fal",
    endpoint: "google/gemini-omni-flash/edit",
    pricing: { unit: "per_clip", amount: 0.5 },
    capabilities: {
      videoToVideo: true,
      subjectSwap: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { maxDuration: 30, aspectRatios: VIDEO_ASPECT_RATIOS },
  },
};

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
