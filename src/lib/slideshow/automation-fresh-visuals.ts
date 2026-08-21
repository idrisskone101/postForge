import {
  buildSlideshowImageQueueRequest,
  submitReservedSlideshowImage,
} from "@/lib/ai/slideshow-image";
import { readString, recordOrEmpty } from "@/lib/slideshow/automation-copy";
import {
  readSlideshowAutomationVisualSettings,
  shouldGenerateFreshAutomationVisuals,
} from "@/lib/slideshow/automation-visuals";
import { reserveSlideGenerationJob } from "@/lib/slideshow/persist-generation";

export type SlideshowAutomationFreshVisualDraft = {
  id: string;
  revision: number;
  settings: unknown;
  slides: Array<{
    id: string;
    imagePrompt: string | null;
    generationJobId?: string | null;
  }>;
};

export type SlideshowAutomationFreshVisualDependencies = {
  reserve: typeof reserveSlideGenerationJob;
  submit: typeof submitReservedSlideshowImage;
};

const productionFreshVisualDependencies: SlideshowAutomationFreshVisualDependencies = {
  reserve: reserveSlideGenerationJob,
  submit: submitReservedSlideshowImage,
};

const globalForFreshVisualTasks = globalThis as unknown as {
  __postforge_slideshow_automation_visual_tasks?: Set<Promise<void>>;
};

export async function queueSlideshowAutomationFreshVisuals(
  draft: SlideshowAutomationFreshVisualDraft,
  contentSettings: unknown,
  dependencies: SlideshowAutomationFreshVisualDependencies =
    productionFreshVisualDependencies,
) {
  if (!shouldGenerateFreshAutomationVisuals(contentSettings)) return;

  const { imageModel } = readSlideshowAutomationVisualSettings(contentSettings);
  const projectSettings = recordOrEmpty(draft.settings);
  const aspectRatio = readString(projectSettings.aspectRatio) ?? "9:16";
  let revision = draft.revision;

  // Automation-created drafts already carry atomically persisted job intents.
  // The reserve fallback keeps this helper useful for older/manual callers.
  // Submitting each intent before moving on prevents a later reservation error
  // from leaving all earlier jobs in the queued state.
  for (const slide of draft.slides) {
    if (!slide.imagePrompt?.trim()) continue;
    const request = buildSlideshowImageQueueRequest({
      projectId: draft.id,
      slideId: slide.id,
      prompt: slide.imagePrompt,
      aspectRatio,
      model: imageModel,
    });
    let jobId = slide.generationJobId ?? null;
    if (!jobId) {
      const reservation = await dependencies.reserve(
        draft.id,
        slide.id,
        revision,
        {
          model: request.model,
          prompt: request.prompt,
          input: request.jobInput,
          estimatedCost: request.estimatedCost,
          tags: request.tags,
        },
      );
      revision = reservation.projectRevision;
      jobId = reservation.jobId;
    }
    await dependencies.submit(jobId, request);
  }
}

export function launchSlideshowAutomationFreshVisuals(
  draft: SlideshowAutomationFreshVisualDraft,
  contentSettings: unknown,
  dependencies: SlideshowAutomationFreshVisualDependencies =
    productionFreshVisualDependencies,
) {
  if (!shouldGenerateFreshAutomationVisuals(contentSettings)) return false;

  const task = queueSlideshowAutomationFreshVisuals(
    draft,
    contentSettings,
    dependencies,
  ).catch((error) => {
    console.error(
      `[slideshow-automation-worker] Fresh visuals for draft ${draft.id} failed:`,
      error,
    );
  });
  const tasks =
    globalForFreshVisualTasks.__postforge_slideshow_automation_visual_tasks ??
    new Set<Promise<void>>();
  globalForFreshVisualTasks.__postforge_slideshow_automation_visual_tasks = tasks;
  tasks.add(task);
  void task.finally(() => tasks.delete(task));
  return true;
}
