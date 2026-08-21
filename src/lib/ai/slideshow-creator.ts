import { randomUUID } from "crypto";

import { submitToQueue } from "./fal-client";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import {
  calculateEstimatedCost,
  getModel,
  mapAspectRatioToFalFormat,
} from "./models";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type {
  SlideshowAestheticTemplate,
  SlideshowCreatorScene,
  SlideshowCreatorSlideInput,
  SlideshowCreatorVisualsResult,
} from "./slideshow-creator-types";
import {
  isRecord,
  parseSlideshowAestheticTemplate,
  stringOr,
} from "./slideshow-aesthetic";
import {
  buildSlideshowCreatorPrompt,
  planSlideshowCreatorScenes,
} from "./slideshow-creator-prompt";

export { parseSlideshowAestheticTemplate };
export { buildSlideshowCreatorPrompt, planSlideshowCreatorScenes };
export {
  deriveTemplateFromReferences,
  type DeriveTemplateFromReferencesResult,
} from "./slideshow-creator-derive";

export interface SlideshowCreatorVisualsInput {
  projectId: string;
  template: SlideshowAestheticTemplate;
  slides: SlideshowCreatorSlideInput[];
  aspectRatio?: "9:16" | "4:5" | "1:1" | "16:9";
  model?: string;
}

const CREATOR_ASPECT_RATIOS = new Set(["9:16", "4:5", "1:1", "16:9"]);

function sanitizeAspectRatio(value: unknown): "9:16" | "4:5" | "1:1" | "16:9" {
  return CREATOR_ASPECT_RATIOS.has(String(value))
    ? (String(value) as "9:16" | "4:5" | "1:1" | "16:9")
    : "9:16";
}

function sceneFrom(body: Record<string, unknown>): SlideshowCreatorScene {
  const raw = body.scene;
  if (!isRecord(raw)) return {};
  return {
    archetype: stringOr(raw.archetype),
    location: stringOr(raw.location),
    activity: stringOr(raw.activity),
    subject: stringOr(raw.subject),
  };
}

function slideInputFrom(value: unknown): SlideshowCreatorSlideInput {
  if (!isRecord(value)) {
    throw new Error("Each slideshow slide needs an id and text.");
  }
  const slideId = stringOr(value.slideId ?? value.id);
  const text = stringOr(value.text ?? value.headline ?? value.body);
  if (!slideId) throw new Error("A slideshow slide is missing its id.");
  if (!text) throw new Error("A slideshow slide is missing its on-slide text.");
  return { slideId, text, scene: sceneFrom(value) };
}

/**
 * Generate GPT Image 2 visuals for every slide in one project, reserve a job
 * per slide, and attach each job to its slide. Returns the queued jobs.
 *
 * The aesthetic template is frozen; per-slide scenes drive variation. This is
 * intentionally a separate, explicit mutation from editing copy — generating
 * visuals is always the operator's explicit action.
 */
export async function generateSlideshowCreatorVisuals(
  input: SlideshowCreatorVisualsInput
): Promise<SlideshowCreatorVisualsResult> {
  const modelId = input.model?.trim() || "gpt-image-2";
  const model = getModel(modelId);
  if (!model || model.type !== "image") {
    throw new Error(`Unknown slideshow image model: ${modelId}`);
  }
  const aspectRatio = sanitizeAspectRatio(input.aspectRatio);
  const template = parseSlideshowAestheticTemplate(input.template);
  const slides = planSlideshowCreatorScenes(
    template,
    (input.slides ?? []).map(slideInputFrom)
  );
  if (!slides.length) {
    throw new Error("At least one slide is required to generate visuals.");
  }
  if (slides.length > slideshowCreatorLimits.maxSlides) {
    throw new Error(
      `A slideshow can generate visuals for at most ${slideshowCreatorLimits.maxSlides} slides (got ${slides.length}).`
    );
  }

  const project = await prisma.slideshowProject.findUnique({
    where: { id: input.projectId },
    select: { id: true, revision: true },
  });
  if (!project) throw new Error("Slideshow project was not found.");
  const expectedRevision = project.revision;

  const costPerImage = calculateEstimatedCost(modelId, { numImages: 1 });
  const estimatedCost = costPerImage * slides.length;

  const jobs: Array<{ slideId: string; jobId: string; estimatedCost: number }> =
    [];
  const createdJobs: Array<{
    jobId: string;
    projectRevision: number;
    slideId: string;
  }> = [];

  for (const slide of slides) {
    const prompt = buildSlideshowCreatorPrompt(template, slide, aspectRatio);
    // Each per-slide transaction bumps the project revision by 1, so the
    // concurrency guard must expect the revision at this slide's position in
    // the batch (base + already-queued count), not the stale base captured
    // once. Otherwise every deck with 2+ slides would fail on slide 2.
    const queued = await queueCreatorSlideImage({
      projectId: input.projectId,
      slideId: slide.slideId,
      prompt,
      aspectRatio,
      modelId,
      expectedRevision: expectedRevision + createdJobs.length,
    });
    createdJobs.push(queued);
    jobs.push({
      slideId: slide.slideId,
      jobId: queued.jobId,
      estimatedCost: costPerImage,
    });
  }

  const finalRevision = createdJobs[createdJobs.length - 1]?.projectRevision;
  return {
    jobs,
    model: modelId,
    estimatedCost,
    projectRevision: finalRevision ?? expectedRevision,
  };
}

