"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCloneHandoffQuery } from "@/lib/clone-handoff-query-context";
import { type TikTokVideoInfo } from "@/components/tiktok-input";
import {
  calculateEstimatedCost,
  BRIA_ERASER_COST_PER_SEC,
  getModel,
} from "@/lib/ai/models";
import { fetchModelsCatalog } from "@/lib/ai/models-client";
import type { ModelDefinition } from "@/lib/ai/types";
import { apiPost } from "@/lib/api/client";
import type { ClonePreselectedSourceResult } from "@/components/clone/view-models";
import { readCloneHandoffQuery } from "@/lib/ugc-clone-handoff";
import { isMotionSourceWithinLimit } from "@/lib/ugc/source-limits";
import { createReferenceImageBatchEntries } from "@/lib/ugc/clone-workflow";
import {
  UGC_CLONE_TIP_INDEX_KEY,
  UGC_CLONE_TIPS,
  type ReferenceBatchSize,
} from "@/components/clone/constants";
import type { CloneSetupStep, Phase } from "@/components/clone/types";
import {
  postCloneGeneration,
  swapReferenceBlockedMessage,
  type CloneGenerateTarget,
} from "@/app/(app)/ugc-clone/clone-requests";
import {
  buildCloneActionModel,
  buildCloneDraft,
  buildCloneReferenceWorkspace,
  cloneHandoffAfterPreselect,
  type CloneFormSnapshot,
} from "@/app/(app)/ugc-clone/clone-form-models";
import {
  filterCloneVideoModels,
  filterReferenceImageModels,
  getCloneStudioViewModel,
  getModelCatalogFallback,
} from "@/app/(app)/ugc-clone/clone-view-model";
import { useCloneIdentity } from "@/app/(app)/ugc-clone/use-clone-identity";
import { useCloneRefImages } from "@/app/(app)/ugc-clone/use-clone-ref-images";

