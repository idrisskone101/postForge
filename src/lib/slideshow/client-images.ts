import type {
  SlideshowProject,
  SlideshowSlide,
} from "@/components/slideshow/types";
import { isLocalSlideshowId } from "@/components/slideshow/types";
import {
  SlideshowApiError,
  asNumber,
  asString,
  delay,
  isRecord,
  readJsonResponse,
} from "@/lib/slideshow/client-request";

interface SlideshowImageJob {
  status?: string;
  error?: string | null;
  outputs?: Array<{ id?: string; url?: string }>;
  slideshow?: {
    projectRevision?: number;
    imageUrl?: string | null;
    generatedFileId?: string | null;
  } | null;
}

export async function requestSlideshowImageGeneration(
  project: SlideshowProject,
  slide: SlideshowSlide,
  apiBaseUrl = "/api/slideshows",
  onQueuedRevision?: (revision: number) => void,
  model?: string,
) {
  if (isLocalSlideshowId(project.id) || slide.id.startsWith("local-slide-")) {
    throw new SlideshowApiError(
      "Wait for the draft to finish saving before generating an image.",
      409,
    );
  }

  const response = await fetch(
    `${apiBaseUrl}/${encodeURIComponent(project.id)}/slides/${encodeURIComponent(slide.id)}/generate-image`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revision: project.revision ?? 0,
        prompt: slide.prompt,
        ...(model ? { model } : {}),
      }),
    },
  );
  const data = await readJsonResponse(response);
  const record = isRecord(data) ? data : {};
  const jobId = asString(record.jobId ?? record.id);
  const statusUrl = asString(record.statusUrl);
  const projectRevision = asNumber(record.projectRevision, project.revision ?? 0);
  onQueuedRevision?.(projectRevision);
  if (!jobId) {
    throw new SlideshowApiError("Image generation did not return a job id.", 500);
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (attempt > 0) await delay(1800);
    const jobResponse = await fetch(
      statusUrl || `/api/jobs/${encodeURIComponent(jobId)}`,
      {
        cache: "no-store",
      },
    );
    const jobData = (await readJsonResponse(jobResponse)) as SlideshowImageJob;
    if (jobData.status === "failed") {
      throw new SlideshowApiError(
        jobData.error || "Image generation failed.",
        500,
      );
    }
    if (jobData.status === "completed") {
      const output = jobData.outputs?.[0];
      const completedRevision = asNumber(
        jobData.slideshow?.projectRevision,
        projectRevision,
      );
      const completedImageUrl = jobData.slideshow?.imageUrl ?? output?.url;
      const completedFileId =
        jobData.slideshow?.generatedFileId ?? output?.id;
      if (!completedFileId && !completedImageUrl) {
        throw new SlideshowApiError(
          "Image generation completed without an output.",
          500,
        );
      }
      return {
        imageUrl:
          completedImageUrl ?? `/api/files/${completedFileId}`,
        generatedFileId: completedFileId ?? undefined,
        projectRevision: completedRevision,
      };
    }
  }

  throw new SlideshowApiError(
    "Image generation is taking longer than expected. Try again shortly.",
    408,
  );
}
