"use client";

export type ClientModelDefinition = {
  id: string;
  name: string;
  type: "image" | "video";
  pricing: { unit: string; amount: number };
  capabilities: {
    motionControl?: boolean;
    subjectSwap?: boolean;
    referenceImages?: boolean;
    textToVideo?: boolean;
    textToImage?: boolean;
    [key: string]: unknown;
  };
  defaults: { aspectRatio: string; duration?: number; numImages?: number };
  limits: {
    minDuration?: number;
    maxDuration?: number;
    maxImages?: number;
    aspectRatios: string[];
  };
};

export type ModelsCatalog = {
  models: ClientModelDefinition[];
  defaults: { image: string; video: string };
  availability: {
    enabledModelIds: string[];
    defaultImageModelId: string | null;
    defaultVideoModelId: string | null;
  } | null;
};

const globalForModelsCatalog = globalThis as unknown as {
  __postforge_models_catalog_promise?: Promise<ModelsCatalog>;
  __postforge_models_catalog?: ModelsCatalog;
};

export async function fetchModelsCatalog(): Promise<ModelsCatalog> {
  if (globalForModelsCatalog.__postforge_models_catalog) {
    return globalForModelsCatalog.__postforge_models_catalog;
  }
  if (!globalForModelsCatalog.__postforge_models_catalog_promise) {
    globalForModelsCatalog.__postforge_models_catalog_promise = (async () => {
      const response = await fetch("/api/models", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Model catalog could not be loaded.");
      }
      const catalog = (await response.json()) as ModelsCatalog;
      globalForModelsCatalog.__postforge_models_catalog = catalog;
      return catalog;
    })();
  }
  return globalForModelsCatalog.__postforge_models_catalog_promise;
}

export function getClientDefaultModelId(
  catalog: ModelsCatalog,
  type: "image" | "video"
): string {
  const preferred = type === "image" ? catalog.defaults.image : catalog.defaults.video;
  if (preferred) return preferred;
  const fallback = catalog.models.find((model) => model.type === type);
  return fallback?.id ?? "";
}
