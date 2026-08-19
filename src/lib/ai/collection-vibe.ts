import { readFile } from "node:fs/promises";
import {
  getDefaultIntelligenceModel,
  getDefaultVisionIntelligenceModel,
} from "@/lib/ai/model-availability";
import { parseSlideshowAestheticTemplate } from "@/lib/ai/slideshow-creator";
import type { SlideshowAestheticTemplate } from "@/lib/ai/slideshow-creator-types";
import {
  CollectionAssetRequestError,
  findCollectionAsset,
  resolveCollectionAssetLocalPath,
} from "@/lib/collection-assets-server";
import { getProviderCredential } from "@/lib/providers/credentials";

/* ------------------------------------------------------------------ */
/* Collection images → vibe JSON (Ollama vision)                       */
/*                                                                     */
/* The Generate tab turns a set of collection images (typically        */
/* Pinterest imports) into a structured aesthetic template. That JSON  */
/* is the ONLY carrier of the collection's vibe: the images themselves */
/* are never sent to the image model, so the saved character identity  */
/* never competes with people in the inspiration photos.               */
/* ------------------------------------------------------------------ */

const OLLAMA_CHAT_URL = "https://ollama.com/v1/chat/completions";
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_USER_PROMPT_LENGTH = 1_500;
const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface CollectionVibeDependencies {
  model: string;
  apiKey: string;
  fetchImpl: typeof fetch;
}

async function defaultVisionDependencies(): Promise<CollectionVibeDependencies> {
  const storedKey = await getProviderCredential("ollama");
  const apiKey = storedKey?.trim() ?? process.env.OLLAMA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Connect Ollama in Settings before extracting a vibe JSON from collection images."
    );
  }
  const visionModel = await getDefaultVisionIntelligenceModel();
  if (!visionModel) {
    throw new Error(
      "No vision-capable intelligence model is available. Add one to the story model catalog."
    );
  }
  return { model: visionModel.ollamaId, apiKey, fetchImpl: globalThis.fetch };
}

async function defaultIntelligenceDependencies(): Promise<CollectionVibeDependencies> {
  const storedKey = await getProviderCredential("ollama");
  const apiKey = storedKey?.trim() ?? process.env.OLLAMA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Connect Ollama in Settings before folding your prompt into the vibe JSON."
    );
  }
  // Folding is a text-only merge, so it uses the exact intelligence model the
  // workspace selected in Settings (no vision fallback).
  const intelligence = await getDefaultIntelligenceModel();
  return { model: intelligence.ollamaId, apiKey, fetchImpl: globalThis.fetch };
}

function stripMarkdownFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The intelligence model returned no JSON template.");
  }
  return candidate.slice(start, end + 1);
}

/**
 * Intelligence models sometimes echo the request envelope and return the
 * merge wrapped in {"template": {...}}. Unwrap that single-key envelope when
 * the parsed object has no template sections of its own.
 */
function unwrapTemplateEnvelope(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  const record = value as Record<string, unknown>;
  if ("aesthetic" in record || "visual_style" in record) {
    return value;
  }
  const inner = record.template;
  if (
    typeof inner === "object" &&
    inner !== null &&
    !Array.isArray(inner) &&
    ("aesthetic" in (inner as Record<string, unknown>) ||
      "visual_style" in (inner as Record<string, unknown>))
  ) {
    return inner;
  }
  return value;
}

function parseTemplateFromModelOutput(text: string): SlideshowAestheticTemplate {
  return parseSlideshowAestheticTemplate(
    unwrapTemplateEnvelope(JSON.parse(stripMarkdownFence(text)))
  );
}

/**
 * Read collection assets from server-owned storage and inline them as base64
 * data URIs for the vision model. Failures stay explicit — a missing or
 * unreadable image must never be silently dropped from the extraction.
 */
export async function loadCollectionImageDataUris(
  assetIds: string[]
): Promise<string[]> {
  const dataUris: string[] = [];
  for (const id of assetIds) {
    const asset = await findCollectionAsset(id);
    if (!asset) {
      throw new CollectionAssetRequestError(`Collection image was not found: ${id}`);
    }
    const mimeType = asset.mimeType?.split(";")[0]?.trim().toLowerCase();
    if (!mimeType || !SUPPORTED_MIME_TYPES.has(mimeType)) {
      throw new CollectionAssetRequestError(
        `Collection image "${asset.name}" is not a supported image type.`
      );
    }
    const localPath = await resolveCollectionAssetLocalPath(id);
    const bytes = await readFile(localPath);
    if (!bytes.length) {
      throw new CollectionAssetRequestError(
        `Collection image "${asset.name}" is empty. Remove it and retry.`
      );
    }
    if (bytes.length > MAX_REFERENCE_IMAGE_BYTES) {
      throw new CollectionAssetRequestError(
        `Collection image "${asset.name}" exceeds the 10 MB limit for vibe extraction. Remove it and retry.`
      );
    }
    dataUris.push(`data:${mimeType};base64,${bytes.toString("base64")}`);
  }
  return dataUris;
}

