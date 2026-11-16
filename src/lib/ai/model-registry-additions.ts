import type { ModelDefinition } from "./types";

const IMAGE_ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:5", "3:2", "4:3"];

// Prices are fal's published rates for the payload PostForge sends (see
// falImageSizingInput and VIDEO_INPUT_SHAPES): the resolution tier it requests
// sets the per-second or per-image rate.
export const MODEL_REGISTRY_ADDITIONS: Record<string, ModelDefinition> = {
  "nano-banana-2.1": {
    id: "nano-banana-2.1",
    name: "Nano Banana 2.1",
    type: "image",
    provider: "fal",
    endpoint: "google/nano-banana-2.1",
    // fal bills by token; its published 1K text-to-image cost is $0.040.
    pricing: { unit: "per_image", amount: 0.04 },
    capabilities: {
      textToImage: true,
      referenceImages: true,
      maxReferenceImages: 14,
      webSearch: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 4, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "seedream-5.5": {
    id: "seedream-5.5",
    name: "Seedream 5.5",
    type: "image",
    provider: "fal",
    endpoint: "bytedance/seedream/v5.5/text-to-image",
    // $0.03 per image up to 2,610,000 pixels; every size PostForge sends is below that.
    pricing: { unit: "per_image", amount: 0.03 },
    capabilities: {
      textToImage: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 4, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "flux-3": {
    id: "flux-3",
    name: "FLUX 3",
    type: "image",
    provider: "fal",
    endpoint: "blackforestlabs/flux-3/text-to-image",
    pricing: { unit: "per_image", amount: 0.048 },
    capabilities: {
      textToImage: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 1, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "flux-2-pro": {
    id: "flux-2-pro",
    name: "FLUX.2 Pro",
    type: "image",
    provider: "fal",
    endpoint: "fal-ai/flux-2-pro",
    // $0.03 for the first megapixel plus $0.015 per additional one, rounded up:
    // the largest size PostForge sends (2.25 MP) bills as 3 MP.
    pricing: { unit: "per_image", amount: 0.06 },
    capabilities: {
      textToImage: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 1, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "muse-image": {
    id: "muse-image",
    name: "Muse Image",
    type: "image",
    provider: "fal",
    endpoint: "meta/muse-image/text-to-image",
    pricing: { unit: "per_image", amount: 0.01 },
    capabilities: {
      textToImage: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 4, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "ideogram-v3": {
    id: "ideogram-v3",
    name: "Ideogram V3",
    type: "image",
    provider: "fal",
    endpoint: "fal-ai/ideogram/v3",
    // BALANCED rendering speed, the endpoint default.
    pricing: { unit: "per_image", amount: 0.06 },
    capabilities: {
      textToImage: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 4, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "z-image-turbo": {
    id: "z-image-turbo",
    name: "Z-Image Turbo",
    type: "image",
    provider: "fal",
    endpoint: "fal-ai/z-image/turbo",
    // $0.005 per megapixel; the 1152x2048 portrait output is 2.36 MP.
    pricing: { unit: "per_image", amount: 0.0118 },
    capabilities: {
      textToImage: true,
    },
    defaults: { aspectRatio: "9:16", numImages: 1 },
    limits: { maxImages: 4, aspectRatios: IMAGE_ASPECT_RATIOS },
  },
  "kling-4.0": {
    id: "kling-4.0",
    name: "Kling 4.0",
    type: "video",
    provider: "fal",
    endpoint: "kling/v4/text-to-video",
    pricing: { unit: "per_second", amount: 0.157 },
    capabilities: {
      textToVideo: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { minDuration: 3, maxDuration: 30, aspectRatios: ["9:16", "16:9", "1:1", "21:9"] },
  },
  "kling-4.0-i2v": {
    id: "kling-4.0-i2v",
    name: "Kling 4.0 Image-to-Video",
    type: "video",
    provider: "fal",
    endpoint: "kling/v4/image-to-video",
    pricing: { unit: "per_second", amount: 0.157 },
    capabilities: {
      imageToVideo: true,
      videoToVideo: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { minDuration: 3, maxDuration: 30, aspectRatios: ["9:16", "16:9", "1:1"] },
  },
  "kling-4.0-flash": {
    id: "kling-4.0-flash",
    name: "Kling 4.0 Flash",
    type: "video",
    provider: "fal",
    endpoint: "kling/v4/flash/text-to-video",
    pricing: { unit: "per_second", amount: 0.094 },
    capabilities: {
      textToVideo: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { minDuration: 3, maxDuration: 20, aspectRatios: ["9:16", "16:9", "1:1", "21:9"] },
  },
  "minimax-h3-max": {
    id: "minimax-h3-max",
    name: "MiniMax H3 Max",
    type: "video",
    provider: "fal",
    endpoint: "minimax/h3-max/text-to-video",
    // Standard 768P rate from November 16, 2026.
    pricing: { unit: "per_second", amount: 0.08 },
    capabilities: {
      textToVideo: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: {
      minDuration: 1,
      maxDuration: 15,
      aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"],
    },
  },
  "seedance-2.5": {
    id: "seedance-2.5",
    name: "Seedance 2.5",
    type: "video",
    provider: "fal",
    endpoint: "bytedance/seedance-2.5/us/text-to-video",
    // 720p; audio costs the same.
    pricing: { unit: "per_second", amount: 0.473 },
    capabilities: {
      textToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "9:16", duration: 8 },
    limits: {
      minDuration: 4,
      maxDuration: 30,
      aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"],
    },
  },
  "seedance-2.5-i2v": {
    id: "seedance-2.5-i2v",
    name: "Seedance 2.5 Image-to-Video",
    type: "video",
    provider: "fal",
    endpoint: "bytedance/seedance-2.5/us/image-to-video",
    pricing: { unit: "per_second", amount: 0.473 },
    capabilities: {
      imageToVideo: true,
      videoToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "9:16", duration: 8 },
    limits: { minDuration: 4, maxDuration: 30, aspectRatios: ["9:16", "16:9", "1:1"] },
  },
  "wan-3.0": {
    id: "wan-3.0",
    name: "Wan 3.0",
    type: "video",
    provider: "fal",
    endpoint: "alibaba/wan-3.0/text-to-video",
    // 720p; audio has no separate price.
    pricing: { unit: "per_second", amount: 0.1 },
    capabilities: {
      textToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { minDuration: 2, maxDuration: 30, aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4"] },
  },
  "wan-3.0-i2v": {
    id: "wan-3.0-i2v",
    name: "Wan 3.0 Image-to-Video",
    type: "video",
    provider: "fal",
    endpoint: "alibaba/wan-3.0/image-to-video",
    pricing: { unit: "per_second", amount: 0.1 },
    capabilities: {
      imageToVideo: true,
      videoToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: { minDuration: 2, maxDuration: 30, aspectRatios: ["9:16", "16:9", "1:1"] },
  },
  "gemini-omni-flash-1.2": {
    id: "gemini-omni-flash-1.2",
    name: "Gemini Omni Flash 1.2",
    type: "video",
    provider: "fal",
    endpoint: "google/gemini-omni-flash/v1.2/text-to-video",
    // 720p, with native audio always on.
    pricing: { unit: "per_second", amount: 0.0819 },
    capabilities: {
      textToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "9:16", duration: 8 },
    limits: { minDuration: 3, maxDuration: 15, aspectRatios: ["16:9", "9:16"] },
  },
  "flux-3-video": {
    id: "flux-3-video",
    name: "FLUX 3 Video",
    type: "video",
    provider: "fal",
    endpoint: "blackforestlabs/flux-3/text-to-video",
    pricing: { unit: "per_second", amount: 0.17 },
    capabilities: {
      textToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: {
      minDuration: 5,
      maxDuration: 20,
      aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"],
    },
  },
  "grok-imagine-video-1.5": {
    id: "grok-imagine-video-1.5",
    name: "Grok Imagine Video 1.5",
    type: "video",
    provider: "fal",
    endpoint: "xai/grok-imagine-video/v1.5/text-to-video",
    pricing: { unit: "per_second", amount: 0.14 },
    capabilities: {
      textToVideo: true,
    },
    defaults: { aspectRatio: "9:16", duration: 6 },
    limits: {
      minDuration: 1,
      maxDuration: 15,
      aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4", "3:2", "2:3"],
    },
  },
  "pixverse-v6": {
    id: "pixverse-v6",
    name: "PixVerse V6",
    type: "video",
    provider: "fal",
    endpoint: "fal-ai/pixverse/v6/text-to-video",
    // 720p: $0.045/s silent, $0.060/s with audio.
    pricing: { unit: "per_second", amount: 0.045 },
    audioMultiplier: 0.06 / 0.045,
    capabilities: {
      textToVideo: true,
      nativeAudio: true,
    },
    defaults: { aspectRatio: "9:16", duration: 5 },
    limits: {
      minDuration: 1,
      maxDuration: 15,
      aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4", "3:2", "2:3", "21:9"],
    },
  },
};
