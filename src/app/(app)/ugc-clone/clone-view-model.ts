import type { TikTokVideoInfo } from "@/components/tiktok-input";
import { formatIdentityRole } from "@/components/clone/constants";
import type {
  AvatarIdentityPack,
  AvatarReferencePreview,
  CloneSetupStep,
  RefImageEntry,
  RefJobStatus,
  SavedReference,
} from "@/components/clone/types";
import type { ModelDefinition } from "@/lib/ai/types";
import { getModelsByType } from "@/lib/ai/models";
import { getClonePrimaryAction } from "@/lib/ugc/clone-workflow";
import {
  MAX_MOTION_SOURCE_DURATION_SEC,
  isMotionSourceWithinLimit,
} from "@/lib/ugc/source-limits";

export function getModelCatalogFallback(): ModelDefinition[] {
  return getModelsByType("video").concat(getModelsByType("image"));
}

export function filterCloneVideoModels(models: ModelDefinition[]): ModelDefinition[] {
  return models.filter(
    (model) =>
      (model.capabilities.motionControl || model.capabilities.subjectSwap) &&
      model.type === "video"
  );
}

export function filterReferenceImageModels(models: ModelDefinition[]): ModelDefinition[] {
  return models.filter((model) => model.type === "image");
}

export function buildAvatarReferencePreviews(
  avatarId: string | null,
  identityPack: AvatarIdentityPack | null
): AvatarReferencePreview[] {
  if (!avatarId) return [];
  return [
    {
      id: `avatar-${avatarId}`,
      label: "Original avatar",
      detail: "Saved avatar",
      previewUrl: `/api/avatars/${encodeURIComponent(avatarId)}`,
    },
    ...(identityPack?.images ?? []).map((image) => ({
      id: image.id,
      label: formatIdentityRole(image.role),
      detail: "Identity reference",
      previewUrl: image.previewUrl,
    })),
  ];
}

export function applyRefImageJobUpdate(
  entry: RefImageEntry,
  job: RefJobStatus
): RefImageEntry {
  if (entry.status !== "generating") return entry;
  switch (job.status) {
    case "completed": {
      if (!job.outputs[0]) return entry;
      return {
        ...entry,
        status: "completed",
        fileId: job.outputs[0].id,
        cost: job.estimatedCost,
      };
    }
    case "failed":
      return {
        ...entry,
        status: "failed",
        error: job.error ?? "Unknown error",
      };
    case "queued":
    case "processing":
      return entry;
    default: {
      const _exhaustive: never = job.status;
      return _exhaustive;
    }
  }
}

export function mergeRefImagePollUpdates(
  prev: RefImageEntry[],
  updates: PromiseSettledResult<{ jobId: string; job: RefJobStatus }>[]
): RefImageEntry[] {
  let changed = false;
  const next = prev.map((entry) => {
    if (entry.status !== "generating") return entry;
    const result = updates.find(
      (u) => u.status === "fulfilled" && u.value.jobId === entry.jobId
    );
    if (!result || result.status !== "fulfilled") return entry;
    const updated = applyRefImageJobUpdate(entry, result.value.job);
    if (updated !== entry) changed = true;
    return updated;
  });
  return changed ? next : prev;
}

