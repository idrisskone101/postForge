import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { storage, downloadFromUrl } from "@/lib/storage";
import { subscribeToGeneration, uploadToFalStorage } from "@/lib/ai/fal-client";
import { getModel } from "@/lib/ai/models";
import { getDefaultEditCapableImageModel } from "@/lib/ai/model-availability";
import {
  ALL_ROLE_PROMPTS,
  type AnyIdentityRole,
} from "@/lib/avatar-identity-roles";

export async function generateIdentityRoleImage(
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
