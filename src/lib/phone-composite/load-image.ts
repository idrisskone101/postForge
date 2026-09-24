import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { PhoneCompositeImageSource } from "./types";
import { PhoneCompositeRequestError } from "./request";

export async function loadPhoneCompositeImage(
  source: PhoneCompositeImageSource,
): Promise<Buffer> {
  if (source.kind === "buffer") return source.bytes;

  const file = await prisma.generatedFile.findUnique({
    where: { id: source.id },
    select: { id: true, type: true, mimeType: true, localPath: true },
  });
  if (!file || file.type !== "image" || !file.mimeType.startsWith("image/")) {
    throw new PhoneCompositeRequestError(
      `Image reference was not found: ${source.id}`,
      404,
    );
  }
  return storage.read(file.localPath);
}
