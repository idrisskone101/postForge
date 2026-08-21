import {
  calculateEstimatedCost,
  getModel,
  mapAspectRatioToFalFormat,
} from "./models";

const SLIDESHOW_ASPECT_RATIOS = new Set(["9:16", "4:5", "1:1", "16:9"]);
// Legacy sync default; callers resolve the centralized default (when no model
// is provided) before building the request.
const DEFAULT_SLIDESHOW_IMAGE_MODEL = "nano-banana-2";

export type QueueSlideshowImageInput = {
  projectId: string;
  slideId: string;
  prompt: string;
  aspectRatio?: string;
  model?: string;
  referenceImageUrls?: string[];
};

export function buildSlideshowImagePrompt(prompt: string) {
  const subject = prompt.trim();
  if (!subject) throw new Error("An image prompt is required.");

  return [
    subject,
    "Create an original premium editorial photograph for a social-media slideshow.",
    "No text, captions, logos, app interfaces, watermarks, borders, or recognizable brand marks.",
    "Keep the main subject inside the center safe area so overlaid copy remains readable.",
  ].join(" ");
}

export function buildSlideshowImageQueueRequest(input: QueueSlideshowImageInput) {
  const projectId = input.projectId.trim();
  const slideId = input.slideId.trim();
  if (!projectId || !slideId) {
    throw new Error("A slideshow project and slide are required.");
  }

  const model = input.model?.trim() || DEFAULT_SLIDESHOW_IMAGE_MODEL;
  const modelDefinition = getModel(model);
  if (!modelDefinition || modelDefinition.type !== "image") {
    throw new Error(`Unknown slideshow image model: ${model}`);
  }

  const aspectRatio = SLIDESHOW_ASPECT_RATIOS.has(input.aspectRatio ?? "")
    ? input.aspectRatio
    : "9:16";
  const referenceImageUrls = (input.referenceImageUrls ?? [])
    .filter((url) => typeof url === "string" && /^https?:\/\//.test(url))
    .slice(0, modelDefinition.capabilities.maxReferenceImages ?? 0);
  const prompt = buildSlideshowImagePrompt(input.prompt);
  const estimatedCost = calculateEstimatedCost(model, { numImages: 1 });
  const endpoint = referenceImageUrls.length
    ? `${modelDefinition.endpoint}/edit`
    : modelDefinition.endpoint;
  const falInput: Record<string, unknown> = {
    prompt,
    num_images: 1,
    safety_tolerance: "6",
    ...(referenceImageUrls.length
      ? {
          image_urls: referenceImageUrls,
          aspect_ratio: aspectRatio,
          thinking_level: "high",
        }
      : {
          image_size: mapAspectRatioToFalFormat(aspectRatio ?? "9:16", model),
        }),
  };
  const jobInput = {
    kind: "slideshow-slide-image",
    projectId,
    slideId,
    prompt,
    aspectRatio,
    referenceImageUrls,
    falInput,
    falEndpoint: endpoint,
  };

  return {
    model,
    prompt,
    endpoint,
    falInput,
    estimatedCost,
    jobInput,
    tags: ["slideshow", `slideshow:${projectId}`, `slide:${slideId}`],
  };
}

export type SlideshowImageQueueRequest = ReturnType<
  typeof buildSlideshowImageQueueRequest
>;

export const slideshowImageAspectRatios = [...SLIDESHOW_ASPECT_RATIOS] as const;
