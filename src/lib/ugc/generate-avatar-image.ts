import { prisma } from "@/lib/db";
import { generateImage } from "@/lib/ai/generate-image";
import { buildAvatarVibePrompt } from "@/lib/ai/collection-vibe";
import { calculateEstimatedCost, getModel } from "@/lib/ai/models";
import { getDefaultEditCapableImageModel } from "@/lib/ai/model-availability";
import type { SlideshowAestheticTemplate } from "@/lib/ai/slideshow-creator-types";
import {
  buildHairstyleDirective,
  resolveIdentityReferenceUrlsForAvatar,
} from "@/lib/ugc/avatar-identity-pack";
import { resolveAvatarGenerationPrompt } from "@/lib/ugc/before-identity-prompt";
import type { ImageGenerationRequest } from "@/lib/ai/types";

export interface AvatarImageRequest {
  avatarId: string;
  prompt: string;
  imageModel?: string;
  aspectRatio?: string;
  numImages?: number;
  negativePrompt?: string;
  hairstyleRole?: string | null;
  /**
   * Aesthetic JSON extracted from collection images. When present it becomes
   * the style authority of a JSON-structured prompt; the collection images
   * themselves are never sent to the image model.
   */
  styleTemplate?: SlideshowAestheticTemplate | null;
  /** True when the user prompt was already folded into the style template. */
  styleTemplateFolded?: boolean;
}

// Identity references give the model the person; the user's prompt gives the
// scene. This negative prompt keeps the output a believable photo rather than a
// glossy AI portrait, while staying generic (no TikTok-frame assumptions).
const AVATAR_IMAGE_NEGATIVE_PROMPT = [
  "different person",
  "face swap onto a different body",
  "deformed face",
  "bad anatomy",
  "extra fingers",
  "extra limbs",
  "blurry face",
  "watermark",
  "text overlay",
  "caption text",
  "cartoon",
  "anime",
  "illustration",
  "3D render",
  "plastic skin",
  "poreless skin",
  "overly retouched",
  "beauty filter",
].join(", ");

// Builds a prompt that locks the person to the supplied avatar identity
// references while rendering the scene described by the user's prompt.
export function buildAvatarScenePrompt(
  userPrompt: string,
  options: { hairstyleDirective?: string } = {}
): string {
  const sceneDirection = userPrompt.trim()
    ? `Scene to create: ${userPrompt.trim()}`
    : "Create a natural, photorealistic image of the avatar person.";

  const parts = [
    "All of the supplied reference images are the same avatar person.",
    "Use the reference images for the person's identity: face, facial structure, eye shape, eyebrow shape, hair color, hair style, hair length, hair texture, skin tone, complexion, and body type.",
    options.hairstyleDirective?.trim() ?? "",
    "This is a full person render, not a face swap. The person in the output must be unmistakably the same individual as in the reference images.",
    "Render the person in a new, photorealistic image following the scene direction below.",
    sceneDirection,
    "Keep the result a believable real photograph with natural skin texture and lighting. Avoid plastic skin, beauty-filter smoothness, or AI-portrait polish unless the scene direction explicitly asks for a stylized look.",
  ];

  return parts
    .filter(Boolean)
    .join(". ")
    .replace(/\.\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

export async function buildAvatarImageGenerationRequest(
  request: AvatarImageRequest
): Promise<{
  request: ImageGenerationRequest;
  jobInput: Record<string, unknown>;
  estimatedCost: number;
  model: string;
}> {
  const requestedModel =
    request.imageModel ?? (await getDefaultEditCapableImageModel());
  const modelDef = getModel(requestedModel);

  // Avatar identity requires an edit-capable image model that accepts reference
  // images; fall back to the default if the caller asked for anything else.
  const modelId =
    modelDef?.type === "image" && modelDef.capabilities.referenceImages
      ? requestedModel
      : await getDefaultEditCapableImageModel();

  const resolved = resolveAvatarGenerationPrompt({
    prompt: request.prompt,
    aspectRatio: request.aspectRatio,
    negativePrompt: request.negativePrompt,
  });
  const aspectRatio = resolved.aspectRatio;
  const numImages = request.numImages ?? 1;
  const estimatedCost = calculateEstimatedCost(modelId, { numImages });

  const avatar = await prisma.avatar.findUnique({
    where: { id: request.avatarId },
  });
  if (!avatar) {
    throw new Error(`Avatar not found: ${request.avatarId}`);
  }

  // Resolve the avatar's identity references (multiple face angles when the
  // identity pack is ready, otherwise the original avatar as a fallback). A
  // selected hairstyle variant is honored here.
  const identityReferences = await resolveIdentityReferenceUrlsForAvatar(
    request.avatarId,
    { hairstyleRole: request.hairstyleRole }
  );

  const hairstyleDirective =
    resolved.hairstyleDirective ??
    (identityReferences.appliedHairstyleRole
      ? buildHairstyleDirective(identityReferences.appliedHairstyleRole)
      : undefined);

  const promptString = request.styleTemplate
    ? buildAvatarVibePrompt({
        userPrompt: resolved.prompt,
        template: request.styleTemplate,
        folded: request.styleTemplateFolded === true,
        hairstyleDirective,
      })
    : buildAvatarScenePrompt(resolved.prompt, {
        hairstyleDirective,
      });
  const negativePrompt = resolved.negativePrompt?.trim()
    ? `${AVATAR_IMAGE_NEGATIVE_PROMPT}, ${resolved.negativePrompt.trim()}`
    : AVATAR_IMAGE_NEGATIVE_PROMPT;

  return {
    request: {
      prompt: promptString,
      negativePrompt,
      model: modelId,
      aspectRatio,
      numImages,
      imageUrls: identityReferences.identityReferenceUrls,
      editEndpoint: true,
      thinkingLevel: "high" as const,
    },
    jobInput: {
      model: modelId,
      aspectRatio,
      numImages,
      negativePrompt,
      imageUrls: identityReferences.identityReferenceUrls,
      editEndpoint: true,
      thinkingLevel: "high",
      avatarId: request.avatarId,
      identityPackId: identityReferences.identityPackId,
      identityReferenceRoles: identityReferences.identityReferenceRoles,
      appliedHairstyleRole: identityReferences.appliedHairstyleRole,
      requestedHairstyleRole: request.hairstyleRole ?? null,
      usedAvatarFallback: identityReferences.usedAvatarFallback,
      styleTemplate: request.styleTemplate ?? undefined,
      styleTemplateFolded: request.styleTemplate
        ? request.styleTemplateFolded === true
        : undefined,
      prompt: request.prompt,
    },
    estimatedCost,
    model: modelId,
  };
}

export async function generateAvatarImage(
  request: AvatarImageRequest
): Promise<{ jobId: string; estimatedCost: number; model: string }> {
  const built = await buildAvatarImageGenerationRequest(request);
  const jobId = await generateImage(built.request, undefined, {
    jobTags: ["generate-avatar"],
    jobInput: built.jobInput,
  });

  return { jobId, estimatedCost: built.estimatedCost, model: built.model };
}
