import { useEffect, type Dispatch, type SetStateAction } from "react";

import { fetchModelsCatalog } from "@/lib/ai/models-client";
import { fetchPlatformCollections } from "@/lib/collections-client";

import {
  connectStudioDrafts,
  connectStudioDraftsRefresh,
} from "./slideshow-studio-runtime";
import type {
  SlideshowCollection,
  SlideshowProject,
  SlideshowProjectListItem,
  SlideshowSection,
} from "./types";

export function useSlideshowStudioBootstrap(input: {
  apiBaseUrl: string;
  initialProjects: SlideshowProjectListItem[] | undefined;
  section: SlideshowSection;
  activeProject: SlideshowProject | null;
  setImageModels: Dispatch<SetStateAction<Array<{ id: string; name: string }>>>;
  setSelectedImageModel: Dispatch<SetStateAction<string | null>>;
  setCollections: Dispatch<SetStateAction<SlideshowCollection[]>>;
  setProjects: Dispatch<SetStateAction<SlideshowProjectListItem[]>>;
  setProjectsError: Dispatch<SetStateAction<string | null>>;
  setLoadingProjects: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    apiBaseUrl,
    initialProjects,
    section,
    activeProject,
    setImageModels,
    setSelectedImageModel,
    setCollections,
    setProjects,
    setProjectsError,
    setLoadingProjects,
  } = input;

  useEffect(() => {
    const controller = new AbortController();
    void fetchModelsCatalog()
      .then((catalog) => {
        if (controller.signal.aborted) return;
        const models = catalog.models.filter((model) => model.type === "image");
        setImageModels(
          models.map((model) => ({ id: model.id, name: model.name })),
        );
        setSelectedImageModel(
          (current) =>
            current ?? catalog.defaults.image ?? models[0]?.id ?? null,
        );
      })
      .catch(() => undefined);
    void fetchPlatformCollections()
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setCollections(
          loaded.map((collection) => ({
            id: collection.id,
            name: collection.name,
            imageCount: collection.imageCount,
            visualKeys: [],
            imageUrls: collection.imageUrls,
          })),
        );
      })
      .catch(() => undefined);
    let stopDrafts = () => {};
    let draftsCancelled = false;
    void connectStudioDrafts({
      apiBaseUrl,
      enabled: initialProjects === undefined,
      onLoaded: setProjects,
      onError: setProjectsError,
      onFinally: () => {
        if (!controller.signal.aborted) setLoadingProjects(false);
      },
    }).then((stop) => {
      if (draftsCancelled) {
        stop();
        return;
      }
      stopDrafts = stop;
    });
    return () => {
      draftsCancelled = true;
      controller.abort();
      stopDrafts();
    };
  }, [
    apiBaseUrl,
    initialProjects,
    setCollections,
    setImageModels,
    setLoadingProjects,
    setProjects,
    setProjectsError,
    setSelectedImageModel,
  ]);

  useEffect(() => {
    let stopRefresh = () => {};
    let cancelled = false;
    void connectStudioDraftsRefresh({
      apiBaseUrl,
      enabled: section === "drafts" && !activeProject,
      onLoaded: (loaded) => {
        setProjects(loaded);
        setProjectsError(null);
      },
      onError: setProjectsError,
    }).then((stop) => {
      if (cancelled) {
        stop();
        return;
      }
      stopRefresh = stop;
    });
    return () => {
      cancelled = true;
      stopRefresh();
    };
  }, [activeProject, apiBaseUrl, section, setProjects, setProjectsError]);
}
