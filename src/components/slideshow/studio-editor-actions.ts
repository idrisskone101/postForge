import {
  persistSlideshowProject,
  requestSlideshowCopyVariation,
  requestSlideshowImageGeneration,
} from "@/lib/slideshow/client";
import { slideshowProjectListItemFromDetail, upsertById } from "@/lib/slideshow/list-client";

import type {
  SlideshowImageGenerationResult,
  SlideshowProject,
  SlideshowProjectListItem,
  SlideshowSlide,
} from "./types";

export async function saveStudioProject(input: {
  project: SlideshowProject;
  apiBaseUrl: string;
  onSaveProject?: (
    project: SlideshowProject,
  ) => Promise<SlideshowProject | void>;
}): Promise<SlideshowProject> {
  const saved = input.onSaveProject
    ? await input.onSaveProject(input.project)
    : await persistSlideshowProject(input.project, input.apiBaseUrl);
  if (!saved) return input.project;
  return {
    ...saved,
    clientId: saved.clientId ?? input.project.clientId ?? input.project.id,
  };
}

export function mergeSavedStudioProject(
  current: SlideshowProjectListItem[],
  previousId: string,
  resolved: SlideshowProject,
): SlideshowProjectListItem[] {
  return upsertById(
    current.filter((candidate) => candidate.id !== previousId),
    slideshowProjectListItemFromDetail(resolved),
  );
}

export async function regenerateStudioSlide(
  project: SlideshowProject,
  slide: SlideshowSlide,
  apiBaseUrl: string,
  onRegenerateSlide?: (
    project: SlideshowProject,
    slide: SlideshowSlide,
  ) => Promise<SlideshowProject | Partial<SlideshowSlide> | void>,
) {
  if (onRegenerateSlide) return onRegenerateSlide(project, slide);
  return requestSlideshowCopyVariation(project, slide, apiBaseUrl);
}

export async function regenerateStudioSlideImage(
  project: SlideshowProject,
  slide: SlideshowSlide,
  apiBaseUrl: string,
  onQueuedRevision: (revision: number) => void,
  selectedImageModel: string | null,
  onRegenerateImage?: (
    project: SlideshowProject,
    slide: SlideshowSlide,
    onQueuedRevision: (revision: number) => void,
  ) => Promise<SlideshowImageGenerationResult | void>,
): Promise<SlideshowImageGenerationResult | void> {
  if (onRegenerateImage) {
    return onRegenerateImage(project, slide, onQueuedRevision);
  }
  return requestSlideshowImageGeneration(
    project,
    slide,
    apiBaseUrl,
    onQueuedRevision,
    selectedImageModel ?? undefined,
  );
}
