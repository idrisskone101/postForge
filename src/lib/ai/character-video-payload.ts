import type { ModelCapabilities } from "@/lib/ai/types";

export interface CharacterVideoPayloadInput {
  strategy: NonNullable<ModelCapabilities["characterReference"]>;
  prompt: string;
  anchorUrl: string;
  identityUrls: string[];
  identityElement?: {
    frontal_image_url: string;
    reference_image_urls: string[];
  };
  duration: number;
  aspectRatio: string;
  enableAudio: boolean;
  negativePrompt?: string;
}

function providerEndpoint(
  strategy: NonNullable<ModelCapabilities["characterReference"]>
): string {
  if (strategy === "kling-element") {
    return "fal-ai/kling-video/v3/standard/image-to-video";
  }
  if (strategy === "seedance-images") {
    return "bytedance/seedance-2.0/reference-to-video";
  }
  return "google/gemini-omni-flash/reference-to-video";
}

function characterContinuityInstruction() {
  return [
    "Keep the character's face, facial structure, age, skin tone, hair color, hair texture, and body proportions consistent in every frame.",
    "Preserve identity through head turns, expression changes, camera movement, and scene cuts.",
    "Avoid face drift, identity changes, morphing, duplicate people, and sudden wardrobe changes.",
  ].join(" ");
}

export function buildCharacterVideoProviderRequest(
  input: CharacterVideoPayloadInput
): { endpoint: string; payload: Record<string, unknown> } {
  const continuity = characterContinuityInstruction();

  if (input.strategy === "kling-element") {
    if (!input.identityElement) {
      throw new Error("Kling character video requires an identity element");
    }
    return {
      endpoint: providerEndpoint(input.strategy),
      payload: {
        prompt: `@Element1 is the character in the opening frame. ${continuity} Motion and scene direction: ${input.prompt}`,
        start_image_url: input.anchorUrl,
        duration: String(input.duration),
        generate_audio: input.enableAudio,
        elements: [input.identityElement],
        ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
      },
    };
  }

  const urls = [input.anchorUrl, ...input.identityUrls];
  if (input.strategy === "seedance-images") {
    const identityLabels = input.identityUrls
      .map((_, index) => `@Image${index + 2}`)
      .join(", ");
    return {
      endpoint: providerEndpoint(input.strategy),
      payload: {
        prompt: `@Image1 is the opening composition. ${identityLabels} show the same character from multiple angles. ${continuity} Motion and scene direction: ${input.prompt}`,
        image_urls: urls,
        resolution: "720p",
        duration: String(input.duration),
        aspect_ratio: input.aspectRatio,
        generate_audio: input.enableAudio,
      },
    };
  }

  const identityLabels = input.identityUrls
    .map((_, index) => `<IMAGE_REF_${index + 1}>`)
    .join(", ");
  return {
    endpoint: providerEndpoint(input.strategy),
    payload: {
      prompt: `<IMAGE_REF_0> is the opening composition. ${identityLabels} show the same character from multiple angles. ${continuity} Motion and scene direction: ${input.prompt}`,
      image_urls: urls,
      duration: input.duration,
      aspect_ratio: input.aspectRatio,
    },
  };
}
