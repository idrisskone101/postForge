import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { storage, downloadFromUrl } from "@/lib/storage";
import { subscribeToGeneration, uploadToFalStorage } from "@/lib/ai/fal-client";
import { Prisma } from "@/generated/prisma/client";
import type { AvatarIdentityImage, AvatarIdentityPack } from "@/generated/prisma/client";

export const IDENTITY_IMAGE_ROLES = [
  "front",
  "threeQuarterLeft",
  "threeQuarterRight",
  "expressionNeutralOrSmile",
] as const;

export type IdentityImageRole = (typeof IDENTITY_IMAGE_ROLES)[number];

type PackWithImages = AvatarIdentityPack & { images: AvatarIdentityImage[] };

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

function orderIdentityImages(images: AvatarIdentityImage[]): AvatarIdentityImage[] {
  return [...images].sort(
    (a, b) =>
      IDENTITY_IMAGE_ROLES.indexOf(a.role as IdentityImageRole) -
      IDENTITY_IMAGE_ROLES.indexOf(b.role as IdentityImageRole)
  );
}

export async function getLatestAvatarIdentityPack(
  avatarId: string
): Promise<PackWithImages | null> {
  return prisma.avatarIdentityPack.findFirst({
    where: { avatarId },
    orderBy: { createdAt: "desc" },
    include: { images: true },
  });
}

async function getReusableAvatarIdentityPack(
  avatarId: string
): Promise<PackWithImages | null> {
  return prisma.avatarIdentityPack.findFirst({
    where: {
      avatarId,
      status: { in: ["completed", "queued", "processing"] },
    },
    orderBy: { createdAt: "desc" },
    include: { images: true },
  });
}

export async function getCompletedAvatarIdentityPack(
  avatarId: string
): Promise<PackWithImages | null> {
  const pack = await prisma.avatarIdentityPack.findFirst({
    where: { avatarId, status: "completed" },
    orderBy: { createdAt: "desc" },
    include: { images: true },
  });

  if (!pack || pack.images.length < IDENTITY_IMAGE_ROLES.length) {
    return null;
  }

  return { ...pack, images: orderIdentityImages(pack.images) };
}

export function serializeAvatarIdentityPack(pack: PackWithImages | null) {
  if (!pack) {
    return null;
  }

  return {
    id: pack.id,
    avatarId: pack.avatarId,
    status: pack.status,
    imageModel: pack.imageModel,
    error: pack.error,
    createdAt: pack.createdAt.toISOString(),
    updatedAt: pack.updatedAt.toISOString(),
    images: orderIdentityImages(pack.images).map((image) => ({
      id: image.id,
      role: image.role,
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      fileSizeBytes: image.fileSizeBytes,
      previewUrl: `/api/avatars/${pack.avatarId}/identity-pack/images/${image.id}`,
      createdAt: image.createdAt.toISOString(),
    })),
  };
}

export async function ensureAvatarIdentityPack(
  avatarId: string,
  options: { force?: boolean } = {}
): Promise<PackWithImages> {
  const avatar = await prisma.avatar.findUnique({ where: { id: avatarId } });
  if (!avatar) {
    throw new Error(`Avatar not found: ${avatarId}`);
  }

  if (!options.force) {
    const existing = await getReusableAvatarIdentityPack(avatarId);
    if (existing) {
      return existing;
    }
  }

  let pack: PackWithImages;
  try {
    pack = await prisma.avatarIdentityPack.create({
      data: {
        avatarId,
        status: "queued",
        imageModel: "nano-banana-2",
      },
      include: { images: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await getReusableAvatarIdentityPack(avatarId);
      if (existing) {
        return existing;
      }
    }

    throw error;
  }

  executeAvatarIdentityPackGeneration(pack.id).catch((error) => {
    console.error(`[avatar-identity-pack] Failed to generate pack ${pack.id}:`, error);
  });

  return pack;
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
    const orderedImages = orderIdentityImages(pack.images);
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
  avatarId: string
): Promise<{
  identityPackId: string | null;
  identityReferenceRoles: string[];
  identityReferenceUrls: string[];
  usedAvatarFallback: boolean;
}> {
  const pack = await getCompletedAvatarIdentityPack(avatarId);

  if (pack) {
    const orderedImages = orderIdentityImages(pack.images);
    const urls = await Promise.all(
      orderedImages.map(async (image) =>
        uploadToFalStorage(await storage.ensureLocalFile(image.localPath))
      )
    );

    return {
      identityPackId: pack.id,
      identityReferenceRoles: orderedImages.map((image) => image.role),
      identityReferenceUrls: urls,
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
    usedAvatarFallback: true,
  };
}

async function executeAvatarIdentityPackGeneration(packId: string): Promise<void> {
  const pack = await prisma.avatarIdentityPack.findUnique({
    where: { id: packId },
    include: { avatar: true },
  });

  if (!pack) {
    return;
  }

  await prisma.avatarIdentityPack.update({
    where: { id: packId },
    data: { status: "processing", error: null },
  });

  try {
    const avatarFullPath = await storage.ensureLocalFile(pack.avatar.localPath);
    const avatarUrl = await uploadToFalStorage(avatarFullPath);

    for (const role of IDENTITY_IMAGE_ROLES) {
      const result = await subscribeToGeneration("fal-ai/nano-banana-2/edit", {
        prompt: ROLE_PROMPTS[role],
        image_urls: [avatarUrl],
        aspect_ratio: "1:1",
        num_images: 1,
        safety_tolerance: "6",
        thinking_level: "high",
      });

      const data = result.data as {
        images?: {
          url: string;
          width?: number;
          height?: number;
          content_type?: string;
        }[];
      };
      const image = data.images?.[0];
      if (!image?.url) {
        throw new Error(`No image returned for identity role ${role}`);
      }

      const { buffer, contentType } = await downloadFromUrl(image.url);
      const extension = contentType.includes("png") ? "png" : "jpg";
      const filename = `${packId}-${role}-${randomUUID()}.${extension}`;
      const localPath = await storage.save("avatar-identity-packs", filename, buffer);

      await prisma.avatarIdentityImage.upsert({
        where: { packId_role: { packId, role } },
        update: {
          localPath,
          filename,
          mimeType: contentType,
          width: image.width,
          height: image.height,
          fileSizeBytes: buffer.length,
          originalUrl: image.url,
        },
        create: {
          packId,
          role,
          localPath,
          filename,
          mimeType: contentType,
          width: image.width,
          height: image.height,
          fileSizeBytes: buffer.length,
          originalUrl: image.url,
        },
      });
    }

    await prisma.avatarIdentityPack.update({
      where: { id: packId },
      data: { status: "completed", error: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate identity pack";
    await prisma.avatarIdentityPack.update({
      where: { id: packId },
      data: { status: "failed", error: message },
    });
    throw error;
  }
}