export function getCloneStudioViewModel({
  videoInfo,
  originalVideoInfo,
  sourceToolsOpen,
  avatarId,
  identityPack,
  refImages,
  selectedRefIndex,
  selectedSavedReferenceId,
  savedReferences,
  selectedCollectionAssetId,
  isSubmitting,
  selectedModelDef,
}: {
  videoInfo: TikTokVideoInfo | null;
  originalVideoInfo: TikTokVideoInfo | null;
  sourceToolsOpen: boolean;
  avatarId: string | null;
  identityPack: AvatarIdentityPack | null;
  refImages: RefImageEntry[];
  selectedRefIndex: number;
  selectedSavedReferenceId: string | null;
  savedReferences: SavedReference[];
  selectedCollectionAssetId: string | null;
  isSubmitting: boolean;
  selectedModelDef: ModelDefinition | undefined;
}) {
  const durationSec = videoInfo?.durationSec ?? 5;
  const hairstyleOptions = (identityPack?.images ?? []).filter(
    (image) => image.kind === "hairstyle"
  );
  const selectedRef = refImages[selectedRefIndex] ?? null;
  const selectedRefFileId = selectedRef?.status === "completed" ? selectedRef.fileId : null;
  const totalRefCost = refImages
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.cost, 0);
  const hasAnyCompleted = refImages.some((r) => r.status === "completed");
  const latestEntry = refImages[refImages.length - 1] ?? null;
  const isGenerating = latestEntry?.status === "generating";
  const selectedSavedReference =
    savedReferences.find((reference) => reference.id === selectedSavedReferenceId) ?? null;
  const avatarReferencePreviews = buildAvatarReferencePreviews(avatarId, identityPack);
  const primaryAvatarReference = avatarReferencePreviews[0] ?? null;
  const modelName = selectedModelDef?.name.replace(" Motion Control", "") ?? "Kling 3.0";
  const sourceReady = !!videoInfo?.id;
  const shouldShowSourceTools = !sourceReady || sourceToolsOpen;
  const avatarReady = !!avatarId;
  const trimReady = !!videoInfo && isMotionSourceWithinLimit(durationSec);
  const referenceReady =
    !!selectedCollectionAssetId || !!selectedSavedReference || !!selectedRefFileId;
  const canGenerateClone =
    !!videoInfo?.id && trimReady && !!avatarId && referenceReady && !isSubmitting;
  const nextAction = getClonePrimaryAction({
    sourceReady,
    trimReady,
    identityReady: avatarReady,
    referenceReady,
    canGenerate: canGenerateClone,
    usesSavedReference: !!selectedCollectionAssetId || !!selectedSavedReference,
  });
  const sourcePreviewSrc = videoInfo
    ? `/api/ugc-clone/preview?path=${encodeURIComponent(videoInfo.localPath)}`
    : null;
  const sourceDetail = videoInfo
    ? videoInfo.label || "Selected TikTok source"
    : "Paste a TikTok URL or choose a saved source.";
  const trimDetail = videoInfo
    ? !trimReady
      ? `Trim to ${MAX_MOTION_SOURCE_DURATION_SEC}s or less before generating.`
      : originalVideoInfo && videoInfo.localPath !== originalVideoInfo.localPath
        ? `${Math.round(durationSec)}s source clip selected.`
        : "Full source selected; trim can still be edited."
    : "Choose a source before trimming.";
  const identityDetail = avatarReady
    ? identityPack?.status === "completed"
      ? `${identityPack.images.length} identity references ready.`
      : "Identity selected; extra references are still preparing."
    : "Choose the identity for this clone.";
  const referenceDetail = selectedCollectionAssetId
    ? "Collection reference selected."
    : selectedSavedReference
      ? "Saved reference selected."
      : selectedRefFileId
        ? "Generated reference approved."
        : "Generate or choose a reference image.";
  const readinessDetail = canGenerateClone
    ? "Source, identity, and reference are ready."
    : "Add the missing source, trim, identity, or reference.";
  const completedSetupSteps = new Set<CloneSetupStep>([
    ...(sourceReady ? (["source"] as const) : []),
    ...(avatarReady ? (["identity"] as const) : []),
    ...(referenceReady ? (["reference"] as const) : []),
  ]);
  const canSubmit = !!videoInfo?.id && !!avatarId && !isSubmitting;
  const primaryActionDisabled =
    selectedCollectionAssetId || selectedSavedReference || selectedRefFileId
      ? !canGenerateClone
      : !canSubmit || !trimReady || isSubmitting || isGenerating;

  return {
    durationSec,
    hairstyleOptions,
    selectedRef,
    selectedRefFileId,
    totalRefCost,
    hasAnyCompleted,
    isGenerating,
    selectedSavedReference,
    avatarReferencePreviews,
    primaryAvatarReference,
    modelName,
    sourceReady,
    shouldShowSourceTools,
    avatarReady,
    trimReady,
    referenceReady,
    canGenerateClone,
    nextAction,
    sourcePreviewSrc,
    sourceDetail,
    trimDetail,
    identityDetail,
    referenceDetail,
    readinessDetail,
    completedSetupSteps,
    canSubmit,
    primaryActionDisabled,
    compactActionLabel: nextAction.label,
  };
}
