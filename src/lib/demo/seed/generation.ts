import { calculateEstimatedCost } from "@/lib/ai/models";
import type { OutputReviewStatus } from "@/lib/output-review-status";
import type { DemoAsset, DemoManifest } from "./manifest";
import { basename, before, demoId, type Age } from "./seed-utils";
import type { DemoSeedPart } from "./types";

export function jobIdFor(assetPath: string) {
  return demoId(`job:${assetPath}`);
}

export function fileIdFor(assetPath: string) {
  return demoId(`file:${assetPath}`);
}

/**
 * Sample generation history: one completed job, one output, and one cost log
 * per media file, priced from the model registry. Two unfinished jobs and one
 * failed job show the rest of the pipeline; background workers are off in a
 * demo build, so the unfinished ones never call a provider.
 */
export function buildGenerationSeed(manifest: DemoManifest, now: Date): DemoSeedPart {
  const part: Required<Pick<DemoSeedPart, "jobs" | "files" | "costLogs">> = {
    jobs: [],
    files: [],
    costLogs: [],
  };

  for (const entry of COMPLETED_OUTPUTS) {
    addCompletedOutput(part, manifest.asset(entry.path), now, entry);
  }
  part.jobs.push(...unfinishedJobs(manifest, now));
  return part;
}

type CompletedOutput = {
  path: string;
  age: Age;
  review: OutputReviewStatus;
  tags?: string[];
  /** Image this clip was animated from, for image-to-video outputs. */
  from?: string;
};

type GenerationPart = Required<Pick<DemoSeedPart, "jobs" | "files" | "costLogs">>;

const SLIDESHOW = ["slideshow"];

const COMPLETED_OUTPUTS: CompletedOutput[] = [
  { path: "videos/seed/v3-priya-misting.mp4", age: { minutes: 12 }, review: "needs_review", from: "images/seed/g09-priya-misting-herbs.jpg" },
  { path: "images/seed/g01-phone-monstera.jpg", age: { minutes: 26 }, review: "needs_review" },
  { path: "images/seed/g03-maya-watering.jpg", age: { hours: 1, minutes: 30 }, review: "needs_review" },
  { path: "videos/seed/v1-phone-monstera.mp4", age: { hours: 2, minutes: 10 }, review: "needs_review", from: "images/seed/g01-phone-monstera.jpg" },
  { path: "images/seed/g07-jonah-snake-plant.jpg", age: { hours: 3, minutes: 5 }, review: "needs_review" },
  ...slideshowOutputs("sc", { hours: 20 }),
  { path: "images/seed/g09-priya-misting-herbs.jpg", age: { days: 1, hours: 2 }, review: "approved_output" },
  { path: "images/seed/g05-reading-nook.jpg", age: { days: 1, hours: 6 }, review: "approved_output" },
  { path: "videos/seed/v2-reading-nook.mp4", age: { days: 1, hours: 5 }, review: "approved_output", from: "images/seed/g05-reading-nook.jpg" },
  { path: "images/seed/g02-repotting-flatlay.jpg", age: { days: 2, hours: 3 }, review: "approved_output" },
  ...slideshowOutputs("sb", { days: 3, hours: 4 }),
  { path: "images/seed/g04-peace-lily-compare.jpg", age: { days: 3, hours: 9 }, review: "needs_review" },
  { path: "images/seed/g06-new-leaf-macro.jpg", age: { days: 4, hours: 2 }, review: "approved_output" },
  { path: "images/seed/g08-succulent-shelf.jpg", age: { days: 5, hours: 6 }, review: "rejected_output" },
  ...slideshowOutputs("sa", { days: 6, hours: 1 }),
  { path: "images/seed/g10-desk-pothos.jpg", age: { days: 8, hours: 4 }, review: "approved_output" },
  { path: "images/seed/g11-wiping-fiddle-leaf.jpg", age: { days: 11, hours: 7 }, review: "approved_output" },
  { path: "images/seed/g12-plant-unboxing.jpg", age: { days: 14, hours: 3 }, review: "approved_output" },
  { path: "avatars/seed/maya.jpg", age: { days: 16, hours: 2 }, review: "approved_output", tags: ["generate-avatar"] },
  { path: "avatars/seed/priya.jpg", age: { days: 16, hours: 1 }, review: "approved_output", tags: ["generate-avatar"] },
  { path: "avatars/seed/jonah.jpg", age: { days: 15, hours: 5 }, review: "approved_output", tags: ["generate-avatar"] },
  { path: "avatars/seed/theo.jpg", age: { days: 15, hours: 4 }, review: "approved_output", tags: ["generate-avatar"] },
];

function slideshowOutputs(prefix: string, age: Age): CompletedOutput[] {
  return [1, 2, 3, 4, 5].map((index) => ({
    path: `images/seed/${prefix}${index}.jpg`,
    age: { ...age, minutes: (age.minutes ?? 0) - index },
    review: "approved_output" as const,
    tags: SLIDESHOW,
  }));
}