const EXTRACT_SYSTEM_PROMPT = `You are PostForge's visual director. You analyze inspiration images (often Pinterest saves) and distill their shared vibe into a single structured JSON "aesthetic template" that will later drive fresh image generations featuring a DIFFERENT person (the user's saved character).

Analyze the shared visual identity across the reference images: the mood and energy, the photographic genre and realism level, lighting, color palette and temperature, composition and framing, how a subject is directed (presence, expression, body language, wardrobe, branding), the environment feel, the camera feel (depth of field, grain, sharpness, motion), and the underlying storytelling concept.

The template must be transferable: describe the aesthetic, styling, and scene language, never the specific people, faces, or identities in the images. Do not copy distinctive personal attributes; capture the vibe only.

Return ONLY a single JSON object with this exact shape, and nothing else:
{
  "aesthetic": { "core_vibe": string, "mood": string[], "energy": string },
  "visual_style": { "genre": string, "realism": string, "finish": string, "inspiration": string, "avoid": string[] },
  "lighting": { "style": string, "exposure": string, "contrast": string, "highlights": string, "atmosphere": string },
  "color": { "palette": string, "dominant_tones": string[], "saturation": string, "temperature": string, "black_and_white": string },
  "composition": { "style": string, "framing": string, "posing": string, "negative_space": string, "perspective": string, "imperfection": string },
  "subject_direction": { "presence": string, "expression": string, "body_language": string, "wardrobe": string, "branding": string },
  "environment": { "feel": string, "examples": string[], "rule": string },
  "camera_feel": { "look": string, "depth_of_field": string, "texture": string, "sharpness": string, "motion": string, "dynamic_range": string },
  "storytelling": { "concept": string, "tone": string, "luxury": string }
}
Keep every value concrete and grounded in what you actually observe. Do not invent attributes that contradict the references. The core_vibe must capture the shared identity of the set.`;

export interface CollectionVibeExtractionResult {
  template: SlideshowAestheticTemplate;
  model: string;
  referenceCount: number;
}

/**
 * Extract the shared vibe of a set of collection images into a validated
 * aesthetic template. Images are inlined as base64 data URIs because Ollama
 * Cloud's OpenAI-compatible endpoint rejects plain image URLs.
 */
export async function deriveVibeTemplateFromDataUris(
  dataUris: string[],
  dependencies?: CollectionVibeDependencies
): Promise<CollectionVibeExtractionResult> {
  const resolvedDependencies = dependencies ?? (await defaultVisionDependencies());
  const images = (dataUris ?? [])
    .filter((uri) => typeof uri === "string" && uri.startsWith("data:image/"))
    .slice(0, 14);
  if (!images.length) {
    throw new Error("At least one collection image is required for vibe extraction.");
  }

  const response = await resolvedDependencies.fetchImpl(OLLAMA_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolvedDependencies.apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedDependencies.model,
      messages: [
        { role: "system", content: EXTRACT_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze these inspiration images and return the aesthetic template JSON.",
            },
            ...images.map((uri) => ({
              type: "image_url" as const,
              image_url: { url: uri },
            })),
          ],
        },
      ],
      temperature: 0.6,
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`Vibe extraction failed with HTTP ${response.status}.`);
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = completion.choices?.[0]?.message?.content;
  if (!text) throw new Error("The vision model returned no vibe JSON.");

  const template = parseTemplateFromModelOutput(text);
  return { template, model: resolvedDependencies.model, referenceCount: images.length };
}

/* ------------------------------------------------------------------ */
/* Folding the user prompt into the vibe JSON (Ollama intelligence)    */
/* ------------------------------------------------------------------ */

const FOLD_SYSTEM_PROMPT = `You are PostForge's aesthetic director. The user has an aesthetic JSON template distilled from inspiration images, plus a new scene direction. Merge the scene direction INTO the template so the template alone describes the final image.

Rules:
- Preserve the template's core vibe, lighting, color, and camera feel unless the user's direction explicitly contradicts them.
- Translate the user's direction into the right fields: subject_direction (presence, expression, body_language, wardrobe), composition.posing, environment.feel and environment.examples, storytelling.concept, and aesthetic.energy or aesthetic.mood when relevant.
- If the user names an action (for example "eating a sandwich"), it must end up as a concrete, visually directable statement in subject_direction.body_language and, when relevant, composition.posing.
- The subject of the final image is the user's saved character. Describe actions, styling, and scene language only — never invent or alter the subject's face, identity, or body attributes.
- Do not invent brand claims, logos, captions, or text overlays.
- Keep the exact same top-level JSON shape as the input template.
- Return ONLY the merged template as a single JSON object, with no commentary.`;

