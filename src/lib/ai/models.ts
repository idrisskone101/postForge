import type { ModelDefinition } from "./types";

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
};

export function getModel(modelId: string): ModelDefinition | undefined {
  return MODEL_REGISTRY[modelId];
}

export function getModelsByType(type: "image" | "video"): ModelDefinition[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.type === type);
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

  // per_second pricing
  const duration = params.durationSec ?? model.defaults.duration ?? 5;

  // Special case: veo3 with audio costs 2x the base rate
  if (modelId === "veo3" && params.enableAudio) {
    return model.pricing.amount * 2 * duration;
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

export function mapAspectRatioToFalFormat(
  aspectRatio: string,
  modelId: string
): string {
  const model = MODEL_REGISTRY[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  // Image models use the mapped format, video models pass through
  if (model.type === "image") {
    return ASPECT_RATIO_FAL_MAP[aspectRatio] ?? aspectRatio;
  }

  return aspectRatio;
}
