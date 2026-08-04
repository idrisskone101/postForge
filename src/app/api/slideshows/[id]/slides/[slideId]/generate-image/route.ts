import { NextRequest, NextResponse } from "next/server";
import {
  buildSlideshowImageQueueRequest,
  submitReservedSlideshowImage,
} from "@/lib/ai/slideshow-image";
import { getModel } from "@/lib/ai/models";
import { badRequest } from "@/lib/slideshow/errors";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  prepareSlideImageGeneration,
  reserveSlideGenerationJob,
} from "@/lib/slideshow/service";
import { optionalString, requireRecord } from "@/lib/slideshow/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id, slideId } = await params;
    const raw = await readJsonRequest(request);
    const body = requireRecord(raw);
    const model = optionalString(body, "model", { max: 120 });
    if (model) {
      const modelDefinition = getModel(model);
      if (!modelDefinition || modelDefinition.type !== "image") {
        badRequest(`Unknown slideshow image model: ${model}`);
      }
    }
    const prepared = await prepareSlideImageGeneration(id, slideId, body);
    if (
      body.referenceImageUrls !== undefined &&
      (!Array.isArray(body.referenceImageUrls) ||
        !body.referenceImageUrls.every((value) => typeof value === "string"))
    ) {
      badRequest("referenceImageUrls must be an array of URLs");
    }
    const queueRequest = buildSlideshowImageQueueRequest({
      projectId: id,
      slideId,
      prompt: prepared.prompt,
      aspectRatio: prepared.aspectRatio,
      ...(model ? { model } : {}),
      referenceImageUrls: body.referenceImageUrls as string[] | undefined,
    });
    const reservation = await reserveSlideGenerationJob(
      id,
      slideId,
      prepared.expectedRevision,
      {
        model: queueRequest.model,
        prompt: queueRequest.prompt,
        input: queueRequest.jobInput,
        estimatedCost: queueRequest.estimatedCost,
        tags: queueRequest.tags,
      },
    );
    const submission = await submitReservedSlideshowImage(
      reservation.jobId,
      queueRequest,
    );
    return NextResponse.json(
      {
        id: reservation.jobId,
        jobId: reservation.jobId,
        statusUrl: `/api/jobs/${reservation.jobId}`,
        status: submission.submitted ? "processing" : "failed",
        model: queueRequest.model,
        estimatedCost: queueRequest.estimatedCost,
        projectRevision: reservation.projectRevision,
      },
      { status: 202 }
    );
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to generate slideshow image");
  }
}
