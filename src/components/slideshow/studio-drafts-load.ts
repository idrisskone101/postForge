import { fetchSlideshowProjectPage } from "@/lib/slideshow/list-client";

import type { SlideshowStatusCounts } from "@/lib/slideshow/list-types";

import type { SlideshowProjectListItem } from "./types";

function draftsErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function watchStudioDrafts(input: {
  apiBaseUrl: string;
  enabled: boolean;
  onLoaded: (
    projects: SlideshowProjectListItem[],
    total: number,
    statusCounts: SlideshowStatusCounts | null,
  ) => void;
  onError: (message: string) => void;
  onFinally?: () => void;
}): () => void {
  if (!input.enabled) return () => undefined;
  let active = true;
  void fetchSlideshowProjectPage({ apiBaseUrl: input.apiBaseUrl })
    .then((page) => {
      if (active) input.onLoaded(page.projects, page.total, page.statusCounts);
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
  onLoaded: (
    projects: SlideshowProjectListItem[],
    total: number,
    statusCounts: SlideshowStatusCounts | null,
  ) => void;
  onError: (message: string) => void;
}): () => void {
  if (!input.enabled) return () => undefined;
  let active = true;
  void fetchSlideshowProjectPage({ apiBaseUrl: input.apiBaseUrl })
    .then((page) => {
      if (active) input.onLoaded(page.projects, page.total, page.statusCounts);
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
