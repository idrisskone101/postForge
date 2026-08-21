import { platformCollectionAssetUrl } from "@/lib/collections-client";
import {
  fetchSlideshowProject,
  persistSlideshowProject,
  requestSlideshowCreatorVisuals,
  waitForCreatorVisuals,
} from "@/lib/slideshow/client";

import { createProjectFromCreatorCopy } from "./fixtures";
import { applyDirectSlideshowImages } from "./model";
import type {
  SlideshowCreatorGenerateInput,
  SlideshowProject,
} from "./types";

export type StudioCreatorProgress = {
  title: string;
  completed: number;
  total: number;
};

export async function generateStudioCreatorProject(
  input: SlideshowCreatorGenerateInput,
  deps: {
    apiBaseUrl: string;
    openEditor: (project: SlideshowProject) => void;
    showToast: (message: string) => void;
    upsertDraft: (project: SlideshowProject) => void;
    setCreatorProgress: (
      value:
        | StudioCreatorProgress
        | null
        | ((
            current: StudioCreatorProgress | null,
          ) => StudioCreatorProgress | null),
    ) => void;
  },
) {
  const creatorDraft = createProjectFromCreatorCopy({
    hook: input.hook,
    slides: input.slides,
    title: input.title,
    aspectRatio: input.aspectRatio ?? "9:16",
  });
  const directImageUrls = input.directImageAssetIds.map((assetId) =>
    assetId ? platformCollectionAssetUrl(assetId) : null,
  );
  const local: SlideshowProject = applyDirectSlideshowImages({
    ...creatorDraft,
    creator: {
      template: input.template,
      updatedAt: new Date().toISOString(),
    } as NonNullable<SlideshowProject["creator"]>,
  }, directImageUrls);
  const saved = await persistSlideshowProject(local, deps.apiBaseUrl);

  const slidesToGenerate = saved.slides.filter((slide) => !slide.imageUrl);
  if (!slidesToGenerate.length) {
    const assignedCount = saved.slides.filter((slide) => slide.imageUrl).length;
    deps.openEditor(saved);
    deps.showToast(
      `${assignedCount} collection image${assignedCount === 1 ? "" : "s"} added directly to the slideshow.`,
    );
    return;
  }
  const visuals = await requestSlideshowCreatorVisuals(
    saved,
    slidesToGenerate.map((slide) => ({
      slideId: slide.id,
      text: slide.headline || slide.prompt || "",
    })),
    input.template,
    deps.apiBaseUrl,
    {
      model: input.model ?? "gpt-image-2",
      aspectRatio: input.aspectRatio ?? "9:16",
    },
  );

  const generating: SlideshowProject = {
    ...saved,
    status: "generating",
    revision: visuals.projectRevision,
    creator: {
      template: input.template,
      updatedAt: new Date().toISOString(),
    } as NonNullable<SlideshowProject["creator"]>,
  };
  deps.upsertDraft(generating);

  if (visuals.jobs.length > 0) {
    deps.setCreatorProgress({
      title: saved.title,
      completed: 0,
      total: visuals.jobs.length,
    });
    const { failed } = await waitForCreatorVisuals(
      visuals.jobs,
      (completed, total) =>
        deps.setCreatorProgress((current) =>
          current && current.total === total
            ? { ...current, completed }
            : current,
        ),
    );

    const refreshed = await fetchSlideshowProject(saved.id, deps.apiBaseUrl).catch(
      () => generating,
    );
    deps.openEditor(refreshed);

    if (failed.length > 0) {
      deps.showToast(
        `${failed.length} visual${failed.length === 1 ? "" : "s"} failed. Open the slide and tap Regenerate image to retry.`,
      );
    } else {
      deps.showToast(
        `Generated ${visuals.jobs.length} visual${visuals.jobs.length === 1 ? "" : "s"} with ${visuals.model} (~$${visuals.estimatedCost.toFixed(2)}).`,
      );
    }
  } else {
    deps.openEditor(generating);
    deps.showToast("The draft was saved, but no visuals were queued.");
  }
}