export function useCloneForm() {
  const router = useRouter();
  const initialQuery = useCloneHandoffQuery();
  const searchParams = new URLSearchParams(initialQuery);
  const { sourceId: sourceIdParam, referenceFileId: referenceFileIdParam, sourceUrl: sourceUrlParam } =
    readCloneHandoffQuery(searchParams);

  const [phase, setPhase] = useState<Phase>("input");
  const [activeSetupStep, setActiveSetupStep] = useState<CloneSetupStep>("source");
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [referenceLibraryOpen, setReferenceLibraryOpen] = useState(false);
  const [videoInfo, setVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [originalVideoInfo, setOriginalVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [sourceToolsOpen, setSourceToolsOpen] = useState(false);
  const [sourcesRefreshKey, setSourcesRefreshKey] = useState(0);
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [removeTextOverlays, setRemoveTextOverlays] = useState(false);
  const [selectedModel, setSelectedModel] = useState("kling-3.0-motion");
  const [selectedReferenceImageModel, setSelectedReferenceImageModel] = useState(
    "nano-banana-2"
  );
  const [referenceBatchSize, setReferenceBatchSize] = useState<ReferenceBatchSize>(1);
  const [cloneTip, setCloneTip] = useState<(typeof UGC_CLONE_TIPS)[number]>(UGC_CLONE_TIPS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(sourceIdParam);
  const [prevSourceIdParam, setPrevSourceIdParam] = useState(sourceIdParam);
  if (sourceIdParam !== prevSourceIdParam) {
    setPrevSourceIdParam(sourceIdParam);
    if (sourceIdParam) {
      setPendingSourceId(sourceIdParam);
    }
  }
  const [selectedCollectionAssetId, setSelectedCollectionAssetId] = useState<string | null>(
    null
  );
  const [catalogModels, setCatalogModels] = useState<ModelDefinition[] | null>(null);

  const identity = useCloneIdentity();
  const refs = useCloneRefImages({
    avatarId: identity.avatarId,
    fetchSavedReferences: identity.fetchSavedReferences,
    referenceFileIdParam,
    initialQuery,
    setSubmitError,
    setSelectedSavedReferenceId: identity.setSelectedSavedReferenceId,
    setSelectedCollectionAssetId,
    setActiveSetupStep,
  });

  const durationSec = videoInfo?.durationSec ?? 5;
  const videoCost = calculateEstimatedCost(selectedModel, { durationSec });
  const referenceImageUnitCost = calculateEstimatedCost(selectedReferenceImageModel, {
    numImages: 1,
  });
  const referenceBatchCost = calculateEstimatedCost(selectedReferenceImageModel, {
    numImages: referenceBatchSize,
  });
  const textErasureCost = removeTextOverlays ? BRIA_ERASER_COST_PER_SEC * durationSec : 0;
  const selectedModelDef = getModel(selectedModel);
  const cloneVideoModels = filterCloneVideoModels(
    catalogModels ?? getModelCatalogFallback()
  );
  const referenceImageModels = filterReferenceImageModels(
    catalogModels ?? getModelCatalogFallback()
  );

  useEffect(() => {
    let cancelled = false;
    fetchModelsCatalog()
      .then((catalog) => {
        if (cancelled) return;
        setCatalogModels(catalog.models as unknown as ModelDefinition[]);
      })
      .catch(() => {
        if (!cancelled) setCatalogModels(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const storedIndex = window.localStorage.getItem(UGC_CLONE_TIP_INDEX_KEY);
      const parsedIndex = storedIndex ? Number.parseInt(storedIndex, 10) : 0;
      const safeIndex = Number.isFinite(parsedIndex)
        ? Math.abs(parsedIndex) % UGC_CLONE_TIPS.length
        : 0;
      setCloneTip(UGC_CLONE_TIPS[safeIndex]);
      window.localStorage.setItem(
        UGC_CLONE_TIP_INDEX_KEY,
        String((safeIndex + 1) % UGC_CLONE_TIPS.length)
      );
    } catch {
      setCloneTip(UGC_CLONE_TIPS[Math.floor(Math.random() * UGC_CLONE_TIPS.length)]);
    }
  }, []);

  const view = getCloneStudioViewModel({
    videoInfo,
    originalVideoInfo,
    sourceToolsOpen,
    avatarId: identity.avatarId,
    identityPack: identity.identityPack,
    refImages: refs.refImages,
    selectedRefIndex: refs.selectedRefIndex,
    selectedSavedReferenceId: identity.selectedSavedReferenceId,
    savedReferences: identity.savedReferences,
    selectedCollectionAssetId,
    isSubmitting,
    selectedModelDef,
  });

  const handleVideoDownloaded = (info: TikTokVideoInfo | null) => {
    setVideoInfo(info);
    setOriginalVideoInfo(info);
    setShowTrimmer(!!info && !isMotionSourceWithinLimit(info.durationSec));
    setSourceToolsOpen(!info);
    if (info) {
      setActiveSetupStep("identity");
    }
  };

  const handlePreselectedSourceResolved = (result: ClonePreselectedSourceResult) => {
    const next = cloneHandoffAfterPreselect({
      result,
      sourceUrlParam,
      pendingSourceId,
      search: searchParams.toString(),
    });
    if (!next) return;
    if (next.clearPendingSourceId) setPendingSourceId(null);
    setSubmitError(next.error);
    router.replace(next.path);
  };

  const handleTrimmed = (info: {
    localPath: string;
    filename: string;
    durationSec: number;
    width: number;
    height: number;
  }) => {
    if (!videoInfo) return;
    const updated: TikTokVideoInfo = { ...videoInfo, ...info };
    setVideoInfo(updated);
    setOriginalVideoInfo(updated);
    setShowTrimmer(false);
    setSourcesRefreshKey((k) => k + 1);
  };

  const handleCancelTrim = () => {
    if (originalVideoInfo) {
      setVideoInfo(originalVideoInfo);
    }
    setShowTrimmer(false);
  };

  const submitRefImageGeneration = async (promptToUse: string) => {
    if (!videoInfo || !identity.avatarId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const startIndex = refs.refImagesRef.current.length;
      const newEntries = await createReferenceImageBatchEntries({
        batchSize: referenceBatchSize,
        videoInfo,
        avatarId: identity.avatarId,
        prompt: promptToUse,
        imageModel: selectedReferenceImageModel,
        unitCost: referenceImageUnitCost,
        hairstyleRole: identity.selectedHairstyleRole,
        post: apiPost,
      });
      refs.setRefImages((prev) => [...prev, ...newEntries]);
      refs.setSelectedRefIndex(startIndex);
      identity.setSelectedSavedReferenceId(null);
      setSelectedCollectionAssetId(null);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to generate reference images."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const runCloneGeneration = async (target: CloneGenerateTarget) => {
    if (!videoInfo?.id || !identity.avatarId) return;
    if (target.kind === "saved" || target.kind === "collection") {
      if (selectedModelDef?.capabilities.subjectSwap) {
        setSubmitError(swapReferenceBlockedMessage(target.kind));
        return;
      }
    }
    if (target.kind === "generated" || target.kind === "swap") {
      if (!view.selectedRefFileId) return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await postCloneGeneration({
        target,
        videoInfo,
        avatarId: identity.avatarId,
        model: selectedModel,
        keepOriginalSound,
        removeTextOverlays,
        durationSec: view.durationSec,
      });
      setPhase("submitted");
      router.push(result.href);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to generate clone.");
      setIsSubmitting(false);
    }
  };

  const handleApproveAndGenerate = () => {
    if (!view.selectedRefFileId) return;
    void runCloneGeneration(
      selectedModelDef?.capabilities.subjectSwap
        ? { kind: "swap", referenceFileId: view.selectedRefFileId }
        : { kind: "generated", referenceImageFileId: view.selectedRefFileId }
    );
  };

  const handleBackToInput = () => {
    setPhase("input");
    refs.setRefImages([]);
    refs.setSelectedRefIndex(0);
    setSubmitError(null);
    if (identity.avatarId) {
      void identity.fetchSavedReferences(identity.avatarId);
    }
  };

  const handleCollectionChange = (assetIds: string[]) => {
    const nextId = assetIds[0] ?? null;
    setSelectedCollectionAssetId(nextId);
    if (nextId) {
      identity.setSelectedSavedReferenceId(null);
      if (!selectedModel.startsWith("kling-3.0")) {
        setSelectedModel("kling-3.0-motion");
      }
    }
    setSubmitError(null);
  };

  const handlePrimaryAction = () => {
    if (selectedCollectionAssetId) {
      void runCloneGeneration({
        kind: "collection",
        collectionAssetId: selectedCollectionAssetId,
      });
      return;
    }
    if (view.selectedSavedReference) {
      void runCloneGeneration({
        kind: "saved",
        savedReferenceId: view.selectedSavedReference.id,
      });
      return;
    }
    if (view.selectedRefFileId) {
      handleApproveAndGenerate();
      return;
    }
    void submitRefImageGeneration("");
  };

  const handleSelectAvatar = (nextAvatarId: string) => {
    identity.setAvatarId(nextAvatarId);
    setActiveSetupStep(view.sourceReady ? "reference" : "source");
  };

  const handleSelectSavedReference = (referenceId: string) => {
    setSelectedCollectionAssetId(null);
    identity.setSelectedSavedReferenceId((current) =>
      current === referenceId ? null : referenceId
    );
  };

  const snapshot: CloneFormSnapshot = {
    activeSetupStep,
    setActiveSetupStep,
    videoInfo,
    originalVideoInfo,
    showTrimmer,
    sourceToolsOpen,
    setShowTrimmer,
    setSourceToolsOpen,
    sourcesRefreshKey,
    pendingSourceId,
    pendingSourceUrl: sourceUrlParam,
    selectedCollectionAssetId,
    setSelectedCollectionAssetId,
    referenceLibraryOpen,
    setReferenceLibraryOpen,
    mobileSettingsOpen,
    setMobileSettingsOpen,
    keepOriginalSound,
    setKeepOriginalSound,
    removeTextOverlays,
    setRemoveTextOverlays,
    selectedModel,
    setSelectedModel,
    selectedReferenceImageModel,
    setSelectedReferenceImageModel,
    referenceBatchSize,
    setReferenceBatchSize,
    cloneTip,
    isSubmitting,
    submitError,
    cloneVideoModels,
    referenceImageModels,
    videoCost,
    referenceBatchCost,
    textErasureCost,
    identity,
    refs,
    view,
    handleVideoDownloaded,
    handlePreselectedSourceResolved,
    handleTrimmed,
    handleCancelTrim,
    handleApproveAndGenerate,
    handleBackToInput,
    handleCollectionChange,
    handlePrimaryAction,
    handleSelectAvatar,
    handleSelectSavedReference,
    submitRefImageGeneration,
  };

  return {
    phase,
    draft: buildCloneDraft(snapshot),
    workspace: buildCloneReferenceWorkspace(snapshot),
    action: buildCloneActionModel(snapshot),
  };
}
