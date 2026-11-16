import { calculateEstimatedCost } from "@/lib/ai/models";
import { avatarIdFor, identityPackIdFor } from "./identities";
import { fileIdFor, jobIdFor } from "./generation";
import type { DemoManifest } from "./manifest";
import { basename, before, demoId } from "./seed-utils";
import type { DemoSeedPart } from "./types";

const SOURCE_PATH = "tiktok-sources/seed/source-snake-plant.mp4";
const THUMBNAIL_PATH = "thumbnails/seed/source-snake-plant.jpg";
const REFERENCE_PATH = "ugc-references/seed/maya-snake-plant.jpg";
const OUTPUT_PATH = "videos/seed/clone-maya-snake-plant.mp4";

export const CLONE_SOURCE_ID = demoId("clone-source:snake-plant");

/**
 * One finished Clone: a sample source clip, the reference still that puts the
 * Avatar into its scene, and the motion-transfer output. The source clip is
 * itself generated sample footage, so "View original" opens the clip here
 * rather than pointing at somebody's social post.
 */
export function buildCloneSeed(manifest: DemoManifest, now: Date): DemoSeedPart {
  const source = manifest.find(SOURCE_PATH);
  if (!source) return {};

  const avatarId = avatarIdFor("maya");
  const sourceAt = before(now, { days: 1, hours: 9 });
  const thumbnail = manifest.find(THUMBNAIL_PATH);
  const originalUrl = `/api/ugc-clone/preview?path=${encodeURIComponent(source.path)}`;
  const label = "Snake plant intro (sample clip)";
  const durationSec = source.durationSec ?? 5;

  const part: DemoSeedPart = {
    sources: [
      {
        id: CLONE_SOURCE_ID,
        label,
        originalUrl,
        localPath: source.path,
        filename: basename(source.path),
        durationSec,
        width: source.width,
        height: source.height,
        fileSizeBytes: source.fileSizeBytes,
        thumbnailPath: thumbnail?.path ?? null,
        createdAt: sourceAt,
        updatedAt: sourceAt,
      },
    ],
  };

  const reference = manifest.find(REFERENCE_PATH);
  const referenceId = demoId("clone-reference:maya-snake-plant");
  if (reference) {
    const referenceAt = before(now, { days: 1, hours: 8, minutes: 40 });
    part.references = [
      {
        id: referenceId,
        avatarId,
        tikTokSourceId: CLONE_SOURCE_ID,
        sourceVideoPathSnapshot: source.path,
        prompt: reference.prompt,
        localPath: reference.path,
        filename: basename(reference.path),
        mimeType: reference.mimeType,
        width: reference.width,
        height: reference.height,
        fileSizeBytes: reference.fileSizeBytes,
        createdAt: referenceAt,
        updatedAt: referenceAt,
      },
    ];
  }

  const output = manifest.find(OUTPUT_PATH);
  if (!output) return part;

  const jobId = jobIdFor(output.path);
  const fileId = fileIdFor(output.path);
  const completedAt = before(now, { days: 1, hours: 8 });
  const createdAt = new Date(completedAt.getTime() - 4 * 60_000);
  const outputDuration = Math.round(output.durationSec ?? durationSec);
  const cost = calculateEstimatedCost(output.modelId, { durationSec: outputDuration });
  const prompt = "Maya recreates the snake plant intro, same framing and gestures.";
  const sourceVideo = {
    sourceId: CLONE_SOURCE_ID,
    label,
    originalUrl,
    localPath: source.path,
    filename: basename(source.path),
    durationSec,
    width: source.width,
    height: source.height,
  };

  part.jobs = [
    {
      id: jobId,
      type: "video",
      model: output.modelId,
      status: "completed",
      queueStage: "completed",
      prompt,
      input: {
        tiktokSourceId: CLONE_SOURCE_ID,
        tiktokVideoPath: source.path,
        avatarId,
        avatarName: "Maya",
        prompt,
        keepOriginalSound: false,
        modelId: output.modelId,
        durationSec: outputDuration,
        removeTextOverlays: false,
        identityPackId: identityPackIdFor("maya"),
        ...(reference ? { savedReferenceId: referenceId } : {}),
        sourceVideo,
        sourceVideoSnapshot: sourceVideo,
      },
      output: {
        video: {
          url: `/api/files/${fileId}`,
          width: output.width,
          height: output.height,
          content_type: output.mimeType,
        },
        duration: outputDuration,
      },
      attempts: 1,
      estimatedCost: cost,
      actualCost: cost,
      durationMs: 4 * 60_000,
      tags: ["ugc-clone"],
      createdAt,
      startedAt: new Date(createdAt.getTime() + 3_000),
      completedAt,
    },
  ];
  part.files = [
    {
      id: fileId,
      jobId,
      type: "video",
      originalUrl: `postforge-demo://${output.path}`,
      localPath: output.path,
      filename: basename(output.path),
      mimeType: output.mimeType,
      width: output.width,
      height: output.height,
      durationSec: output.durationSec ?? outputDuration,
      fileSizeBytes: output.fileSizeBytes,
      reviewStatus: "needs_review",
      createdAt: completedAt,
    },
  ];
  part.costLogs = [
    {
      id: demoId(`cost:${output.path}`),
      jobId,
      model: output.modelId,
      type: "video",
      amount: cost,
      details: { durationSec: outputDuration, prompt, textErasureCost: 0 },
      createdAt: completedAt,
    },
  ];
  return part;
}
