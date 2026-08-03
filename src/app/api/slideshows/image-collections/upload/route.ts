import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { storage } from "@/lib/storage";
import { badRequest } from "@/lib/slideshow/errors";
import { slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  createUploadedSlideshowImageCollection,
  type UploadedSlideshowImage,
} from "@/lib/slideshow/service";

const MAX_UPLOAD_FILES = 20;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;
const acceptedMimeTypes = new Map([
  ["image/jpeg", { extension: "jpg", formats: ["jpeg"] }],
  ["image/png", { extension: "png", formats: ["png"] }],
  ["image/webp", { extension: "webp", formats: ["webp"] }],
]);
const visualKeys = [
  "coral-glow",
  "blue-studio",
  "mint-room",
  "lime-paper",
  "violet-dusk",
  "paper-stack",
];

function booleanFormValue(value: FormDataEntryValue | null, fallback: boolean) {
  if (typeof value !== "string") return fallback;
  return value !== "false" && value !== "0";
}

function fallbackCollectionName(files: File[]) {
  if (files.length !== 1) return `Uploaded set (${files.length})`;
  return files[0].name.replace(/\.[^.]+$/, "").trim() || "Uploaded image";
}

export async function POST(request: NextRequest) {
  const savedPaths: string[] = [];
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_TOTAL_BYTES + 1024 * 1024) {
      badRequest("The upload is too large", "upload_too_large");
    }

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);
    if (!files.length) badRequest("At least one image is required");
    if (files.length > MAX_UPLOAD_FILES) {
      badRequest(`Upload at most ${MAX_UPLOAD_FILES} images at once`);
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      badRequest("The upload is too large", "upload_too_large");
    }

    const autoCaption = booleanFormValue(formData.get("autoCaption"), true);
    const requestedName = formData.get("name");
    const title =
      typeof requestedName === "string" && requestedName.trim()
        ? requestedName.trim()
        : fallbackCollectionName(files);
    const uploaded: UploadedSlideshowImage[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const accepted = acceptedMimeTypes.get(file.type);
      if (!accepted) {
        badRequest("Images must be JPEG, PNG, or WebP", "unsupported_image_type");
      }
      if (file.size < 1 || file.size > MAX_FILE_BYTES) {
        badRequest(
          `Each image must be smaller than ${MAX_FILE_BYTES / 1024 / 1024} MB`,
          "upload_too_large"
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const metadata = await sharp(buffer, {
        limitInputPixels: MAX_INPUT_PIXELS,
        sequentialRead: true,
      }).metadata();
      if (!metadata.format || !accepted.formats.includes(metadata.format)) {
        badRequest("The file contents do not match its image type", "invalid_image");
      }
      if (!metadata.width || !metadata.height) {
        badRequest("The image dimensions could not be read", "invalid_image");
      }

      const filename = `${randomUUID()}.${accepted.extension}`;
      const localPath = await storage.save("slideshow-images", filename, buffer);
      savedPaths.push(localPath);
      uploaded.push({
        localPath,
        mimeType: file.type,
        fileSizeBytes: buffer.length,
        width: metadata.width,
        height: metadata.height,
        altText: autoCaption ? `${title} image ${index + 1}` : null,
        metadata: {
          originalFilename: file.name.slice(0, 240),
          visualKey: visualKeys[index % visualKeys.length],
        },
      });
    }

    const collection = await createUploadedSlideshowImageCollection({
      title,
      images: uploaded,
      autoCaption,
    });
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    await Promise.allSettled(savedPaths.map((localPath) => storage.delete(localPath)));
    return slideshowErrorResponse(error, "Failed to upload slideshow images");
  }
}
