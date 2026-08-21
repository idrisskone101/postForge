import { normalizeSlideshowSlides } from "@/components/slideshow/model";
import type {
  SlideshowAspectRatio,
  SlideshowProject,
} from "@/components/slideshow/types";
import { isLocalSlideshowId } from "@/components/slideshow/types";
import {
  SlideshowApiError,
  asNumber,
  asString,
  delay,
  isRecord,
  readJsonResponse,
  unwrapProject,
} from "@/lib/slideshow/client-request";
import { fetchSlideshowProjectPage } from "@/lib/slideshow/list-client";
import {
  parseSlideshowProject,
  slideshowProjectWriteBody,
} from "@/lib/slideshow/project";

export { SlideshowApiError };
export {
  createSlideshowAutomation,
  deleteSlideshowAutomation,
  fetchSlideshowAutomations,
  updateSlideshowAutomation,
  updateSlideshowAutomationStatus,
} from "@/lib/slideshow/client-automations";
export { downloadSlideshowExport } from "@/lib/slideshow/client-export";
export { requestSlideshowImageGeneration } from "@/lib/slideshow/client-images";
export {
  requestSlideshowCopyVariation,
  requestSlideshowStory,
} from "@/lib/slideshow/client-story";

export function deserializeSlideshowProject(input: unknown): SlideshowProject {
  const project = parseSlideshowProject(input);
  return {
    ...project,
    slides: normalizeSlideshowSlides(project.slides, project.includeCta),
  };
}

export function serializeSlideshowProject(project: SlideshowProject) {
  return slideshowProjectWriteBody(project);
}

export async function fetchSlideshowProjects(apiBaseUrl = "/api/slideshows") {
  return (await fetchSlideshowProjectPage({ apiBaseUrl })).projects;
}

export async function fetchSlideshowProject(
  id: string,
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowProject> {
  if (isLocalSlideshowId(id)) {
    throw new SlideshowApiError(
      "Wait for the draft to finish saving before fetching it.",
      409,
    );
  }
  const response = await fetch(
    `${apiBaseUrl}/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  return deserializeSlideshowProject(unwrapProject(await readJsonResponse(response)));
}

export async function persistSlideshowProject(
  project: SlideshowProject,
  apiBaseUrl = "/api/slideshows",
) {
  const creating = isLocalSlideshowId(project.id);
  const response = await fetch(
    creating ? apiBaseUrl : `${apiBaseUrl}/${encodeURIComponent(project.id)}`,
    {
      method: creating ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(!creating ? { revision: project.revision ?? 0 } : {}),
        ...serializeSlideshowProject(project),
      }),
    },
  );
  return deserializeSlideshowProject(unwrapProject(await readJsonResponse(response)));
}

export async function requestSlideshowCreatorDerive(
  apiBaseUrl = "/api/slideshows",
  options: {
    collectionAssetIds?: string[];
    referenceImageUrls?: string[];
    idempotencyKey?: string;
  } = {},
) {
  const response = await fetch(`${apiBaseUrl}/creator/derive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionAssetIds: options.collectionAssetIds ?? [],
      referenceImageUrls: options.referenceImageUrls ?? [],
      idempotencyKey: options.idempotencyKey,
    }),
  });
  const data = await readJsonResponse(response);
  const record = isRecord(data) ? data : {};
  return {
    template: isRecord(record.template) ? record.template : null,
    model: asString(record.model),
    referenceCount: asNumber(record.referenceCount, 0),
    error: asString(record.error),
  };
}

export async function requestSlideshowCreatorVisuals(
  project: SlideshowProject,
  slides: Array<{
    slideId: string;
    text: string;
    scene?: { location?: string; activity?: string; subject?: string };
  }>,
  template: unknown,
  apiBaseUrl = "/api/slideshows",
  options: { model?: string; aspectRatio?: SlideshowAspectRatio } = {},
) {
  if (isLocalSlideshowId(project.id)) {
    throw new SlideshowApiError(
      "Wait for the draft to finish saving before generating visuals.",
      409,
    );
  }
  const response = await fetch(
    `${apiBaseUrl}/${encodeURIComponent(project.id)}/generate-visuals`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template,
        slides,
        aspectRatio: options.aspectRatio ?? project.aspectRatio ?? "9:16",
        model: options.model ?? "gpt-image-2",
      }),
    },
  );
  const data = await readJsonResponse(response);
  const record = isRecord(data) ? data : {};
  return {
    jobs: Array.isArray(record.jobs) ? record.jobs : [],
    model: asString(record.model, "gpt-image-2"),
    estimatedCost: asNumber(record.estimatedCost, 0),
    projectRevision: asNumber(record.projectRevision, project.revision ?? 0),
    error: asString(record.error),
  };
}

export type CreatorJobStatus = {
  status: "queued" | "processing" | "completed" | "failed";
  error?: string | null;
  imageUrl?: string | null;
};

/**
 * Wait until every queued creator job reaches a terminal state, returning the
 * number completed and a list of failures. Polls each job's status endpoint.
 * Never throws for provider failures; failures are surfaced to the caller so
 * the operator can retry individual slides inside the editor.
 */
export async function waitForCreatorVisuals(
  jobs: Array<{ jobId: string }>,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ completed: number; failed: Array<{ jobId: string; error: string }> }> {
  const results = new Map<string, { status: string; error?: string }>();
  const deadline = Date.now() + 4 * 60 * 1000; // generous 4 min cap

  while (Date.now() < deadline) {
    const pending = jobs.filter((job) => {
      const current = results.get(job.jobId);
      return !current || (current.status !== "completed" && current.status !== "failed");
    });
    if (pending.length === 0) break;

    await Promise.all(
      pending.map(async (job) => {
        try {
          const response = await fetch(`/api/jobs/${encodeURIComponent(job.jobId)}`, {
            cache: "no-store",
          });
          const data = (await response.json()) as { status?: string; error?: string | null };
          results.set(job.jobId, {
            status: data.status ?? "processing",
            error: data.error ?? undefined,
          });
        } catch {
          // transient network error — retry on the next tick
        }
      }),
    );

    const completed = [...results.values()].filter((r) => r.status === "completed").length;
    onProgress?.(completed, jobs.length);

    const allSettled = jobs.every((job) => {
      const current = results.get(job.jobId);
      return current && (current.status === "completed" || current.status === "failed");
    });
    if (allSettled) break;
    await delay(1800);
  }

  const completed = [...results.values()].filter((r) => r.status === "completed").length;
  const failed = jobs
    .filter((job) => results.get(job.jobId)?.status === "failed")
    .map((job) => ({
      jobId: job.jobId,
      error: results.get(job.jobId)?.error ?? "Generation failed.",
    }));
  return { completed, failed };
}
