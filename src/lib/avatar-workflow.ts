export type AvatarOrigin = "uploaded" | "imported" | "generated" | "gallery";

export type AvatarIdentityPackSummary = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
};

export type AvatarSeedReferenceImage = {
  name: string;
  size: number;
  type: string;
};

export type AvatarCandidateGenerationRequest = {
  prompt: string;
  model: "nano-banana-2";
  aspectRatio: "9:16";
  numImages: 3;
  referenceImageUrls: string[];
};

export type AvatarCandidateArtifact = {
  fileId: string;
};

export type AvatarCandidateSet = {
  jobId: string;
  candidates: AvatarCandidateArtifact[];
};

const AVATAR_GENERATION_STYLE_PROMPT = [
  "Create a photorealistic avatar with a Pinterest-style pretty girl, soft baddie, girly pop UGC creator aesthetic.",
  "Use an iPhone influencer selfie feel with natural iPhone available light, slight grain, realistic skin texture, soft baby hairs, subtle flyaways, and imperfect real-photo sharpness.",
  "The person should feel attractive, warm, feminine, approachable, and aspirational, not intimidating.",
  "Favor warm medium tan glowing skin, brunette hair, full natural brows, almond brown eyes, glossy nude pink-brown lips, soft blush, clean-girl soft glam, gold hoop earrings, and feminine fitted basics such as a white cami, ribbed tank, baby tee, or simple white dress when relevant.",
  "Keep the look Pinterest attractive it-girl and relatable UGC creator, not overly polished, not glossy AI, not a studio headshot, not cold high-fashion editorial retouching.",
].join(" ");

export function buildAvatarGenerationPrompt(userPrompt: string): string {
  return `${AVATAR_GENERATION_STYLE_PROMPT} User direction: ${userPrompt.trim()}`;
}

export function getAvatarOptionLabel(index: number): string {
  return `Identity ${index + 1}`;
}

export function getAvatarOriginLabel(origin: AvatarOrigin | undefined): string | null {
  if (origin === "imported") return "Imported";
  if (origin === "generated") return "Generated";
  if (origin === "gallery") return "Gallery";
  return null;
}

export function getAvatarIdentityPackStatusLabel(
  identityPack: AvatarIdentityPackSummary | null | undefined,
): string {
  if (!identityPack) return "Identity preparing";
  if (identityPack.status === "completed") return "Identity ready";
  if (identityPack.status === "failed") return "Identity failed - retry available";
  return "Identity preparing";
}

export function getAvatarImportReadiness(rawJson: string, seedReferenceImageCount: number) {
  let jsonError: string | null = null;
  let seedError: string | null = null;

  try {
    JSON.parse(rawJson);
  } catch {
    jsonError = "Avatar Profile must be valid JSON.";
  }

  if (seedReferenceImageCount < 1) {
    seedError = "Add at least 1 Seed Reference Image.";
  } else if (seedReferenceImageCount > 5) {
    seedError = "Use no more than 5 Seed Reference Images.";
  }

  return {
    canGenerateCandidates: !jsonError && !seedError,
    jsonError,
    seedError,
  };
}

export function getDefaultAvatarImportName(rawJson: string): string {
  try {
    const profile = JSON.parse(rawJson) as { name?: unknown; displayName?: unknown };
    const name = typeof profile.name === "string" ? profile.name.trim() : "";
    if (name) return name.slice(0, 40);

    const displayName =
      typeof profile.displayName === "string" ? profile.displayName.trim() : "";
    if (displayName) return displayName.slice(0, 40);
  } catch {
    return "Imported Avatar";
  }

  return "Imported Avatar";
}

export function buildAvatarCandidateGenerationRequest({
  rawJson,
  seedReferenceImageUrls,
}: {
  rawJson: string;
  seedReferenceImageUrls: string[];
}): AvatarCandidateGenerationRequest {
  const profile = JSON.parse(rawJson);

  return {
    model: "nano-banana-2",
    aspectRatio: "9:16",
    numImages: 3,
    referenceImageUrls: seedReferenceImageUrls,
    prompt: [
      "Generate single-image avatar candidates for review: each output is exactly one standalone vertical 9:16 selfie of a single person.",
      "Render every candidate as a real, slightly low-quality iPhone front-camera selfie — a candid phone snapshot, NOT a clean studio portrait and NOT a polished AI render.",
      "Bake in authentic phone-photo imperfection: visible sensor grain and digital noise (stronger in shadows), soft and slightly blurry front-camera focus that is not razor-sharp, mild JPEG/compression texture, front-camera flatness with modest dynamic range, a subtle warm color cast, and a slight lens vignette. Lean low-resolution, like a slightly soft saved Instagram-story screenshot rather than a crisp high-megapixel photo.",
      "Keep skin real and visibly unretouched: real pores, faint under-eye texture, light freckles or a small beauty mark, mild uneven and patchy skin tone, natural lip lines, tiny flyaway hairs, slight shine or oiliness in the T-zone, faint blemishes or natural redness, and slight natural facial asymmetry. It should clearly read as a real unfiltered face. No beauty-filter smoothing, no airbrushing, no poreless or waxy plastic skin, no glossy AI sheen.",
      "Match the Seed Reference Images closely: facial structure, skin tone, hair color and texture, brow shape, eye shape, lip shape, and expression range should stay close. Preserve the same stable core identity and distinctive traits so this is not a generic default avatar or another existing brunette creator face; do not invent a different face.",
      "Keep her attractive with soft, tasteful sex appeal through confident eye contact, a relaxed flirty expression, feminine posture, and a flattering crop, with naturally full nude-glossy lips that still look real — sun-kissed and pretty, never explicit, never oversexualized, never plastic.",
      "Vary wardrobe and color across candidates with tasteful, mildly revealing Pinterest-style outfits: crop tops, off-shoulder tops, fitted tanks, ribbed camis, halter-style tops, baby tees, corset-style tops, slip dresses, oversized button-ups worn open over a top, denim, or athleisure in different colors; do not repeat the same white-cami look every time.",
      "Use candid selfie framing at eye level or a slight handheld angle, subject caught mid-sentence with lips slightly parted and eyes toward the camera, in casual available light (natural window light, warm sunlight, overhead room light, or soft indoor ambient) that can be slightly uneven or unflattering and casts real shine, shadow, and texture across the skin instead of even beauty lighting; close-up to half-body crop, no full-body editorial setup.",
      "Keep a believable real-life background with true context — bedroom, kitchen, car, cafe, bar, mirror, street, or outdoor setting — lightly blurred but recognizable, never a blank studio backdrop.",
      "The result must read as a real person's casual phone selfie: imperfect, candid, lightly low-fidelity, and believable — not flawless, not glossy, not overly polished, not editorial, not a studio headshot.",
      "Strictly avoid an AI beauty-render look, 3D/CGI smoothness, over-smoothed skin, studio or ring-light lighting with perfect catchlights, perfectly symmetrical features, HDR over-sharpening, and magazine retouching.",
      "Use all provided Seed Reference Images as the identity reference set for every candidate.",
      "Do not combine or collage the seed images into the output.",
      "No collage, no contact sheet, no multi-panel layout, no grid, no split-screen, no before-and-after comparison; exactly one person per image.",
      `Avatar Profile JSON: ${JSON.stringify(profile)}`,
    ].join(" "),
  };
}
