import { prisma } from "@/lib/db";
import type { AutomationRecord } from "@/lib/automations";
import { assertSocialPublishMediaSizeBytes } from "@/lib/integrations/publishing";
import { storage } from "@/lib/storage";
import { AutomationPublicationClaimError } from "./publication-claim-error";

export type ApprovedVideo = {
  id: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  fileSizeBytes: number | null;
  localPath: string;
};

export async function assertStoredPublishMedia(
  localPath: string,
  recordedSize: number | null
) {
  if (recordedSize !== null) {
    assertSocialPublishMediaSizeBytes(recordedSize);
  }
  let actualSize: number;
  try {
    actualSize = await storage.size(localPath);
  } catch {
    throw new AutomationPublicationClaimError(
      "The approved video's stored media is unavailable",
      422
    );
  }
  assertSocialPublishMediaSizeBytes(actualSize);
  if (recordedSize !== null && recordedSize !== actualSize) {
    throw new AutomationPublicationClaimError(
      "The approved video's stored size changed; regenerate and approve it before publishing",
      409
    );
  }
  return actualSize;
}

export async function loadApprovedVideo(
  automation: AutomationRecord,
  requestedAssetId: unknown
): Promise<ApprovedVideo> {
  const assetId =
    typeof requestedAssetId === "string" ? requestedAssetId.trim() : "";
  if (!assetId || assetId !== automation.content.sourceFileId) {
    throw new AutomationPublicationClaimError(
      "Select the automation's approved Gallery video before publishing",
      422
    );
  }
  const file = await prisma.generatedFile.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      type: true,
      width: true,
      height: true,
      durationSec: true,
      fileSizeBytes: true,
      localPath: true,
      reviewStatus: true,
    },
  });
  if (
    !file ||
    file.type !== "video" ||
    !file.mimeType.startsWith("video/") ||
    file.reviewStatus !== "approved_output" ||
    !(await storage.exists(file.localPath))
  ) {
    throw new AutomationPublicationClaimError(
      "Publishing requires a generated Gallery video marked Approved output",
      422
    );
  }
  await assertStoredPublishMedia(file.localPath, file.fileSizeBytes);
  return file;
}

export async function loadPublicationVideo(assetId: string): Promise<ApprovedVideo> {
  const file = await prisma.generatedFile.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      type: true,
      width: true,
      height: true,
      durationSec: true,
      fileSizeBytes: true,
      localPath: true,
    },
  });
  if (
    !file ||
    file.type !== "video" ||
    !file.mimeType.startsWith("video/") ||
    !(await storage.exists(file.localPath))
  ) {
    throw new AutomationPublicationClaimError(
      "The original video is unavailable for resumable upload recovery",
      409
    );
  }
  await assertStoredPublishMedia(file.localPath, file.fileSizeBytes);
  return file;
}
