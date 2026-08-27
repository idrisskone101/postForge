import type { PromptTemplateRecord } from "@/lib/prompt-templates";

export const BEFORE_IDENTITY_TEMPLATE_ID = "builtin-before-identity";

export const BEFORE_IDENTITY_PROMPT =
  "Use the supplied avatar as the exact person. Photorealistic 9:16 iPhone front-camera bathroom selfie. Lived-in residential bathroom: large wall mirror, warm painted walls, quartz vanity, inset sink, chrome faucet, soap, folded towel, three-bulb vanity light, ordinary clutter, real reflections and lens noise. Phone held one-handed high and slightly in front. Phone and arms stay out of frame. Show only head, neck, shoulders, upper T-shirt. Subject leans forward and looks down. The photo is about the hairline, temples, mid-scalp, and crown. Balding must be obvious at a glance: deep M-shaped temple recession, receded uneven hairline, heavy diffuse thinning across the whole top, scalp clearly visible through sparse separated strands, wispy thin frontal hair, thin crown. Do not give him a full or thick head of hair. If the scalp is not immediately obvious, the image failed. Keep the avatar face, skin, facial hair, age, and clothing. Candid progress photo. No text or UI.";

export const BEFORE_IDENTITY_NEGATIVE_PROMPT =
  "full head of hair, thick hair, dense coverage, lush hair, healthy hairline, no visible scalp, both arms visible, hands visible, phone visible, selfie stick, third-person camera, studio, cinematic, beauty filter, watermark, text";

export const BEFORE_IDENTITY_HAIR_DIRECTIVE =
  "Hair override: do not copy hairline, hair density, hair length, or scalp coverage from the reference images. The scene direction controls recession and thinning. Keep the same natural hair color only where any hair remains.";

const BEFORE_IDENTITY_STRENGTH_MARKERS = [
  "Balding must be obvious at a glance",
  "deep M-shaped temple recession",
  "receded uneven hairline",
  "heavy diffuse thinning across the whole top",
  "scalp clearly visible through sparse separated strands",
  "Do not give him a full or thick head of hair",
  "If the scalp is not immediately obvious, the image failed",
] as const;

export function resolveAvatarGenerationPrompt(input: {
  prompt: string;
  aspectRatio?: string;
  negativePrompt?: string;
}): {
  prompt: string;
  aspectRatio: string;
  negativePrompt?: string;
  hairstyleDirective?: string;
} {
  const parsed = parseStructuredGenerationPrompt(input.prompt);
  const prompt = parsed?.prompt ?? input.prompt.trim();
  const aspectRatio = parsed?.aspectRatio || input.aspectRatio || "9:16";
  const before = isBeforeIdentityPrompt(prompt);
  const negativePrompt = joinNegativePrompts([
    input.negativePrompt,
    parsed?.negativePrompt,
    before ? BEFORE_IDENTITY_NEGATIVE_PROMPT : undefined,
  ]);

  return {
    prompt,
    aspectRatio,
    negativePrompt,
    hairstyleDirective: before ? BEFORE_IDENTITY_HAIR_DIRECTIVE : undefined,
  };
}

export function isBeforeIdentityPrompt(prompt: string): boolean {
  return BEFORE_IDENTITY_STRENGTH_MARKERS.every((marker) => prompt.includes(marker));
}

export function builtinBeforeIdentityTemplate(): PromptTemplateRecord {
  return {
    id: BEFORE_IDENTITY_TEMPLATE_ID,
    kind: "prompt-template",
    name: "Before",
    prompt: BEFORE_IDENTITY_PROMPT,
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z",
  };
}

function parseStructuredGenerationPrompt(raw: string): {
  prompt: string;
  aspectRatio?: string;
  negativePrompt?: string;
} | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (typeof record.prompt !== "string" || !record.prompt.trim()) {
      return null;
    }
    return {
      prompt: record.prompt.trim(),
      aspectRatio:
        typeof record.aspect_ratio === "string" && record.aspect_ratio.trim()
          ? record.aspect_ratio.trim()
          : undefined,
      negativePrompt:
        typeof record.negative_prompt === "string" && record.negative_prompt.trim()
          ? record.negative_prompt.trim()
          : undefined,
    };
  } catch {
    return null;
  }
}

function joinNegativePrompts(parts: Array<string | undefined>): string | undefined {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const part of parts) {
    for (const token of (part ?? "").split(",")) {
      const value = token.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(value);
    }
  }
  return merged.length > 0 ? merged.join(", ") : undefined;
}
