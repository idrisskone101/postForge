import { readWorkspaceFeatureRecords, upsertWorkspaceFeatureRecord } from "@/lib/workspace-feature-store";
import { getAllModels, getModel } from "./models";
import { getDefaultVisionStoryModel, getStoryModel, STORY_MODELS, type StoryModel } from "./story-models";
import type { ModelDefinition } from "./types";

export const MODEL_AVAILABILITY_RECORD_ID = "model-availability";

export interface ModelAvailabilityState {
  id: string;
  enabledModelIds: string[];
  defaultImageModelId: string | null;
  defaultVideoModelId: string | null;
  defaultIntelligenceModelId: string | null;
  updatedAt: string;
}

export const DEFAULT_IMAGE_MODEL = "nano-banana-2";
export const DEFAULT_VIDEO_MODEL = "kling-3.0-motion";

const AVAILABILITY_CACHE_TTL_MS = 30_000;

const globalForModelAvailability = globalThis as unknown as {
  __postforge_model_availability_cache?: {
    state: ModelAvailabilityState | null;
    expiresAt: number;
  };
};

function cachedAvailability(): ModelAvailabilityState | null {
  const cache = globalForModelAvailability.__postforge_model_availability_cache;
  if (cache && cache.state && cache.expiresAt > Date.now()) {
    return cache.state;
  }
  return null;
}

function cacheAvailability(state: ModelAvailabilityState): void {
  globalForModelAvailability.__postforge_model_availability_cache = {
    state,
    expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
  };
}

function invalidateAvailabilityCache(): void {
  globalForModelAvailability.__postforge_model_availability_cache = undefined;
}

function defaultAvailabilityState(): ModelAvailabilityState {
  return {
    id: MODEL_AVAILABILITY_RECORD_ID,
    enabledModelIds: getAllModels().map((model) => model.id),
    defaultImageModelId: DEFAULT_IMAGE_MODEL,
    defaultVideoModelId: DEFAULT_VIDEO_MODEL,
    defaultIntelligenceModelId: STORY_MODELS[0]?.id ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export function isModelAvailabilityState(
  value: unknown
): value is ModelAvailabilityState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.id === MODEL_AVAILABILITY_RECORD_ID &&
    Array.isArray(record.enabledModelIds) &&
    record.enabledModelIds.every((id) => typeof id === "string") &&
    (record.defaultImageModelId === null ||
      typeof record.defaultImageModelId === "string") &&
    (record.defaultVideoModelId === null ||
      typeof record.defaultVideoModelId === "string") &&
    (record.defaultIntelligenceModelId === undefined ||
      record.defaultIntelligenceModelId === null ||
      typeof record.defaultIntelligenceModelId === "string") &&
    (record.updatedAt === undefined || typeof record.updatedAt === "string")
  );
}

export async function readModelAvailability(): Promise<ModelAvailabilityState> {
  const cached = cachedAvailability();
  if (cached) return cached;

  try {
    const records = await readWorkspaceFeatureRecords<ModelAvailabilityState>(
      "models"
    );
    const saved = records.find((record) => record.id === MODEL_AVAILABILITY_RECORD_ID);
    if (!saved || !isModelAvailabilityState(saved)) {
      const fresh = defaultAvailabilityState();
      cacheAvailability(fresh);
      return fresh;
    }

    // Drop any stored ids that are no longer in the registry
    const validIds = new Set(getAllModels().map((model) => model.id));
    const enabledModelIds = saved.enabledModelIds.filter((id) => validIds.has(id));
    const defaultImageModelId =
      saved.defaultImageModelId && validIds.has(saved.defaultImageModelId)
        ? saved.defaultImageModelId
        : null;
    const defaultVideoModelId =
      saved.defaultVideoModelId && validIds.has(saved.defaultVideoModelId)
        ? saved.defaultVideoModelId
        : null;
    const defaultIntelligenceModelId = getStoryModel(saved.defaultIntelligenceModelId)
      ? saved.defaultIntelligenceModelId
      : null;

    const resolved: ModelAvailabilityState = {
      ...saved,
      enabledModelIds,
      defaultImageModelId,
      defaultVideoModelId,
      defaultIntelligenceModelId,
    };
    cacheAvailability(resolved);
    return resolved;
  } catch {
    // Workspace storage unavailable (e.g. headless test runs): every registry
    // model stays enabled and the legacy defaults are used.
    const fallback = defaultAvailabilityState();
    cacheAvailability(fallback);
    return fallback;
  }
}

