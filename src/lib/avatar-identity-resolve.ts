import type { AvatarIdentityImage } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { uploadToFalStorage } from "@/lib/ai/fal-client";
import {
  IDENTITY_IMAGE_ROLES,
  coreIdentityImages,
  isHairstyleVariantRole,
  orderIdentityImages,
  type PackWithImages,
} from "@/lib/avatar-identity-roles";

export async function getCompletedAvatarIdentityPack(
  avatarId: string
): Promise<PackWithImages | null> {
  const pack = await prisma.avatarIdentityPack.findFirst({
    where: { avatarId, status: "completed" },
    orderBy: { createdAt: "desc" },
    include: { images: true },
  });

  if (!pack || coreIdentityImages(pack.images).length < IDENTITY_IMAGE_ROLES.length) {
    return null;
  }

  return { ...pack, images: orderIdentityImages(pack.images) };
}

function buildHairstyleReferenceImages(
  images: AvatarIdentityImage[],
  hairstyleRole: string
): AvatarIdentityImage[] | null {
  const variant = images.find((image) => image.role === hairstyleRole);
  if (!variant) {
    return null;
  }

  const geometry = ["threeQuarterLeft", "threeQuarterRight"]
    .map((role) => images.find((image) => image.role === role))
    .filter((image): image is AvatarIdentityImage => Boolean(image));

  return [variant, ...geometry];
}

export async function buildIdentityElementForAvatar(
  avatarId: string
): Promise<{
  identityPackId: string | null;
  identityElementImageUrls: string[];
  element: { frontal_image_url: string; reference_image_urls: string[] };
}> {
  const pack = await getCompletedAvatarIdentityPack(avatarId);

  if (pack) {
    const orderedImages = coreIdentityImages(pack.images);
    const urls = await Promise.all(
      orderedImages.map(async (image) =>
        uploadToFalStorage(await storage.ensureLocalFile(image.localPath))
      )
    );

    return {
      identityPackId: pack.id,
      identityElementImageUrls: urls,
      element: {
        frontal_image_url: urls[0],
        reference_image_urls: urls.slice(1),
      },
    };
  }

  const avatar = await prisma.avatar.findUnique({ where: { id: avatarId } });
  if (!avatar) {
    throw new Error(`Avatar not found: ${avatarId}`);
  }

  const avatarUrl = await uploadToFalStorage(await storage.ensureLocalFile(avatar.localPath));
  return {
    identityPackId: null,
    identityElementImageUrls: [avatarUrl],
    element: {
      frontal_image_url: avatarUrl,
      reference_image_urls: [avatarUrl],
    },
  };
}

export async function resolveIdentityReferenceUrlsForAvatar(
  avatarId: string,
  options: { hairstyleRole?: string | null } = {}
): Promise<{
  identityPackId: string | null;
  identityReferenceRoles: string[];
  identityReferenceUrls: string[];
  appliedHairstyleRole: string | null;
  usedAvatarFallback: boolean;
}> {
  const pack = await getCompletedAvatarIdentityPack(avatarId);

  if (pack) {
    let orderedImages: AvatarIdentityImage[] | null = null;
    let appliedHairstyleRole: string | null = null;

    if (options.hairstyleRole && isHairstyleVariantRole(options.hairstyleRole)) {
      const variantSet = buildHairstyleReferenceImages(pack.images, options.hairstyleRole);
      if (variantSet) {
        orderedImages = variantSet;
        appliedHairstyleRole = options.hairstyleRole;
      }
    }

    if (!orderedImages) {
      orderedImages = coreIdentityImages(pack.images);
    }

    const urls = await Promise.all(
      orderedImages.map(async (image) =>
        uploadToFalStorage(await storage.ensureLocalFile(image.localPath))
      )
    );

    return {
      identityPackId: pack.id,
      identityReferenceRoles: orderedImages.map((image) => image.role),
      identityReferenceUrls: urls,
      appliedHairstyleRole,
      usedAvatarFallback: false,
    };
  }

  const avatar = await prisma.avatar.findUnique({ where: { id: avatarId } });
  if (!avatar) {
    throw new Error(`Avatar not found: ${avatarId}`);
  }

  const avatarUrl = await uploadToFalStorage(await storage.ensureLocalFile(avatar.localPath));
  return {
    identityPackId: null,
    identityReferenceRoles: ["avatarFallback", "avatarFallback", "avatarFallback"],
    identityReferenceUrls: [avatarUrl, avatarUrl, avatarUrl],
    appliedHairstyleRole: null,
    usedAvatarFallback: true,
  };
}
