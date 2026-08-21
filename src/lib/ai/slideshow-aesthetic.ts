import type { SlideshowAestheticTemplate } from "./slideshow-creator-types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
    ? (value as string[])
    : undefined;
}

export function stringOr(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Parse and normalize an operator-supplied aesthetic JSON template. Unknown
 * keys are tolerated (preserved by the caller when persisting); the fields the
 * prompt builder relies on are validated here.
 */
export function parseSlideshowAestheticTemplate(
  value: unknown
): SlideshowAestheticTemplate {
  if (!isRecord(value)) {
    throw new Error("The visual template must be a JSON object.");
  }
  const aesthetic = value.aesthetic;
  if (!isRecord(aesthetic)) {
    throw new Error("The visual template is missing its 'aesthetic' section.");
  }
  const coreVibe = stringOr(aesthetic.core_vibe);
  if (!coreVibe) {
    throw new Error(
      "The visual template needs 'aesthetic.core_vibe' to anchor the deck."
    );
  }
  const visualStyle = isRecord(value.visual_style) ? value.visual_style : {};
  if (!stringOr(visualStyle.genre)) {
    throw new Error(
      "The visual template needs 'visual_style.genre' (e.g. editorial lifestyle photography)."
    );
  }

  const mood = stringList(aesthetic.mood)?.slice(0, 20) ?? [];

  return {
    aesthetic: {
      core_vibe: coreVibe,
      mood,
      energy: stringOr(aesthetic.energy),
    },
    visual_style: {
      genre: stringOr(visualStyle.genre)!,
      realism: stringOr(visualStyle.realism) ?? "natural photographic realism",
      finish: stringOr(visualStyle.finish),
      inspiration: stringOr(visualStyle.inspiration),
      avoid: stringList(visualStyle.avoid)?.slice(0, 20),
    },
    lighting: isRecord(value.lighting)
      ? {
          style: stringOr(value.lighting.style),
          exposure: stringOr(value.lighting.exposure),
          contrast: stringOr(value.lighting.contrast),
          highlights: stringOr(value.lighting.highlights),
          atmosphere: stringOr(value.lighting.atmosphere),
        }
      : undefined,
    color: isRecord(value.color)
      ? {
          palette: stringOr(value.color.palette),
          dominant_tones: stringList(value.color.dominant_tones)?.slice(0, 12),
          saturation: stringOr(value.color.saturation),
          temperature: stringOr(value.color.temperature),
          black_and_white: stringOr(value.color.black_and_white),
        }
      : undefined,
    composition: isRecord(value.composition)
      ? {
          style: stringOr(value.composition.style),
          framing: stringOr(value.composition.framing),
          posing: stringOr(value.composition.posing),
          negative_space: stringOr(value.composition.negative_space),
          perspective: stringOr(value.composition.perspective),
          imperfection: stringOr(value.composition.imperfection),
        }
      : undefined,
    subject_direction: isRecord(value.subject_direction)
      ? {
          presence: stringOr(value.subject_direction.presence),
          expression: stringOr(value.subject_direction.expression),
          body_language: stringOr(value.subject_direction.body_language),
          wardrobe: stringOr(value.subject_direction.wardrobe),
          branding: stringOr(value.subject_direction.branding),
        }
      : undefined,
    environment: isRecord(value.environment)
      ? {
          feel: stringOr(value.environment.feel),
          examples: stringList(value.environment.examples)?.slice(0, 12),
          rule: stringOr(value.environment.rule),
        }
      : undefined,
    camera_feel: isRecord(value.camera_feel)
      ? {
          look: stringOr(value.camera_feel.look),
          depth_of_field: stringOr(value.camera_feel.depth_of_field),
          texture: stringOr(value.camera_feel.texture),
          sharpness: stringOr(value.camera_feel.sharpness),
          motion: stringOr(value.camera_feel.motion),
          dynamic_range: stringOr(value.camera_feel.dynamic_range),
        }
      : undefined,
    storytelling: isRecord(value.storytelling)
      ? {
          concept: stringOr(value.storytelling.concept),
          tone: stringOr(value.storytelling.tone),
          luxury: stringOr(value.storytelling.luxury),
        }
      : undefined,
  };
}
