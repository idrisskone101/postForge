import { getProviderCredential } from "@/lib/providers/credentials";
import { getDefaultVisionIntelligenceModel } from "./model-availability";
import { parseSlideshowAestheticTemplate } from "./slideshow-aesthetic";
import type { SlideshowAestheticTemplate } from "./slideshow-creator-types";

const OLLAMA_CHAT_URL = "https://ollama.com/v1/chat/completions";

function stripMarkdownFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The vision model returned no JSON template.");
  }
  return candidate.slice(start, end + 1);
}

function extractTemplate(text: string): SlideshowAestheticTemplate {
  const json = JSON.parse(stripMarkdownFence(text));
  return parseSlideshowAestheticTemplate(json);
}

const DERIVE_SYSTEM_PROMPT = `You are PostForge's visual director. You analyze reference images and distill them into a single structured JSON "aesthetic template" that will drive fresh image generations with GPT Image 2.

Analyze the shared visual identity across the reference images: the mood and energy, the photographic genre and realism level, lighting, color palette and temperature, composition and framing, how any subject is directed (presence, expression, body language, wardrobe, branding), the environment feel, the camera feel (depth of field, grain, sharpness, motion), and the underlying storytelling concept.

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
Keep every value concrete and grounded in what you actually observe. Do not invent attributes that contradict the references. The core_vibe must capture the shared identity.`;

type DeriveDependencies = {
  model: string;
  apiKey: string;
  fetchImpl: typeof fetch;
};

async function defaultDeriveDependencies(): Promise<DeriveDependencies> {
  const storedKey = await getProviderCredential("ollama");
  const apiKey = storedKey?.trim() ?? process.env.OLLAMA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "An Ollama connection is required to derive a visual template from reference images. Connect Ollama in Settings, then retry."
    );
  }
  const visionModel = await getDefaultVisionIntelligenceModel();
  if (!visionModel) {
    throw new Error(
      "No vision-capable intelligence model is available. Add one to the story model catalog."
    );
  }
  return {
    model: visionModel.ollamaId,
    apiKey,
    fetchImpl: globalThis.fetch,
  };
}

export type DeriveTemplateFromReferencesResult = {
  template: SlideshowAestheticTemplate;
  model: string;
  referenceCount: number;
};

const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Ollama Cloud's OpenAI-compatible endpoint rejects plain image URLs, so
 * every reference image is downloaded server-side and inlined as a base64
 * data URI. Failures stay explicit — a missing image must never be silently
 * dropped from the derivation.
 */
async function fetchReferenceImageDataUri(
  url: string,
  fetchImpl: typeof fetch
): Promise<string> {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(
      `A reference image could not be fetched (HTTP ${response.status}). Remove it and retry.`
    );
  }
  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  const mimeType =
    contentType && /^image\/(jpeg|png|webp|gif)$/.test(contentType)
      ? contentType
      : "image/jpeg";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) {
    throw new Error("A reference image was empty. Remove it and retry.");
  }
  if (bytes.length > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error(
      "A reference image exceeds the 10 MB limit for template derivation. Remove it and retry."
    );
  }
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

/**
 * Download reference images (fal-storage URLs), inline them as base64 data
 * URIs for the vision model, and derive the aesthetic JSON template used to
 * generate fresh, on-brand visuals.
 *
 * If the vision credential is missing the derivation is left unavailable and
 * reported to the caller — never silently replaced with a generic template.
 */
export async function deriveTemplateFromReferences(
  referenceUrls: string[],
  dependencies?: DeriveDependencies
): Promise<DeriveTemplateFromReferencesResult> {
  const resolvedDependencies = dependencies ?? (await defaultDeriveDependencies());
  const urls = (referenceUrls ?? [])
    .filter((url) => typeof url === "string" && /^https?:\/\//.test(url))
    .slice(0, 14);
  if (!urls.length) {
    throw new Error("At least one reference image is required.");
  }

  const endpoint = OLLAMA_CHAT_URL;
  const imageParts = await Promise.all(
    urls.map(async (url) => ({
      type: "image_url" as const,
      image_url: {
        url: await fetchReferenceImageDataUri(url, resolvedDependencies.fetchImpl),
      },
    }))
  );
  const response = await resolvedDependencies.fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolvedDependencies.apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedDependencies.model,
      messages: [
        { role: "system", content: DERIVE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze these reference images and return the aesthetic template JSON.",
            },
            ...imageParts,
          ],
        },
      ],
      temperature: 0.6,
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(
      `Template derivation failed with HTTP ${response.status}.`
    );
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = completion.choices?.[0]?.message?.content;
  if (!text) throw new Error("The vision model returned no template.");

  const template = extractTemplate(text);
  return {
    template,
    model: resolvedDependencies.model,
    referenceCount: urls.length,
  };
}
