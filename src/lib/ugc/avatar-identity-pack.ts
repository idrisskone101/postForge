import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { uploadToFalStorage } from "@/lib/ai/fal-client";
import { calculateEstimatedCost } from "@/lib/ai/models";
import { getDefaultEditCapableImageModel } from "@/lib/ai/model-availability";
import { completeJob, createJob, failJob, startJob } from "@/lib/jobs/queue";
import { logCost } from "@/lib/costs/tracker";
import { Prisma } from "@/generated/prisma/client";
import { generateIdentityRoleImage } from "@/lib/avatar-identity-generate";
import {
  ALL_IDENTITY_ROLES,
  HAIRSTYLE_VARIANT_ROLES,
  IDENTITY_IMAGE_ROLES,
  isHairstyleVariantRole,
  missingHairstyleRoles,
  orderIdentityImages,
  type PackWithImages,
} from "@/lib/avatar-identity-roles";

export {
  ALL_IDENTITY_ROLES,
  HAIRSTYLE_VARIANT_LABELS,
  HAIRSTYLE_VARIANT_ROLES,
  IDENTITY_IMAGE_ROLES,
  buildHairstyleDirective,
  isHairstyleVariantRole,
  type AnyIdentityRole,
  type HairstyleVariantRole,
  type IdentityImageRole,
} from "@/lib/avatar-identity-roles";

export {
  buildIdentityElementForAvatar,
  getCompletedAvatarIdentityPack,
  resolveIdentityReferenceUrlsForAvatar,
} from "@/lib/avatar-identity-resolve";

const hairstyleBackfillsInProgress = new Set<string>();

