import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { storage, downloadFromUrl } from "@/lib/storage";
import { subscribeToGeneration, uploadToFalStorage } from "@/lib/ai/fal-client";
import { calculateEstimatedCost, getModel } from "@/lib/ai/models";
import { getDefaultEditCapableImageModel } from "@/lib/ai/model-availability";
import { completeJob, createJob, failJob, startJob } from "@/lib/jobs/queue";
import { logCost } from "@/lib/costs/tracker";
import { Prisma } from "@/generated/prisma/client";
import type { AvatarIdentityImage, AvatarIdentityPack } from "@/generated/prisma/client";

// Core angle roles. These keep the avatar's hairstyle locked and are the
// identity anchor consumed by the reference-image and clone steps. Do not add
// hairstyle variety here — mixing hairstyles in this set degrades the identity
// signal those steps rely on.
export const IDENTITY_IMAGE_ROLES = [
  "front",
  "threeQuarterLeft",
  "threeQuarterRight",
  "expressionNeutralOrSmile",
] as const;

// Hairstyle-variant roles. Generated as additional, selectable options grounded
// in the avatar's real hair. These are NOT fed into the identity-locking
// resolvers (so they never mix into a single reference/clone), they are surfaced
// to the user as alternative looks.
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

const CORE_ROLE_SET: ReadonlySet<string> = new Set(IDENTITY_IMAGE_ROLES);

export function isHairstyleVariantRole(role: string): boolean {
  return (HAIRSTYLE_VARIANT_ROLES as readonly string[]).includes(role);
}

// Human-readable descriptions of each hairstyle, used to build the prompt
// directive when a variant is selected to drive a reference image.
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
  const label = HAIRSTYLE_VARIANT_LABELS[role as HairstyleVariantRole];
  return `Hairstyle override: the avatar must wear ${label}. Use the hairstyle shown in the FIRST reference image (its styling, parting, and how the hair is worn) as the avatar's hairstyle for this image. If other avatar reference images show a different hairstyle, ignore their hairstyle and follow only the first reference image, while keeping the same natural hair color and texture.`;
}

// Tracks in-flight hairstyle backfills (keyed by packId) so we don't kick off
// duplicate generations for the same pack and so the API can report progress.
const hairstyleBackfillsInProgress = new Set<string>();

export function isHairstyleBackfillInProgress(packId: string): boolean {
  return hairstyleBackfillsInProgress.has(packId);
}

function missingHairstyleRoles(
  images: { role: string }[]
): HairstyleVariantRole[] {
  const present = new Set(images.map((image) => image.role));
  return HAIRSTYLE_VARIANT_ROLES.filter((role) => !present.has(role));
}

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

// Shared grounding clause: every hairstyle variant must stay true to the
// person's real hair. The model only restyles when the avatar's actual hair
// length/type allows it — no invented length, extensions, wigs, or color change.
const HAIRSTYLE_GROUNDING =
  "Keep the exact same face, facial structure, age, skin tone and skin texture, and the exact same natural hair color and hair texture as the reference. Only restyle the hair this way if the person's real hair length and type realistically allow it; if their hair is too short or otherwise unsuited to this style, keep their natural hairstyle instead of inventing, lengthening, or adding hair. Do not add hair extensions or wigs, and do not change the hair's length, thickness, or color. Front-facing head and shoulders portrait, direct eye contact, clean light gray background, even soft lighting, natural skin texture. No text, no watermark, no accessories added, no style change.";

