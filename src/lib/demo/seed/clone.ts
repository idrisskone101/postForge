import { calculateEstimatedCost } from "@/lib/ai/models";
import type { OutputReviewStatus } from "@/lib/output-review-status";
import { avatarIdFor, identityPackIdFor } from "./identities";
import { fileIdFor, jobIdFor } from "./generation";
import type { DemoManifest } from "./manifest";
import { basename, before, demoId, type Age } from "./seed-utils";
import type { DemoSeedPart } from "./types";

const SOURCE_PATH = "tiktok-sources/seed/source-waiter.mp4";
const THUMBNAIL_PATH = "thumbnails/seed/source-waiter.jpg";
const SOURCE_LABEL = "POV: the waiter answered in Spanish (sample clip)";

export const CLONE_SOURCE_ID = demoId("clone-source:waiter");

type CloneTake = {
  slug: string;
  name: string;
  review: OutputReviewStatus;
  /** When the output finished, relative to the restore. */
  age: Age;
};

/**
 * One hook, three creators: the same sample source clip recreated by Ava,
 * Marcus and Diego, so the Clone surface shows the creator A/B test the
 * campaign ran. Marcus's take is the approved one the tour opens.
 */
const TAKES: CloneTake[] = [
  { slug: "marcus", name: "Marcus", review: "approved_output", age: { days: 1, hours: 8 } },
  { slug: "ava", name: "Ava", review: "needs_review", age: { hours: 5, minutes: 20 } },
  { slug: "diego", name: "Diego", review: "needs_review", age: { hours: 4, minutes: 45 } },
];

export function cloneOutputPath(slug: string) {
  return `videos/seed/clone-${slug}-waiter.mp4`;
}

/**
 * The source clip is itself generated sample footage, so "View original"
 * opens the clip here rather than pointing at somebody's social post.
 */
export function buildCloneSeed(manifest: DemoManifest, now: Date): DemoSeedPart {
  const source = manifest.find(SOURCE_PATH);
  if (!source) return {};

  const sourceAt = before(now, { days: 1, hours: 9 });
  const thumbnail = manifest.find(THUMBNAIL_PATH);
  const originalUrl = `/api/ugc-clone/preview?path=${encodeURIComponent(source.path)}`;
  const durationSec = source.durationSec ?? 5;
  const sourceVideo = {
    sourceId: CLONE_SOURCE_ID,
    label: SOURCE_LABEL,
    originalUrl,
    localPath: source.path,
    filename: basename(source.path),
    durationSec,
    width: source.width,
    height: source.height,
  };

  const part: Required<
    Pick<DemoSeedPart, "sources" | "references" | "jobs" | "files" | "costLogs">
  > = {
    sources: [
      {
        id: CLONE_SOURCE_ID,
        label: SOURCE_LABEL,
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
    references: [],
    jobs: [],
    files: [],
    costLogs: [],
  };

  for (const take of TAKES) {
    const avatarId = avatarIdFor(take.slug);
    const reference = manifest.find(`ugc-references/seed/${take.slug}-waiter.jpg`);
    const referenceId = demoId(`clone-reference:${take.slug}-waiter`);
    const completedAt = before(now, take.age);
    if (reference) {
      const referenceAt = new Date(completedAt.getTime() - 9 * 60_000);
      part.references.push({
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
      });
    }

    const output = manifest.find(cloneOutputPath(take.slug));
    if (!output) continue;
    const jobId = jobIdFor(output.path);
    const fileId = fileIdFor(output.path);
    const createdAt = new Date(completedAt.getTime() - 4 * 60_000);
    const outputDuration = Math.round(output.durationSec ?? durationSec);
    const cost = calculateEstimatedCost(output.modelId, { durationSec: outputDuration });
    const prompt = `${take.name} recreates the waiter hook, same framing and gestures.`;

    part.jobs.push({
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
        avatarName: take.name,
        prompt,
        keepOriginalSound: false,
        modelId: output.modelId,
        durationSec: outputDuration,
        removeTextOverlays: false,
        identityPackId: identityPackIdFor(take.slug),
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
    });
    part.files.push({
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
      reviewStatus: take.review,
      createdAt: completedAt,
    });
    part.costLogs.push({
      id: demoId(`cost:${output.path}`),
      jobId,
      model: output.modelId,
      type: "video",
      amount: cost,
      details: { durationSec: outputDuration, prompt, textErasureCost: 0 },
      createdAt: completedAt,
    });
  }
  return part;
}