type QueueCreatorSlideInput = {
  projectId: string;
  slideId: string;
  prompt: string;
  aspectRatio: "9:16" | "4:5" | "1:1" | "16:9";
  modelId: string;
  expectedRevision: number;
};

async function queueCreatorSlideImage(input: QueueCreatorSlideInput) {
  const model = getModel(input.modelId)!;
  const falInput: Record<string, unknown> = {
    prompt: input.prompt,
    num_images: 1,
    safety_tolerance: "6",
    quality: "high",
    output_format: "png",
    image_size: mapAspectRatioToFalFormat(input.aspectRatio, input.modelId),
  };

  const jobId = randomUUID();
  // Reserve and submit under a transaction so a crash never leaves a slide
  // pointed at a half-created job.
  const reservation = await prisma.$transaction(async (tx) => {
    const current = await tx.slideshowProject.findUnique({
      where: { id: input.projectId },
      select: { revision: true },
    });
    if (!current) throw new Error("Slideshow project was not found.");
    if (current.revision !== input.expectedRevision) {
      throw new Error(
        "The slideshow changed while generating visuals. Refresh and retry."
      );
    }
    const slide = await tx.slideshowSlide.findFirst({
      where: { id: input.slideId, projectId: input.projectId },
      select: { id: true },
    });
    if (!slide) throw new Error("Slideshow slide was not found.");

    const job = await tx.generationJob.create({
      data: {
        id: jobId,
        type: "image",
        model: input.modelId,
        prompt: input.prompt,
        input: {
          kind: "slideshow-slide-image",
          projectId: input.projectId,
          slideId: input.slideId,
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          falInput,
          falEndpoint: model.endpoint,
          creator: true,
        } as unknown as Prisma.InputJsonValue,
        estimatedCost: calculateEstimatedCost(input.modelId, { numImages: 1 }),
        status: "queued",
        tags: ["slideshow", `slideshow:${input.projectId}`, `slide:${input.slideId}`],
      },
    });
    await tx.slideshowSlide.update({
      where: { id: input.slideId },
      data: {
        generationJobId: job.id,
        generatedFileId: null,
        imageUrl: null,
        imagePrompt: input.prompt,
      },
    });
    await tx.slideshowProject.update({
      where: { id: input.projectId },
      data: { revision: current.revision + 1 },
    });
    return { jobId: job.id, projectRevision: current.revision + 1 };
  });

  let requestId: string;
  try {
    // Fal accepts the request; capture its id so the background poller can
    // later fetch the finished image. Without this, the job would stay
    // "queued" forever because the poller only claims jobs that carry a
    // fal request id.
    const queued = await submitToQueue(model.endpoint, falInput);
    requestId = queued.request_id?.trim();
    if (!requestId) {
      throw new Error("The image provider did not return a request id");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to queue creator image";
    await prisma.generationJob
      .update({
        where: { id: reservation.jobId },
        data: { status: "failed", error: message },
      })
      .catch(() => undefined);
    throw error;
  }

  // Mark the job as processing with the fal request id, then wake the poller
  // so the image gets written back when fal finishes.
  const marked = await prisma.generationJob.updateMany({
    where: {
      id: reservation.jobId,
      status: "queued",
      falRequestId: null,
    },
    data: {
      status: "processing",
      startedAt: new Date(),
      falRequestId: requestId,
      lockOwner: null,
      lockExpiresAt: null,
    },
  });
  if (marked.count === 1) ensurePollerRunning();

  return { ...reservation, slideId: input.slideId };
}

export const slideshowCreatorLimits = {
  maxSlides: 20,
  maxReferenceImages: 14,
} as const;
