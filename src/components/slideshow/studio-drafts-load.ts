import { fetchSlideshowProjects } from "@/lib/slideshow/client";

import type { SlideshowProjectListItem } from "./types";

function draftsErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function watchStudioDrafts(input: {
  apiBaseUrl: string;
  enabled: boolean;
  onLoaded: (projects: SlideshowProjectListItem[]) => void;
  onError: (message: string) => void;
  onFinally?: () => void;
}): () => void {
  if (!input.enabled) return () => undefined;
  let active = true;
  void fetchSlideshowProjects(input.apiBaseUrl)
    .then((loaded) => {
      if (active) input.onLoaded(loaded);
    })
    .catch((error) => {
      if (active) {
        input.onError(
          draftsErrorMessage(error, "Could not load slideshow drafts."),
        );
      }
    })
    .finally(() => {
      if (active) input.onFinally?.();
    });
  return () => {
    active = false;
  };
}

export function watchStudioDraftsRefresh(input: {
  apiBaseUrl: string;
  enabled: boolean;
  onLoaded: (projects: SlideshowProjectListItem[]) => void;
  onError: (message: string) => void;
}): () => void {
  if (!input.enabled) return () => undefined;
  let active = true;
  void fetchSlideshowProjects(input.apiBaseUrl)
    .then((loaded) => {
      if (active) input.onLoaded(loaded);
    })
    .catch((error) => {
      if (active) {
        input.onError(
          draftsErrorMessage(error, "Could not refresh slideshow drafts."),
        );
      }
    });
  return () => {
    active = false;
  };
}