export function isHairstyleBackfillInProgress(packId: string): boolean {
  return hairstyleBackfillsInProgress.has(packId);
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
    backfillingHairstyles: isHairstyleBackfillInProgress(pack.id),
    missingHairstyleRoles: missingHairstyleRoles(pack.images),
    images: orderIdentityImages(pack.images).map((image) => ({
      id: image.id,
      role: image.role,
      kind: isHairstyleVariantRole(image.role)
        ? ("hairstyle" as const)
        : ("core" as const),
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
      if (existing.status === "completed") {
        startHairstyleBackfill(existing);
      }
      return existing;
    }
  }

  const imageModel = await getDefaultEditCapableImageModel();
  let pack: PackWithImages;
  try {
    pack = await prisma.avatarIdentityPack.create({
      data: {
        avatarId,
        status: "queued",
        imageModel,
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

  let activityJobId: string;
  try {
    const activityJob = await createJob({
      type: "image",
      model: imageModel,
      prompt: `Prepare identity references for ${avatar.name}`,
      input: {
        kind: "avatar-identity-pack",
        avatarId,
        identityPackId: pack.id,
        roles: [...ALL_IDENTITY_ROLES],
      },
      estimatedCost: calculateEstimatedCost(imageModel, {
        numImages: ALL_IDENTITY_ROLES.length,
      }),
      tags: ["avatar-identity", `avatar:${avatarId}`, `identity-pack:${pack.id}`],
    });
    activityJobId = activityJob.id;
  } catch (error) {
    await prisma.avatarIdentityPack.delete({ where: { id: pack.id } }).catch(() => {});
    throw error;
  }

  executeAvatarIdentityPackGeneration(pack.id, activityJobId).catch((error) => {
    console.error(`[avatar-identity-pack] Failed to generate pack ${pack.id}:`, error);
  });

  return pack;
}

export async function ensureHairstyleVariantsForAvatar(
  avatarId: string
): Promise<PackWithImages> {
  const existing = await getReusableAvatarIdentityPack(avatarId);

  if (!existing) {
    return ensureAvatarIdentityPack(avatarId);
  }

  if (existing.status === "completed") {
    startHairstyleBackfill(existing);
  }

  return existing;
}

function startHairstyleBackfill(pack: PackWithImages): boolean {
  if (hairstyleBackfillsInProgress.has(pack.id)) {
    return false;
  }
  if (missingHairstyleRoles(pack.images).length === 0) {
    return false;
  }

  hairstyleBackfillsInProgress.add(pack.id);
  runHairstyleBackfill(pack.id).catch((error) => {
    console.error(
      `[avatar-identity-pack] Hairstyle backfill failed for pack ${pack.id}:`,
      error
    );
  });

  return true;
}

async function runHairstyleBackfill(packId: string): Promise<void> {
  let activityJobId: string | null = null;
  const startedAt = Date.now();

  try {
    const pack = await prisma.avatarIdentityPack.findUnique({
      where: { id: packId },
      include: { avatar: true, images: true },
    });
    if (!pack) {
      return;
    }

    const missing = missingHairstyleRoles(pack.images);
    if (missing.length === 0) {
      return;
    }

    const activityJob = await createJob({
      type: "image",
      model: pack.imageModel,
      prompt: `Prepare hairstyle references for ${pack.avatar.name}`,
      input: {
        kind: "avatar-identity-hairstyles",
        avatarId: pack.avatarId,
        identityPackId: pack.id,
        roles: missing,
      },
      estimatedCost: calculateEstimatedCost(pack.imageModel, {
        numImages: missing.length,
      }),
      tags: [
        "avatar-identity-hairstyles",
        `avatar:${pack.avatarId}`,
        `identity-pack:${pack.id}`,
      ],
    });
    activityJobId = activityJob.id;
    await startJob(activityJobId);

    const avatarFullPath = await storage.ensureLocalFile(pack.avatar.localPath);
    const avatarUrl = await uploadToFalStorage(avatarFullPath);
    const generatedRoles: string[] = [];

    for (const role of missing) {
      try {
        await generateIdentityRoleImage(packId, avatarUrl, role);
        generatedRoles.push(role);
      } catch (error) {
        console.warn(
          `[avatar-identity-pack] Failed hairstyle backfill ${role} for pack ${packId}:`,
          error
        );
      }
    }

    if (generatedRoles.length === 0) {
      throw new Error("No hairstyle reference images could be generated");
    }

    const cost = calculateEstimatedCost(pack.imageModel, {
      numImages: generatedRoles.length,
    });
    await completeJob(
      activityJobId,
      { kind: "avatar-identity-hairstyles", identityPackId: pack.id, generatedRoles },
      Date.now() - startedAt
    );
    await logCost(activityJobId, pack.imageModel, "image", cost, {
      identityPackId: pack.id,
      avatarId: pack.avatarId,
      roles: generatedRoles,
    }).catch((error) => {
      console.error(`[avatar-identity-pack] Failed to log backfill cost ${activityJobId}:`, error);
    });
  } catch (error) {
    if (activityJobId) {
      const message =
        error instanceof Error ? error.message : "Failed to generate hairstyle references";
      await failJob(activityJobId, message).catch(console.error);
    }
    throw error;
  } finally {
    hairstyleBackfillsInProgress.delete(packId);
  }
}

async function executeAvatarIdentityPackGeneration(
  packId: string,
  activityJobId: string
): Promise<void> {
  const pack = await prisma.avatarIdentityPack.findUnique({
    where: { id: packId },
    include: { avatar: true },
  });

  if (!pack) {
    await failJob(activityJobId, "Identity pack was removed before generation").catch(console.error);
    return;
  }

  const startedAt = Date.now();
  await Promise.all([
    prisma.avatarIdentityPack.update({
      where: { id: packId },
      data: { status: "processing", error: null },
    }),
    startJob(activityJobId),
  ]);

  try {
    const avatarFullPath = await storage.ensureLocalFile(pack.avatar.localPath);
    const avatarUrl = await uploadToFalStorage(avatarFullPath);
    const generatedRoles: string[] = [];

    for (const role of IDENTITY_IMAGE_ROLES) {
      await generateIdentityRoleImage(packId, avatarUrl, role);
      generatedRoles.push(role);
    }

    for (const role of HAIRSTYLE_VARIANT_ROLES) {
      try {
        await generateIdentityRoleImage(packId, avatarUrl, role);
        generatedRoles.push(role);
      } catch (variantError) {
        console.warn(
          `[avatar-identity-pack] Skipping hairstyle variant ${role} for pack ${packId}:`,
          variantError
        );
      }
    }

    const cost = calculateEstimatedCost(pack.imageModel, {
      numImages: generatedRoles.length,
    });
    await Promise.all([
      prisma.avatarIdentityPack.update({
        where: { id: packId },
        data: { status: "completed", error: null },
      }),
      completeJob(
        activityJobId,
        { kind: "avatar-identity-pack", identityPackId: packId, generatedRoles },
        Date.now() - startedAt
      ),
    ]);
    await logCost(activityJobId, pack.imageModel, "image", cost, {
      identityPackId: packId,
      avatarId: pack.avatarId,
      roles: generatedRoles,
    }).catch((error) => {
      console.error(`[avatar-identity-pack] Failed to log pack cost ${activityJobId}:`, error);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate identity pack";
    await Promise.all([
      prisma.avatarIdentityPack.update({
        where: { id: packId },
        data: { status: "failed", error: message },
      }),
      failJob(activityJobId, message),
    ]);
    throw error;
  }
}