export interface CollectionVibeFoldResult {
  template: SlideshowAestheticTemplate;
  model: string;
}

/**
 * Fold the user's scene prompt into an extracted vibe template using the
 * workspace's configured intelligence model. The result is re-validated so a
 * malformed merge can never reach the image model.
 */
export async function foldPromptIntoVibeTemplate(
  template: SlideshowAestheticTemplate,
  userPrompt: string,
  dependencies?: CollectionVibeDependencies
): Promise<CollectionVibeFoldResult> {
  const direction = userPrompt.trim();
  if (!direction) {
    throw new Error("Write a prompt before folding it into the vibe JSON.");
  }
  if (direction.length > MAX_USER_PROMPT_LENGTH) {
    throw new Error("The prompt must be 1,500 characters or fewer.");
  }

  const resolvedDependencies =
    dependencies ?? (await defaultIntelligenceDependencies());
  const response = await resolvedDependencies.fetchImpl(OLLAMA_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolvedDependencies.apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedDependencies.model,
      messages: [
        { role: "system", content: FOLD_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            template,
            user_direction: direction,
          }),
        },
      ],
      temperature: 0.4,
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(
      `Folding your prompt into the vibe JSON failed with HTTP ${response.status}.`
    );
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = completion.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("The intelligence model returned no merged vibe JSON.");
  }

  const merged = parseTemplateFromModelOutput(text);
  return { template: merged, model: resolvedDependencies.model };
}

/* ------------------------------------------------------------------ */
/* Final image-model prompt: identity + vibe JSON + user prompt        */
/* ------------------------------------------------------------------ */

export interface BuildAvatarVibePromptOptions {
  userPrompt: string;
  template: SlideshowAestheticTemplate;
  /** True when the user prompt was already folded into the template. */
  folded: boolean;
  hairstyleDirective?: string;
}

/**
 * Build the JSON-structured prompt fed to the image model when a collection
 * vibe template is attached to avatar generation. The template is embedded
 * verbatim so the JSON is literally what the image model reads; identity rules
 * pin the person to the avatar reference images; the user's prompt rides along
 * as scene_direction unless it was already folded into the template.
 */
export function buildAvatarVibePrompt(
  options: BuildAvatarVibePromptOptions
): string {
  const sceneDirection = options.userPrompt.trim();
  const prompt: Record<string, unknown> = {
    task: "Create one photorealistic image of the avatar person shown in the supplied reference images.",
    identity: {
      references:
        "All supplied reference images show the same avatar person.",
      use_references_for:
        "The person's identity: face, facial structure, eye shape, eyebrow shape, hair color, hair style, hair length, hair texture, skin tone, complexion, and body type.",
      rule: "This is a full person render, not a face swap. The person in the output must be unmistakably the same individual as in the reference images.",
      ...(options.hairstyleDirective?.trim()
        ? { hairstyle_override: options.hairstyleDirective.trim() }
        : {}),
    },
    aesthetic_template: options.template,
    aesthetic_template_rule:
      "Every aesthetic_template value is a directive: it controls mood, lighting, color, composition, environment, camera feel, styling, and finish. Follow it precisely.",
    ...(sceneDirection && !options.folded
      ? {
          scene_direction: sceneDirection,
          scene_direction_rule:
            "Follow scene_direction for the action and scene while keeping every aesthetic_template value. The scene direction wins on what the person does; the template wins on how the image looks and feels.",
        }
      : {}),
    ...(options.folded
      ? {
          scene_direction_rule:
            "The user's scene direction has already been merged into aesthetic_template (subject_direction, composition, environment, storytelling). Follow those fields for the action and scene.",
        }
      : {}),
    output_rules: [
      "Only the avatar person may appear. Do not copy any person, face, or identity from the original inspiration images; the aesthetic_template carries their vibe only.",
      "Keep the result a believable real photograph with natural skin texture and lighting. Avoid plastic skin, beauty-filter smoothness, or AI-portrait polish unless the aesthetic_template explicitly asks for a stylized look.",
      "No text overlays, captions, watermarks, logos, or UI elements unless the user explicitly asked for them.",
      "Do not add extra hands, extra limbs, or physically implausible props.",
    ],
  };

  return JSON.stringify(prompt, null, 2);
}
