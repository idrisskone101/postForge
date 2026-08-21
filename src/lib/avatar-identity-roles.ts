import type { AvatarIdentityImage, AvatarIdentityPack } from "@/generated/prisma/client";

export const IDENTITY_IMAGE_ROLES = [
  "front",
  "threeQuarterLeft",
  "threeQuarterRight",
  "expressionNeutralOrSmile",
] as const;

export const HAIRSTYLE_VARIANT_ROLES = [
  "hairDown",
  "halfUpHalfDown",
  "ponytail",
  "bunUpdo",
] as const;

export const ALL_IDENTITY_ROLES = [
  ...IDENTITY_IMAGE_ROLES,
  ...HAIRSTYLE_VARIANT_ROLES,
] as const;

export type IdentityImageRole = (typeof IDENTITY_IMAGE_ROLES)[number];
export type HairstyleVariantRole = (typeof HAIRSTYLE_VARIANT_ROLES)[number];
export type AnyIdentityRole = (typeof ALL_IDENTITY_ROLES)[number];

export type PackWithImages = AvatarIdentityPack & { images: AvatarIdentityImage[] };

const CORE_ROLE_SET: ReadonlySet<string> = new Set(IDENTITY_IMAGE_ROLES);

export function isHairstyleVariantRole(role: string): role is HairstyleVariantRole {
  return (HAIRSTYLE_VARIANT_ROLES as readonly string[]).includes(role);
}

export const HAIRSTYLE_VARIANT_LABELS: Record<HairstyleVariantRole, string> = {
  hairDown: "hair worn loose and down",
  halfUpHalfDown: "a half-up, half-down style (a half ponytail)",
  ponytail: "a ponytail",
  bunUpdo: "a neat bun or updo",
};

export function buildHairstyleDirective(role: string): string | undefined {
  if (!isHairstyleVariantRole(role)) {
    return undefined;
  }
  const label = HAIRSTYLE_VARIANT_LABELS[role];
  return `Hairstyle override: the avatar must wear ${label}. Use the hairstyle shown in the FIRST reference image (its styling, parting, and how the hair is worn) as the avatar's hairstyle for this image. If other avatar reference images show a different hairstyle, ignore their hairstyle and follow only the first reference image, while keeping the same natural hair color and texture.`;
}

export function missingHairstyleRoles(
  images: { role: string }[]
): HairstyleVariantRole[] {
  const present = new Set(images.map((image) => image.role));
  return HAIRSTYLE_VARIANT_ROLES.filter((role) => !present.has(role));
}

const ROLE_PROMPTS: Record<IdentityImageRole, string> = {
  front:
    "Create a photorealistic clean identity reference image of the exact same person as the reference. Front-facing head and shoulders portrait, neutral expression, direct eye contact, clean light gray background, even soft lighting, natural skin texture, same face, same hair color, same hairstyle, same age, same facial structure. No text, no watermark, no accessories added, no style change.",
  threeQuarterLeft:
    "Create a photorealistic clean identity reference image of the exact same person as the reference. Head and shoulders portrait turned 45 degrees to the person's left, eyes looking toward camera, clean light gray background, even soft lighting, natural skin texture, same face, same hair color, same hairstyle, same age, same facial structure. No text, no watermark, no accessories added, no style change.",
  threeQuarterRight:
    "Create a photorealistic clean identity reference image of the exact same person as the reference. Head and shoulders portrait turned 45 degrees to the person's right, eyes looking toward camera, clean light gray background, even soft lighting, natural skin texture, same face, same hair color, same hairstyle, same age, same facial structure. No text, no watermark, no accessories added, no style change.",
  expressionNeutralOrSmile:
    "Create a photorealistic clean identity reference image of the exact same person as the reference. Front-facing head and shoulders portrait with a natural subtle smile, clean light gray background, even soft lighting, natural skin texture, same face, same hair color, same hairstyle, same age, same facial structure. No text, no watermark, no accessories added, no style change.",
};

const HAIRSTYLE_GROUNDING =
  "Keep the exact same face, facial structure, age, skin tone and skin texture, and the exact same natural hair color and hair texture as the reference. Only restyle the hair this way if the person's real hair length and type realistically allow it; if their hair is too short or otherwise unsuited to this style, keep their natural hairstyle instead of inventing, lengthening, or adding hair. Do not add hair extensions or wigs, and do not change the hair's length, thickness, or color. Front-facing head and shoulders portrait, direct eye contact, clean light gray background, even soft lighting, natural skin texture. No text, no watermark, no accessories added, no style change.";

const HAIRSTYLE_VARIANT_PROMPTS: Record<HairstyleVariantRole, string> = {
  hairDown: `Create a photorealistic clean identity reference image of the exact same person as the reference, with their hair worn loose and down, falling naturally around the face. ${HAIRSTYLE_GROUNDING}`,
  halfUpHalfDown: `Create a photorealistic clean identity reference image of the exact same person as the reference, with their hair in a half-up, half-down style (a half ponytail) — the top and sides gathered back while the rest falls loose. ${HAIRSTYLE_GROUNDING}`,
  ponytail: `Create a photorealistic clean identity reference image of the exact same person as the reference, with their hair pulled back into a ponytail so the face is fully visible. ${HAIRSTYLE_GROUNDING}`,
  bunUpdo: `Create a photorealistic clean identity reference image of the exact same person as the reference, with their hair styled up into a neat bun or updo so the face is fully visible. ${HAIRSTYLE_GROUNDING}`,
};

export const ALL_ROLE_PROMPTS: Record<AnyIdentityRole, string> = {
  ...ROLE_PROMPTS,
  ...HAIRSTYLE_VARIANT_PROMPTS,
};

function roleOrderIndex(role: string): number {
  const index = (ALL_IDENTITY_ROLES as readonly string[]).indexOf(role);
  return index === -1 ? ALL_IDENTITY_ROLES.length : index;
}

export function orderIdentityImages(images: AvatarIdentityImage[]): AvatarIdentityImage[] {
  return [...images].sort((a, b) => roleOrderIndex(a.role) - roleOrderIndex(b.role));
}

export function coreIdentityImages(images: AvatarIdentityImage[]): AvatarIdentityImage[] {
  return orderIdentityImages(images.filter((image) => CORE_ROLE_SET.has(image.role)));
}
