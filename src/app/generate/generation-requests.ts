import type { SlideshowAestheticTemplate } from "@/lib/ai/slideshow-creator-types";
import type { SwapMode } from "@/lib/ai/types";
import { apiPost } from "@/lib/api/client";

export async function postSwapGeneration(input: {
  prompt: string;
  modelId: string;
  swapVideoId?: string;
  swapReferenceId?: string;
  swapMode: SwapMode;
}) {
  return apiPost<{ id: string }>("/api/generate/swap", {
    prompt: input.prompt,
    model: input.modelId,
    swapVideoId: input.swapVideoId,
    swapReferenceId: input.swapReferenceId,
    swapMode: input.swapMode,
  });
}

export async function postImageGeneration(input: {
  prompt: string;
  modelId: string;
  aspectRatio: string;
  numImages: number;
  negativePrompt?: string;
  enableWebSearch?: boolean;
  avatarId?: string;
  collectionAssetIds?: string[];
  styleTemplate?: SlideshowAestheticTemplate;
  styleTemplateFolded?: boolean;
}) {
  return apiPost<{ id: string }>("/api/generate/images", {
    prompt: input.prompt,
    model: input.modelId,
    aspectRatio: input.aspectRatio,
    numImages: input.numImages,
    negativePrompt: input.negativePrompt,
    enableWebSearch: input.enableWebSearch,
    avatarId: input.avatarId,
    collectionAssetIds: input.collectionAssetIds,
    styleTemplate: input.styleTemplate,
    styleTemplateFolded: input.styleTemplateFolded,
  });
}

export async function postVideoGeneration(input: {
  prompt: string;
  modelId: string;
  aspectRatio: string;
  duration: number;
  enableAudio: boolean;
  avatarId?: string;
  negativePrompt?: string;
  collectionAssetIds?: string[];
  referenceFileId?: string;
}) {
  return apiPost<{ id: string }>("/api/generate/videos", {
    prompt: input.prompt,
    model: input.modelId,
    aspectRatio: input.aspectRatio,
    duration: input.duration,
    enableAudio: input.enableAudio,
    avatarId: input.avatarId,
    negativePrompt: input.negativePrompt,
    collectionAssetIds: input.collectionAssetIds,
    referenceFileId: input.referenceFileId,
  });
}

export async function postVibeExtract(collectionAssetIds: string[]) {
  return apiPost<{
    template: SlideshowAestheticTemplate;
    model: string;
    referenceCount: number;
  }>("/api/collection-assets/vibe", { collectionAssetIds });
}

export async function postVibeFold(input: {
  template: SlideshowAestheticTemplate;
  prompt: string;
}) {
  return apiPost<{
    template: SlideshowAestheticTemplate;
    model: string;
  }>("/api/collection-assets/vibe/fold", input);
}

export async function postPromptImprove(input: {
  prompt: string;
  modelId: string;
  aspectRatio: string;
  duration?: number;
  enableAudio?: boolean;
  hasCharacterReference: boolean;
  hasVisualReference: boolean;
}) {
  return apiPost<{ prompt: string; model: string }>("/api/prompts/improve", {
    prompt: input.prompt,
    model: input.modelId,
    aspectRatio: input.aspectRatio,
    duration: input.duration,
    enableAudio: input.enableAudio,
    hasCharacterReference: input.hasCharacterReference,
    hasVisualReference: input.hasVisualReference,
  });
}