const HAIRSTYLE_VARIANT_PROMPTS: Record<HairstyleVariantRole, string> = {
  hairDown: `Create a photorealistic clean identity reference image of the exact same person as the reference, with their hair worn loose and down, falling naturally around the face. ${HAIRSTYLE_GROUNDING}`,
  halfUpHalfDown: `Create a photorealistic clean identity reference image of the exact same person as the reference, with their hair in a half-up, half-down style (a half ponytail) — the top and sides gathered back while the rest falls loose. ${HAIRSTYLE_GROUNDING}`,
  ponytail: `Create a photorealistic clean identity reference image of the exact same person as the reference, with their hair pulled back into a ponytail so the face is fully visible. ${HAIRSTYLE_GROUNDING}`,
  bunUpdo: `Create a photorealistic clean identity reference image of the exact same person as the reference, with their hair styled up into a neat bun or updo so the face is fully visible. ${HAIRSTYLE_GROUNDING}`,
};

const ALL_ROLE_PROMPTS: Record<AnyIdentityRole, string> = {
  ...ROLE_PROMPTS,
  ...HAIRSTYLE_VARIANT_PROMPTS,
};

function roleOrderIndex(role: string): number {
  const index = (ALL_IDENTITY_ROLES as readonly string[]).indexOf(role);
  return index === -1 ? ALL_IDENTITY_ROLES.length : index;
}

function orderIdentityImages(images: AvatarIdentityImage[]): AvatarIdentityImage[] {
  return [...images].sort((a, b) => roleOrderIndex(a.role) - roleOrderIndex(b.role));
}

// Core (hair-locked) images only, ordered. These are what the reference-image
// and clone steps consume — hairstyle variants are intentionally excluded.
function coreIdentityImages(images: AvatarIdentityImage[]): AvatarIdentityImage[] {
  return orderIdentityImages(images.filter((image) => CORE_ROLE_SET.has(image.role)));
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

  if (!pack || coreIdentityImages(pack.images).length < IDENTITY_IMAGE_ROLES.length) {
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
      // Self-heal packs created before hairstyle variants existed by topping up
      // the missing looks without re-rolling the locked core identity.
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

/**
 * Add only the missing hairstyle variants to an avatar that already has an
 * identity pack — without re-rolling its locked core identity images. Used to
 * give pre-existing avatars the new hairstyle options.
 */
export async function ensureHairstyleVariantsForAvatar(
  avatarId: string
): Promise<PackWithImages> {
  const existing = await getReusableAvatarIdentityPack(avatarId);

  // No usable pack yet — a fresh pack already generates the variants.
  if (!existing) {
    return ensureAvatarIdentityPack(avatarId);
  }

  // Still generating; variants are produced as part of that run.
  if (existing.status === "completed") {
    startHairstyleBackfill(existing);
  }

  return existing;
}

/**
 * Synchronously claims a backfill slot (so progress is observable immediately)
 * and kicks off the work in the background. No-ops if nothing is missing or a
 * backfill for this pack is already running.
 */
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

// When a hairstyle variant is selected, lead with that image (so its look is the
// dominant identity signal) and keep the two 3/4 angle shots for face geometry.
// The original front/expression shots are dropped because they most strongly
// assert the avatar's original hairstyle and would compete with the choice.
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

async function generateIdentityRoleImage(
  packId: string,
  avatarUrl: string,
  role: AnyIdentityRole
): Promise<void> {
  const pack = await prisma.avatarIdentityPack.findUnique({
    where: { id: packId },
    select: { imageModel: true },
  });
  const modelId = pack?.imageModel ?? (await getDefaultEditCapableImageModel());
  const modelDef = getModel(modelId);
  const baseEndpoint = modelDef?.endpoint ?? "fal-ai/nano-banana-2";
  const endpoint = `${baseEndpoint}/edit`;

  const result = await subscribeToGeneration(endpoint, {
    prompt: ALL_ROLE_PROMPTS[role],
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

    // Core angle roles are the identity anchor — a failure here fails the pack.
    for (const role of IDENTITY_IMAGE_ROLES) {
      await generateIdentityRoleImage(packId, avatarUrl, role);
      generatedRoles.push(role);
    }

    // Hairstyle variants are additive options. Generate them best-effort so a
    // single failed (or infeasible) hairstyle never blocks the completed pack.
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
