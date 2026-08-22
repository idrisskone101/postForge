import { getContinuityVideoModel } from "@/lib/ai/models";
import type { ModelDefinition } from "@/lib/ai/types";

export type GenerationFormInitialState = {
  selectedModelId: string | null;
  prompt: string;
  aspectRatio: string;
  numImages: number;
  duration: number;
  videoReferenceFileId: string | null;
  submitError: string | null;
};

type SearchParamsReader = Pick<URLSearchParams, "get">;

export function resolveGenerationFormInitialState(
  models: ModelDefinition[],
  searchParams: SearchParamsReader
): GenerationFormInitialState {
  const requestedModel = searchParams.get("model");
  const referenceFileId = searchParams.get("referenceFileId");
  let selectedModel = models.find((model) => model.id === requestedModel) ?? null;
  let videoReferenceFileId: string | null = referenceFileId;
  let submitError: string | null = null;

  if (referenceFileId) {
    const continuityModel = getContinuityVideoModel();
    if (!continuityModel) {
      videoReferenceFileId = null;
      submitError = "No configured video model supports a video seed reference.";
    } else if (selectedModel?.capabilities.videoToVideo !== true) {
      selectedModel = continuityModel;
    }
  }

  return {
    selectedModelId: selectedModel?.id ?? null,
    prompt: searchParams.get("prompt") ?? "",
    aspectRatio: selectedModel?.defaults.aspectRatio ?? "9:16",
    numImages: selectedModel?.defaults.numImages ?? 1,
    duration: selectedModel?.defaults.duration ?? 5,
    videoReferenceFileId,
    submitError,
  };
}