export async function saveModelAvailability(
  state: Omit<ModelAvailabilityState, "id" | "updatedAt">
): Promise<ModelAvailabilityState> {
  const next: ModelAvailabilityState = {
    id: MODEL_AVAILABILITY_RECORD_ID,
    ...state,
    updatedAt: new Date().toISOString(),
  };
  // Optimistic cache update so reads reflect the new state immediately.
  invalidateAvailabilityCache();
  cacheAvailability(next);
  await upsertWorkspaceFeatureRecord<ModelAvailabilityState>("models", next);
  return next;
}

export function getAvailableModelsNow(): ModelDefinition[] {
  const availability = cachedAvailability() ?? defaultAvailabilityState();
  const enabled = new Set(availability.enabledModelIds);
  return getAllModels().filter((model) => enabled.has(model.id));
}

export async function getAvailableModels(): Promise<ModelDefinition[]> {
  const availability = await readModelAvailability();
  const enabled = new Set(availability.enabledModelIds);
  return getAllModels().filter((model) => enabled.has(model.id));
}

export async function getAvailableModelsByType(
  type: "image" | "video"
): Promise<ModelDefinition[]> {
  const models = await getAvailableModels();
  return models.filter((model) => model.type === type);
}

export async function getDefaultModel(
  type: "image" | "video"
): Promise<string> {
  const availability = await readModelAvailability();
  const models = getAllModels().filter((model) => model.type === type);
  const enabled = new Set(availability.enabledModelIds);

  const preferredId =
    type === "image"
      ? availability.defaultImageModelId
      : availability.defaultVideoModelId;
  if (preferredId && enabled.has(preferredId) && getModel(preferredId)) {
    return preferredId;
  }

  const firstEnabled = models.find((model) => enabled.has(model.id));
  if (firstEnabled) return firstEnabled.id;

  return type === "image" ? DEFAULT_IMAGE_MODEL : DEFAULT_VIDEO_MODEL;
}

// Avatar identity preparation requires an edit-capable image model that accepts
// reference images (the registry's `/edit` endpoint variants).
export async function getDefaultEditCapableImageModel(): Promise<string> {
  const availability = await readModelAvailability();
  const enabled = new Set(availability.enabledModelIds);
  const editCapable = getAllModels().filter(
    (model) =>
      model.type === "image" &&
      model.capabilities.referenceImages === true &&
      enabled.has(model.id)
  );
  if (editCapable.length > 0) return editCapable[0].id;
  return DEFAULT_IMAGE_MODEL;
}

export async function isModelEnabled(modelId: string): Promise<boolean> {
  if (!getModel(modelId)) return false;
  const availability = await readModelAvailability();
  return availability.enabledModelIds.includes(modelId);
}

/**
 * The workspace's chosen reasoning model (Ollama Cloud). Powers every
 * intelligence surface: slideshow stories, prompt improvement, and any
 * per-request override that was left unset.
 */
export async function getDefaultIntelligenceModel(): Promise<StoryModel> {
  const availability = await readModelAvailability();
  const preferred = getStoryModel(availability.defaultIntelligenceModelId);
  return preferred ?? STORY_MODELS[0];
}

/**
 * Vision variant of the intelligence default. Reference-image analysis needs
 * image inputs, so a text-only workspace default falls back to the first
 * vision-capable catalog model.
 */
export async function getDefaultVisionIntelligenceModel(): Promise<StoryModel | undefined> {
  const availability = await readModelAvailability();
  const preferred = getStoryModel(availability.defaultIntelligenceModelId);
  if (preferred?.vision === true) return preferred;
  return getDefaultVisionStoryModel();
}