function addCompletedOutput(
  part: GenerationPart,
  asset: DemoAsset,
  now: Date,
  entry: CompletedOutput
) {
  const isVideo = asset.kind === "video";
  const durationSec = Math.round(asset.durationSec ?? 5);
  const durationMs = isVideo ? 96_000 : 11_500;
  const completedAt = before(now, entry.age);
  const createdAt = new Date(completedAt.getTime() - durationMs - 2_000);
  const cost = calculateEstimatedCost(
    asset.modelId,
    isVideo ? { durationSec, enableAudio: false } : { numImages: 1 }
  );
  const jobId = jobIdFor(asset.path);
  const fileId = fileIdFor(asset.path);

  part.jobs.push({
    id: jobId,
    type: asset.kind,
    model: asset.modelId,
    status: "completed",
    queueStage: "completed",
    prompt: asset.prompt,
    input: isVideo
      ? {
          prompt: asset.prompt,
          model: asset.modelId,
          duration: durationSec,
          aspectRatio: asset.aspectRatio,
          collectionAssetIds: [],
          referenceFileId: entry.from ? fileIdFor(entry.from) : null,
          enableAudio: false,
          multiShot: false,
        }
      : {
          prompt: asset.prompt,
          model: asset.modelId,
          aspectRatio: asset.aspectRatio,
          numImages: 1,
          negativePrompt: "",
          referenceFileIds: [],
          collectionAssetIds: [],
          editEndpoint: (asset.referenceKeys?.length ?? 0) > 0,
          enableWebSearch: false,
        },
    output: isVideo
      ? {
          video: {
            url: `/api/files/${fileId}`,
            width: asset.width,
            height: asset.height,
            content_type: asset.mimeType,
          },
          duration: durationSec,
        }
      : { imageCount: 1 },
    attempts: 1,
    estimatedCost: cost,
    actualCost: cost,
    durationMs,
    tags: entry.tags ?? [],
    createdAt,
    startedAt: new Date(createdAt.getTime() + 2_000),
    completedAt,
  });
  part.files.push({
    id: fileId,
    jobId,
    type: asset.kind,
    originalUrl: `postforge-demo://${asset.path}`,
    localPath: asset.path,
    filename: basename(asset.path),
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    durationSec: isVideo ? (asset.durationSec ?? durationSec) : null,
    fileSizeBytes: asset.fileSizeBytes,
    reviewStatus: entry.review,
    createdAt: completedAt,
  });
  part.costLogs.push({
    id: demoId(`cost:${asset.path}`),
    jobId,
    model: asset.modelId,
    type: asset.kind,
    amount: cost,
    details: isVideo
      ? { durationSec, enableAudio: false, prompt: asset.prompt }
      : { numImages: 1, prompt: asset.prompt },
    createdAt: completedAt,
  });
}

function unfinishedJobs(manifest: DemoManifest, now: Date): GenerationPart["jobs"] {
  const still = manifest.asset("images/seed/g11-wiping-fiddle-leaf.jpg");
  const clipPrompt =
    "Slow handheld push in while the cloth wipes across the fiddle leaf fig leaf, soft daylight, natural movement.";
  const imagePrompt =
    "Vertical photo of a kitchen windowsill herb garden in mismatched ceramic pots, morning light, steam rising from a kettle in the background, photorealistic. No text, no logos, no watermarks.";
  const failedPrompt =
    "Time-lapse of a monstera leaf unfurling over a week, locked-off macro shot, soft studio light.";

  return [
    {
      id: demoId("job:active-video"),
      type: "video",
      model: "kling-3.0-i2v",
      status: "processing",
      queueStage: "submitted",
      prompt: clipPrompt,
      input: {
        prompt: clipPrompt,
        model: "kling-3.0-i2v",
        duration: 5,
        aspectRatio: "9:16",
        collectionAssetIds: [],
        referenceFileId: fileIdFor(still.path),
        enableAudio: false,
        multiShot: false,
      },
      attempts: 1,
      estimatedCost: calculateEstimatedCost("kling-3.0-i2v", { durationSec: 5 }),
      tags: [],
      createdAt: before(now, { minutes: 3 }),
      startedAt: before(now, { minutes: 3 }),
    },
    {
      id: demoId("job:queued-image"),
      type: "image",
      model: "nano-banana-2",
      status: "queued",
      queueStage: "queued",
      prompt: imagePrompt,
      input: {
        prompt: imagePrompt,
        model: "nano-banana-2",
        aspectRatio: "9:16",
        numImages: 1,
        negativePrompt: "",
        referenceFileIds: [],
        collectionAssetIds: [],
        editEndpoint: false,
        enableWebSearch: false,
      },
      estimatedCost: calculateEstimatedCost("nano-banana-2", { numImages: 1 }),
      tags: [],
      createdAt: before(now, { minutes: 1 }),
    },
    {
      id: demoId("job:failed-video"),
      type: "video",
      model: "veo3-fast",
      status: "failed",
      queueStage: "failed",
      prompt: failedPrompt,
      input: {
        prompt: failedPrompt,
        model: "veo3-fast",
        duration: 8,
        aspectRatio: "9:16",
        collectionAssetIds: [],
        referenceFileId: null,
        enableAudio: false,
        multiShot: false,
      },
      attempts: 2,
      estimatedCost: calculateEstimatedCost("veo3-fast", { durationSec: 8 }),
      durationMs: 41_000,
      error:
        "The provider timed out before returning a video. Retry the job or pick a shorter duration.",
      tags: [],
      createdAt: before(now, { days: 2, hours: 5 }),
      startedAt: before(now, { days: 2, hours: 5 }),
      completedAt: before(now, { days: 2, hours: 4, minutes: 59 }),
    },
  ];
}
