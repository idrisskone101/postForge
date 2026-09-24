import { addGeneratedFile, completeJob, createJob, failJob, startJob } from "@/lib/jobs/queue";
import { storage } from "@/lib/storage";
import { compositePhoneScreenshot } from "./composite";
import { loadPhoneCompositeImage } from "./load-image";
import { renderScenePlaceholder } from "./placeholder";
import { getPhoneScene } from "./scenes";
import type { ParsedPhoneCompositeRequest } from "./types";
import { PHONE_COMPOSITE_MODEL, PHONE_COMPOSITE_TAG } from "./types";

export async function createPhoneCompositeJob(
  request: ParsedPhoneCompositeRequest,
): Promise<{
  jobId: string;
  fileId: string;
  width: number;
  height: number;
}> {
  const scene = getPhoneScene(request.scene);
  const screenshot = await loadPhoneCompositeImage(request.screenshot);
  const base =
    request.base && !request.usePlaceholder
      ? await loadPhoneCompositeImage(request.base)
      : await renderScenePlaceholder(request.scene);
  const screen = request.corners ?? scene.screen;
  const started = Date.now();
  const job = await createJob({
    type: "image",
    model: PHONE_COMPOSITE_MODEL,
    prompt: scene.prompt,
    estimatedCost: 0,
    tags: [PHONE_COMPOSITE_TAG],
    input: {
      kind: "phone-composite",
      scene: request.scene,
      usePlaceholder: request.usePlaceholder && !request.base,
      baseFileId: request.base?.kind === "generated-file" ? request.base.id : null,
      screenshotFileId:
        request.screenshot.kind === "generated-file" ? request.screenshot.id : null,
    },
  });

  await startJob(job.id);
  try {
    const composite = await compositePhoneScreenshot({
      base,
      screenshot,
      screen,
    });
    const filename = `${job.id}-0.png`;
    const localPath = await storage.save("images", filename, composite.buffer);
    const file = await addGeneratedFile({
      jobId: job.id,
      type: "image",
      originalUrl: `phone-composite://${job.id}`,
      localPath,
      filename,
      mimeType: "image/png",
      width: composite.width,
      height: composite.height,
      fileSizeBytes: composite.buffer.length,
    });
    await completeJob(
      job.id,
      { fileId: file.id, width: composite.width, height: composite.height },
      Date.now() - started,
    );
    return {
      jobId: job.id,
      fileId: file.id,
      width: composite.width,
      height: composite.height,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Phone screenshot composite failed";
    console.error("[phone-composite] Failed to composite job", job.id, error);
    await failJob(job.id, message);
    throw error;
  }
}
