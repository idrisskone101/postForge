"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type TikTokVideoInfo } from "@/components/tiktok-input";
import { MediaPreviewFrame } from "@/components/media-preview";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { calculateEstimatedCost, BRIA_ERASER_COST_PER_SEC, getModel, getModelsByType } from "@/lib/ai/models";
import { fetchModelsCatalog } from "@/lib/ai/models-client";
import type { ModelDefinition } from "@/lib/ai/types";
import { apiGet, apiPost } from "@/lib/api/client";
import {
  consumeCloneHandoffQuery,
  isSupportedCloneReferenceFile,
  readCloneHandoffQuery,
  type CloneReferenceFileMetadata,
} from "@/lib/ugc-clone-handoff";
import {
  MAX_MOTION_SOURCE_DURATION_SEC,
  isMotionSourceWithinLimit,
} from "@/lib/ugc/source-limits";
import {
  createReferenceImageBatchEntries,
  getClonePrimaryAction,
} from "@/lib/ugc/clone-workflow";
import {
  Loader2,
  Check,
  ArrowLeft,
  Sparkles,
  PenLine,
} from "lucide-react";
import { CloneActionBar } from "@/components/clone/action-bar";
import {
  formatIdentityRole,
  UGC_CLONE_TIP_INDEX_KEY,
  UGC_CLONE_TIPS,
  type ReferenceBatchSize,
} from "@/components/clone/constants";
import { CloneIdentityStep } from "@/components/clone/identity-step";
import { CloneLiveComposition } from "@/components/clone/live-composition";
import { CloneProductionStatePanel } from "@/components/clone/production-state";
import { CloneReferenceInputs } from "@/components/clone/reference-inputs";
import { CloneReferenceLibrary } from "@/components/clone/reference-library";
import { CloneReferenceOptions } from "@/components/clone/reference-options";
import { CloneSetupNav } from "@/components/clone/setup-nav";
import { CloneSourceEmptyState } from "@/components/clone/source-empty-state";
import { CloneIdentityStatusPanel } from "@/components/clone/identity-status";
import { CloneSourceStep } from "@/components/clone/source-step";
import type {
  AvatarIdentityPack,
  CloneSetupStep,
  Phase,
  RefImageEntry,
  RefJobStatus,
  SavedReference,
  SavedReferenceListPage,
} from "@/components/clone/types";

export type { RefImageEntry };
export { CloneSourceEmptyState, CloneIdentityStatusPanel, CloneProductionStatePanel };

function getModelCatalogFallback(): ModelDefinition[] {
  return getModelsByType("video").concat(getModelsByType("image"));
}

export function UGCCloneForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sourceId: sourceIdParam, referenceFileId: referenceFileIdParam } =
    readCloneHandoffQuery(searchParams);

  // Phase
  const [phase, setPhase] = useState<Phase>("input");
  const [activeSetupStep, setActiveSetupStep] = useState<CloneSetupStep>("source");
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [referenceLibraryOpen, setReferenceLibraryOpen] = useState(false);

  // Reference image iterations
  const [refImages, setRefImages] = useState<RefImageEntry[]>([]);
  const [selectedRefIndex, setSelectedRefIndex] = useState<number>(0);
  const [refPrompt, setRefPrompt] = useState("");

  // Step 1: TikTok
  const [videoInfo, setVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [originalVideoInfo, setOriginalVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [sourceToolsOpen, setSourceToolsOpen] = useState(false);
  const [sourcesRefreshKey, setSourcesRefreshKey] = useState(0);

  // Step 2: Avatar
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [identityPack, setIdentityPack] = useState<AvatarIdentityPack | null>(null);
  const [isStartingIdentityPack, setIsStartingIdentityPack] = useState(false);
  const [isGeneratingHairstyles, setIsGeneratingHairstyles] = useState(false);
  const [selectedHairstyleRole, setSelectedHairstyleRole] = useState<string | null>(null);
  const [identityPackError, setIdentityPackError] = useState<string | null>(null);
  const [savedReferences, setSavedReferences] = useState<SavedReference[]>([]);
  const [savedReferencesNextCursor, setSavedReferencesNextCursor] = useState<string | null>(
    null
  );
  const [isLoadingSavedReferences, setIsLoadingSavedReferences] = useState(false);
  const [isLoadingMoreSavedReferences, setIsLoadingMoreSavedReferences] = useState(false);
  const [savedReferencesError, setSavedReferencesError] = useState<string | null>(null);
  const [selectedSavedReferenceId, setSelectedSavedReferenceId] = useState<string | null>(null);
  const [selectedCollectionAssetId, setSelectedCollectionAssetId] = useState<
    string | null
  >(null);
  const [showAvatarReferences, setShowAvatarReferences] = useState(false);

  // Step 3: Settings
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [removeTextOverlays, setRemoveTextOverlays] = useState(false);
  const [selectedModel, setSelectedModel] = useState("kling-3.0-motion");
  const [selectedReferenceImageModel, setSelectedReferenceImageModel] = useState("nano-banana-2");
  const [referenceBatchSize, setReferenceBatchSize] = useState<ReferenceBatchSize>(1);
  const [cloneTip, setCloneTip] = useState<(typeof UGC_CLONE_TIPS)[number]>(UGC_CLONE_TIPS[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(sourceIdParam);

  const durationSec = videoInfo?.durationSec ?? 5;
  const videoCost = calculateEstimatedCost(selectedModel, { durationSec });
  const referenceImageUnitCost = calculateEstimatedCost(selectedReferenceImageModel, { numImages: 1 });
  const referenceBatchCost = calculateEstimatedCost(selectedReferenceImageModel, { numImages: referenceBatchSize });
  const textErasureCost = removeTextOverlays ? BRIA_ERASER_COST_PER_SEC * durationSec : 0;
  const canSubmit = !!videoInfo?.id && !!avatarId && !isSubmitting;
  const [catalogModels, setCatalogModels] = useState<ModelDefinition[] | null>(null);

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

  const cloneVideoModels: ModelDefinition[] = (catalogModels ?? getModelCatalogFallback()).filter(
    (model) =>
      (model.capabilities.motionControl || model.capabilities.subjectSwap) &&
      model.type === "video"
  );
  const referenceImageModels: ModelDefinition[] = (catalogModels ?? getModelCatalogFallback()).filter(
    (model) => model.type === "image"
  );
  const selectedModelDef = getModel(selectedModel);

  // Poll for any "generating" ref images
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refImagesRef = useRef(refImages);
  useEffect(() => { refImagesRef.current = refImages; });

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

  const fetchSavedReferences = useCallback(async (nextAvatarId: string) => {
    setIsLoadingSavedReferences(true);
    setSavedReferencesError(null);

    try {
      const page = await apiGet<SavedReferenceListPage>(
        `/api/ugc-clone/references?avatarId=${encodeURIComponent(nextAvatarId)}`
      );
      setSavedReferences(page.items);
      setSavedReferencesNextCursor(page.nextCursor);
      setSelectedSavedReferenceId((current) =>
        current && page.items.some((reference) => reference.id === current)
          ? current
          : null
      );
    } catch (err) {
      console.error("Failed to load saved references:", err);
      setSavedReferences([]);
      setSavedReferencesNextCursor(null);
      setSelectedSavedReferenceId(null);
      setSavedReferencesError(
        err instanceof Error ? err.message : "Failed to load saved references"
      );
    } finally {
      setIsLoadingSavedReferences(false);
    }
  }, []);

  const loadMoreSavedReferences = useCallback(async () => {
    if (!avatarId || !savedReferencesNextCursor || isLoadingMoreSavedReferences) {
      return;
    }

    setIsLoadingMoreSavedReferences(true);
    setSavedReferencesError(null);

    try {
      const page = await apiGet<SavedReferenceListPage>(
        `/api/ugc-clone/references?avatarId=${encodeURIComponent(avatarId)}&cursor=${encodeURIComponent(savedReferencesNextCursor)}`
      );
      setSavedReferences((current) => {
        const seen = new Set(current.map((reference) => reference.id));
        return [
          ...current,
          ...page.items.filter((reference) => !seen.has(reference.id)),
        ];
      });
      setSavedReferencesNextCursor(page.nextCursor);
    } catch (err) {
      console.error("Failed to load saved references:", err);
      setSavedReferencesError(
        err instanceof Error ? err.message : "Failed to load saved references"
      );
    } finally {
      setIsLoadingMoreSavedReferences(false);
    }
  }, [avatarId, isLoadingMoreSavedReferences, savedReferencesNextCursor]);

  const fetchIdentityPack = useCallback(async (nextAvatarId: string) => {
    try {
      const pack = await apiGet<AvatarIdentityPack | null>(
        `/api/avatars/${encodeURIComponent(nextAvatarId)}/identity-pack`
      );
      setIdentityPack(pack);
      setIdentityPackError(null);
      return pack;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load identity pack";
      setIdentityPack(null);
      setIdentityPackError(message);
      return null;
    }
  }, []);

  const startIdentityPack = useCallback(async (nextAvatarId: string, force = false) => {
    setIsStartingIdentityPack(true);
    setIdentityPackError(null);

    try {
      const pack = await apiPost<AvatarIdentityPack>(
        `/api/avatars/${encodeURIComponent(nextAvatarId)}/identity-pack`,
        { force }
      );
      setIdentityPack(pack);
      return pack;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start identity pack";
      setIdentityPackError(message);
      return null;
    } finally {
      setIsStartingIdentityPack(false);
    }
  }, []);

  const generateHairstyleVariants = useCallback(async (nextAvatarId: string) => {
    setIsGeneratingHairstyles(true);
    setIdentityPackError(null);

    try {
      const pack = await apiPost<AvatarIdentityPack>(
        `/api/avatars/${encodeURIComponent(nextAvatarId)}/identity-pack`,
        { hairstyles: true }
      );
      setIdentityPack(pack);
      return pack;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate hairstyles";
      setIdentityPackError(message);
      return null;
    } finally {
      setIsGeneratingHairstyles(false);
    }
  }, []);

  useEffect(() => {
    if (sourceIdParam) {
      setPendingSourceId(sourceIdParam);
    }
  }, [sourceIdParam]);

  useEffect(() => {
    if (!referenceFileIdParam) return;
    let cancelled = false;
    let shouldConsumeQuery = false;
    setActiveSetupStep("reference");

    void (async () => {
      try {
        const response = await fetch(
          `/api/ugc-clone/reference-files/${encodeURIComponent(referenceFileIdParam)}`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null;
          const message =
            body?.error ?? body?.message ?? "The handed-off reference could not be loaded.";
          if ([400, 404, 410, 415, 422].includes(response.status)) {
            shouldConsumeQuery = true;
            if (!cancelled) setSubmitError(message);
            return;
          }
          throw new Error(message);
        }
        const metadata = (await response.json()) as CloneReferenceFileMetadata;
        if (cancelled) return;

        if (!isSupportedCloneReferenceFile(metadata)) {
          shouldConsumeQuery = true;
          setSubmitError(
            "Only generated image outputs can be used as Clone references. Choose an image or generate a reference here."
          );
          return;
        }

        const currentEntries = refImagesRef.current;
        const existingIndex = currentEntries.findIndex(
          (entry) => entry.fileId === referenceFileIdParam
        );

        if (existingIndex >= 0) {
          setSelectedRefIndex(existingIndex);
        } else {
          setSelectedRefIndex(currentEntries.length);
          setRefImages((current) => [
            ...current,
            {
              jobId: `handoff-${referenceFileIdParam}`,
              fileId: referenceFileIdParam,
              prompt: "Imported from a PostForge generation",
              cost: 0,
              status: "completed",
            },
          ]);
        }

        setSelectedSavedReferenceId(null);
        setSelectedCollectionAssetId(null);
        setSubmitError(null);
        shouldConsumeQuery = true;
      } catch (error) {
        if (!cancelled) {
          setSubmitError(
            error instanceof Error
              ? error.message
              : "The handed-off reference could not be loaded."
          );
        }
      } finally {
        if (!cancelled && shouldConsumeQuery) {
          const nextQuery = consumeCloneHandoffQuery(
            searchParams.toString(),
            "referenceFileId"
          );
          router.replace(nextQuery ? `/ugc-clone?${nextQuery}` : "/ugc-clone");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [referenceFileIdParam, router, searchParams]);

  const pollGeneratingJobs = useCallback(async () => {
    const generating = refImagesRef.current.filter((r) => r.status === "generating");
    if (generating.length === 0) return;

    const updates = await Promise.allSettled(
      generating.map(async (entry) => {
        const job = await apiGet<RefJobStatus>(`/api/jobs/${entry.jobId}`);
        return { jobId: entry.jobId, job };
      })
    );

    setRefImages((prev) => {
      let changed = false;
      const next = prev.map((entry) => {
        if (entry.status !== "generating") return entry;
        const result = updates.find(
          (u) => u.status === "fulfilled" && u.value.jobId === entry.jobId
        );
        if (!result || result.status !== "fulfilled") return entry;
        const { job } = result.value;

        if (job.status === "completed" && job.outputs[0]) {
          changed = true;
          return { ...entry, status: "completed" as const, fileId: job.outputs[0].id, cost: job.estimatedCost };
        }
        if (job.status === "failed") {
          changed = true;
          return { ...entry, status: "failed" as const, error: job.error ?? "Unknown error" };
        }
        return entry;
      });
      return changed ? next : prev;
    });

    if (avatarId) {
      void fetchSavedReferences(avatarId);
    }
  }, [avatarId, fetchSavedReferences]);

  useEffect(() => {
    setShowAvatarReferences(false);
    setSelectedHairstyleRole(null);

    if (!avatarId) {
      setIdentityPack(null);
      setIdentityPackError(null);
      setIsStartingIdentityPack(false);
      setSavedReferences([]);
      setSavedReferencesNextCursor(null);
      setSavedReferencesError(null);
      setSelectedSavedReferenceId(null);
      return;
    }

    void fetchSavedReferences(avatarId);
    void (async () => {
      const pack = await fetchIdentityPack(avatarId);
      if (!pack) {
        await startIdentityPack(avatarId);
      }
    })();
  }, [avatarId, fetchIdentityPack, fetchSavedReferences, startIdentityPack]);

  useEffect(() => {
    const isPreparing =
      !!identityPack && ["queued", "processing"].includes(identityPack.status);
    const isBackfillingHairstyles = identityPack?.backfillingHairstyles === true;
    if (!avatarId || (!isPreparing && !isBackfillingHairstyles)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void fetchIdentityPack(avatarId);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [avatarId, fetchIdentityPack, identityPack]);

  useEffect(() => {
    const hasGenerating = refImages.some((r) => r.status === "generating");
    if (!hasGenerating) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    if (!pollingRef.current) {
      pollingRef.current = setInterval(pollGeneratingJobs, 3000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [refImages, pollGeneratingJobs]);

  // Derived state
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
  const selectedSavedReference = savedReferences.find(
    (reference) => reference.id === selectedSavedReferenceId
  ) ?? null;
  const avatarReferencePreviews = avatarId
    ? [
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
    ]
    : [];
  const primaryAvatarReference = avatarReferencePreviews[0] ?? null;

  const handleVideoDownloaded = (info: TikTokVideoInfo | null) => {
    setVideoInfo(info);
    setOriginalVideoInfo(info);
    setShowTrimmer(!!info && !isMotionSourceWithinLimit(info.durationSec));
    setSourceToolsOpen(!info);
    if (info) {
      setActiveSetupStep("identity");
    }
  };

  const handlePreselectedSourceResolved = (result: {
    status: "selected" | "missing";
    sourceId: string;
  }) => {
    if (!pendingSourceId || pendingSourceId !== result.sourceId) return;

    setPendingSourceId(null);
    if (result.status === "missing") {
      setSubmitError(
        "The handed-off saved source is no longer available. Choose or import another source."
      );
    } else {
      setSubmitError(null);
    }
    const nextQuery = consumeCloneHandoffQuery(
      searchParams.toString(),
      "sourceId"
    );

    router.replace(nextQuery ? `/ugc-clone?${nextQuery}` : "/ugc-clone");
  };

  const handleTrimmed = (info: { localPath: string; filename: string; durationSec: number; width: number; height: number }) => {
    if (!videoInfo) return;

    // Update both videoInfo and originalVideoInfo so the trimmed version
    // becomes the canonical source (the DB record was already updated by the API)
    const updated: TikTokVideoInfo = { ...videoInfo, ...info };
    setVideoInfo(updated);
    setOriginalVideoInfo(updated);
    setShowTrimmer(false);
    // Refresh saved sources list to reflect the updated duration/thumbnail
    setSourcesRefreshKey((k) => k + 1);
  };

  const handleCancelTrim = () => {
    if (originalVideoInfo) {
      setVideoInfo(originalVideoInfo);
    }
    setShowTrimmer(false);
  };

  const submitRefImageGeneration = async (promptToUse: string) => {
    if (!videoInfo || !avatarId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const startIndex = refImagesRef.current.length;
      const newEntries = await createReferenceImageBatchEntries({
        batchSize: referenceBatchSize,
        videoInfo,
        avatarId,
        prompt: promptToUse,
        imageModel: selectedReferenceImageModel,
        unitCost: referenceImageUnitCost,
        hairstyleRole: selectedHairstyleRole,
        post: apiPost,
      });

      setRefImages((prev) => [...prev, ...newEntries]);
      setSelectedRefIndex(startIndex);
      setSelectedSavedReferenceId(null);
      setSelectedCollectionAssetId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate reference images.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateRefImage = () => {
    submitRefImageGeneration("");
  };

  const handleRegenerateRefImage = () => {
    submitRefImageGeneration(refPrompt);
  };

  const handleApproveAndGenerate = async () => {
    if (!videoInfo?.id || !avatarId || !selectedRefFileId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (selectedModelDef?.capabilities.subjectSwap) {
        // Swap models reuse the generated reference image as the swap target:
        // the subject in the source video is replaced by the reference subject.
        const result = await apiPost<{ id: string }>("/api/generate/swap", {
          prompt: "Replace the subject in the video with the reference subject. Keep the video, motion, camera, and everything else identical.",
          model: selectedModel,
          swapVideoId: videoInfo.id,
          referenceFileId: selectedRefFileId,
          keepOriginalSound,
        });
        setPhase("submitted");
        router.push(`/generate/${result.id}`);
        return;
      }
      const result = await apiPost<{ id: string }>("/api/ugc-clone/generate", {
        tiktokSourceId: videoInfo.id,
        tiktokVideoPath: videoInfo.localPath,
        avatarId,
        keepOriginalSound,
        removeTextOverlays,
        model: selectedModel,
        referenceImageFileId: selectedRefFileId,
        durationSec,
      });
      setPhase("submitted");
      router.push(`/ugc-clone/${result.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate clone.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  const handleGenerateWithSavedReference = async () => {
    if (!videoInfo || !avatarId || !selectedSavedReferenceId) return;
    if (selectedModelDef?.capabilities.subjectSwap) {
      setSubmitError(
        "Saved references are not used by swap models. Generate a fresh reference image instead."
      );
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await apiPost<{ id: string }>("/api/ugc-clone/generate", {
        tiktokVideoPath: videoInfo.localPath,
        tiktokSourceId: videoInfo.id,
        avatarId,
        keepOriginalSound,
        removeTextOverlays,
        model: selectedModel,
        savedReferenceId: selectedSavedReferenceId,
        durationSec,
      });
      setPhase("submitted");
      router.push(`/ugc-clone/${result.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate clone.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  const handleGenerateWithCollectionReference = async () => {
    if (!videoInfo || !avatarId || !selectedCollectionAssetId) return;
    if (selectedModelDef?.capabilities.subjectSwap) {
      setSubmitError(
        "Collection references are not used by swap models. Generate a fresh reference image instead."
      );
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await apiPost<{ id: string }>("/api/ugc-clone/generate", {
        tiktokVideoPath: videoInfo.localPath,
        tiktokSourceId: videoInfo.id,
        avatarId,
        keepOriginalSound,
        removeTextOverlays,
        model: selectedModel,
        collectionAssetId: selectedCollectionAssetId,
        durationSec,
      });
      setPhase("submitted");
      router.push(`/ugc-clone/${result.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate clone.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  const handleBackToInput = () => {
    setPhase("input");
    setRefImages([]);
    setSelectedRefIndex(0);
    setSubmitError(null);
    if (avatarId) {
      void fetchSavedReferences(avatarId);
    }
  };

  const handleSelectSavedReference = (referenceId: string) => {
    setSelectedCollectionAssetId(null);
    setSelectedSavedReferenceId((current) =>
      current === referenceId ? null : referenceId
    );
  };

  const modelName = selectedModelDef?.name.replace(" Motion Control", "") ?? "Kling 3.0";
  const sourceReady = !!videoInfo?.id;
  const shouldShowSourceTools = !sourceReady || sourceToolsOpen;
  const avatarReady = !!avatarId;
  const trimReady = !!videoInfo && isMotionSourceWithinLimit(durationSec);
  const referenceReady =
    !!selectedCollectionAssetId || !!selectedSavedReference || !!selectedRefFileId;
  const canGenerateClone = !!videoInfo?.id && trimReady && !!avatarId && referenceReady && !isSubmitting;
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
  const compactActionLabel = nextAction.label;
  const primaryActionDisabled =
    selectedCollectionAssetId || selectedSavedReference || selectedRefFileId
    ? !canGenerateClone
    : !canSubmit || !trimReady || isSubmitting || isGenerating;
  const handlePrimaryAction = selectedCollectionAssetId
    ? handleGenerateWithCollectionReference
    : selectedSavedReference
      ? handleGenerateWithSavedReference
    : selectedRefFileId
      ? handleApproveAndGenerate
      : handleGenerateRefImage;
  const completedSetupSteps = new Set<CloneSetupStep>([
    ...(sourceReady ? (["source"] as const) : []),
    ...(avatarReady ? (["identity"] as const) : []),
    ...(referenceReady ? (["reference"] as const) : []),
  ]);
  const productionStatePanel = (
    <CloneProductionStatePanel
      sourceReady={sourceReady}
      trimReady={trimReady}
      identityReady={avatarReady}
      referenceReady={referenceReady}
      canGenerate={canGenerateClone}
      nextAction={nextAction}
      sourceDetail={sourceDetail}
      trimDetail={trimDetail}
      identityDetail={identityDetail}
      referenceDetail={referenceDetail}
      readinessDetail={readinessDetail}
    />
  );

  // ─── Review Phase ───────────────────────────────────────────────────
  if (phase === "reviewing") {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-border bg-card py-0 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBackToInput}
                className="size-8"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight">Review reference</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Check the source and generated still before creating the clone.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit bg-muted/40">
              {modelName}
            </Badge>
          </div>

          <CardContent className="space-y-5 p-5">
            <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
            {videoInfo && sourcePreviewSrc && (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                  Source
                </p>
                <MediaPreviewFrame
                  type="video"
                  src={sourcePreviewSrc}
                  width={videoInfo.width}
                  height={videoInfo.height}
                  alt={videoInfo.label || "Selected source preview"}
                  variant="work"
                  showMetadata
                />
                <div className="mt-3 min-w-0 text-xs text-muted-foreground">
                  <p className="truncate font-medium text-foreground">
                    {videoInfo.label || "Selected TikTok source"}
                  </p>
                  <p className="mt-1 font-mono text-[12px]">
                    {durationSec}s · {videoInfo.width}x{videoInfo.height}
                  </p>
                </div>
              </div>
            )}

              <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">Generated reference</p>
                  <span className="text-xs text-muted-foreground">
                    {refImages.filter((r) => r.status === "completed").length} variant
                    {refImages.filter((r) => r.status === "completed").length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="relative flex min-h-[420px] items-center justify-center">
                {selectedRef?.status === "generating" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-accent-coral" />
                    </div>
                    <p className="text-sm font-medium">Generating reference image...</p>
                    <p className="text-xs text-muted-foreground">
                      Compositing your avatar into the video&apos;s environment
                    </p>
                  </div>
                )}

                {selectedRef?.status === "failed" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="min-w-0 max-w-full rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-center">
                      <p className="text-sm font-medium text-destructive">Generation failed</p>
                      {selectedRef.error && (
                        <p className="mt-1 min-w-0 break-words text-xs text-destructive/80 [overflow-wrap:anywhere]">{selectedRef.error}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedRef?.status === "completed" && selectedRef.fileId && (
                  <div className="w-full p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/files/${selectedRef.fileId}`}
                      alt="Reference image - avatar in video environment"
                      className="max-w-full max-h-[600px] mx-auto rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
              </div>
            </div>

            {refImages.length > 1 && (
              <div>
                <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                  Variants
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {refImages.map((entry, i) => (
                    <button
                      key={entry.jobId}
                      type="button"
                      onClick={() => setSelectedRefIndex(i)}
                      className={cn(
                        "relative shrink-0 size-16 rounded-lg border-2 overflow-hidden transition-all duration-150",
                        selectedRefIndex === i
                          ? "border-accent-coral"
                          : "border-border hover:border-foreground/20 opacity-70 hover:opacity-100"
                      )}
                    >
                      {entry.status === "completed" && entry.fileId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/files/${entry.fileId}`}
                          alt={`Variant ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : entry.status === "generating" ? (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Loader2 className="size-4 animate-spin text-accent-coral" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-destructive/10">
                          <span className="text-[12px] text-destructive">Failed</span>
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-1 text-[12px] font-bold text-white drop-shadow-md">
                        #{i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenLine className="size-3.5 text-muted-foreground" />
                  <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                    Reference Image Prompt
                  </p>
                </div>
                <span className="font-mono text-[12px] text-muted-foreground">
                  {refPrompt.length}/500
                </span>
              </div>
              <Textarea
                placeholder="e.g. The person is wearing a casual blue hoodie, sitting at a coffee shop table, warm afternoon light..."
                value={refPrompt}
                onChange={(e) => setRefPrompt(e.target.value.slice(0, 500))}
                maxLength={500}
                className="min-h-[120px] resize-none bg-muted/50 border border-border focus:border-accent-coral/20 focus:bg-card rounded-lg p-4 text-sm transition-all duration-150"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Total estimate:{" "}
                  <span className="font-mono text-foreground">
                    {formatCost((totalRefCost || referenceBatchCost) + videoCost + textErasureCost)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerateRefImage}
                  disabled={isSubmitting || isGenerating}
                  className="gap-2"
                >
                  {isSubmitting || isGenerating ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            </div>

            {selectedRef && selectedRef.prompt && (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="mb-1 text-[12px] uppercase tracking-widest text-muted-foreground">
                  Prompt used for #{selectedRefIndex + 1}
                </p>
                <p className="min-w-0 break-words text-xs italic leading-relaxed text-foreground/80 [overflow-wrap:anywhere] line-clamp-3">
                  {selectedRef.prompt || "(no additional prompt)"}
                </p>
              </div>
            )}

            {submitError && (
              <div className="min-w-0 break-words rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive [overflow-wrap:anywhere]">
                {submitError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={handleBackToInput} className="gap-2">
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                onClick={handleApproveAndGenerate}
                disabled={!hasAnyCompleted || !selectedRefFileId || isSubmitting}
                className="gap-2 bg-accent-coral font-semibold text-white hover:brightness-[0.93]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Approve & Generate
                    <Check className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {productionStatePanel}
      </div>
    );
  }

  return (
    <>
      <div
        data-clone-production-state="true"
        data-active-clone-step={activeSetupStep}
        className="space-y-4 pb-28"
      >
        <CloneSetupNav
          activeSetupStep={activeSetupStep}
          completedSetupSteps={completedSetupSteps}
          onSelectStep={setActiveSetupStep}
        />

        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(420px,45fr)_minmax(0,55fr)]">
          <CloneSourceStep
            hidden={activeSetupStep !== "source"}
            sourceReady={sourceReady}
            videoInfo={videoInfo}
            originalVideoInfo={originalVideoInfo}
            sourcePreviewSrc={sourcePreviewSrc}
            showTrimmer={showTrimmer}
            sourceToolsOpen={sourceToolsOpen}
            shouldShowSourceTools={shouldShowSourceTools}
            sourcesRefreshKey={sourcesRefreshKey}
            pendingSourceId={pendingSourceId}
            onToggleTrim={() => {
              if (showTrimmer) {
                handleCancelTrim();
                return;
              }
              setSourceToolsOpen(false);
              setShowTrimmer(true);
            }}
            onTogglePicker={() => {
              if (sourceReady) {
                setShowTrimmer(false);
                setSourceToolsOpen((value) => !value);
                return;
              }
              setSourceToolsOpen(true);
            }}
            onTrimmed={handleTrimmed}
            onCancelTrim={handleCancelTrim}
            onVideoDownloaded={handleVideoDownloaded}
            onPreselectedSourceResolved={handlePreselectedSourceResolved}
          />

          <CloneIdentityStep
            hidden={activeSetupStep !== "identity"}
            avatarId={avatarId}
            avatarReady={avatarReady}
            identityPack={identityPack}
            isStartingIdentityPack={isStartingIdentityPack}
            isGeneratingHairstyles={isGeneratingHairstyles}
            identityPackError={identityPackError}
            onGenerateHairstyles={() => {
              if (avatarId) {
                void generateHairstyleVariants(avatarId);
              }
            }}
            onRetry={() => {
              if (avatarId) {
                void startIdentityPack(avatarId, true);
              }
            }}
            onSelectAvatar={(nextAvatarId) => {
              setAvatarId(nextAvatarId);
              setActiveSetupStep(sourceReady ? "reference" : "source");
            }}
          />

          <section
            data-clone-reference-section="true"
            className={cn(
              "rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)] sm:p-5",
              activeSetupStep !== "reference" && "hidden"
            )}
          >
            <div className="mb-6 flex items-center gap-3">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                  Reference
                </h2>
                <p className="text-xs text-muted-foreground">Set the look before generating video.</p>
              </div>
            </div>

            <div className="grid items-start gap-4">
              <CloneReferenceInputs
                sourceReady={sourceReady}
                videoInfo={videoInfo}
                sourcePreviewSrc={sourcePreviewSrc}
                durationSec={durationSec}
                selectedCollectionAssetId={selectedCollectionAssetId}
                selectedSavedReference={selectedSavedReference}
                selectedRef={selectedRef}
                selectedRefIndex={selectedRefIndex}
                primaryAvatarReference={primaryAvatarReference}
                identityPack={identityPack}
                isStartingIdentityPack={isStartingIdentityPack}
                onClearCollection={() => setSelectedCollectionAssetId(null)}
                onClearSavedReference={() => setSelectedSavedReferenceId(null)}
              />
              <CloneReferenceOptions
                hairstyleOptions={hairstyleOptions}
                selectedHairstyleRole={selectedHairstyleRole}
                referenceBatchSize={referenceBatchSize}
                referenceBatchCost={referenceBatchCost}
                isSubmitting={isSubmitting}
                isGenerating={isGenerating}
                referenceReady={referenceReady}
                submitError={submitError}
                onSelectHairstyleRole={setSelectedHairstyleRole}
                onSelectBatchSize={setReferenceBatchSize}
              />
              <CloneReferenceLibrary
                selectedCollectionAssetId={selectedCollectionAssetId}
                selectedSavedReference={selectedSavedReference}
                selectedSavedReferenceId={selectedSavedReferenceId}
                selectedRefIndex={selectedRefIndex}
                refImages={refImages}
                isLoadingSavedReferences={isLoadingSavedReferences}
                savedReferencesError={savedReferencesError}
                savedReferences={savedReferences}
                savedReferencesNextCursor={savedReferencesNextCursor}
                isLoadingMoreSavedReferences={isLoadingMoreSavedReferences}
                referenceLibraryOpen={referenceLibraryOpen}
                showAvatarReferences={showAvatarReferences}
                avatarReferencePreviews={avatarReferencePreviews}
                identityPack={identityPack}
                isStartingIdentityPack={isStartingIdentityPack}
                onCollectionChange={(assetIds) => {
                  const nextId = assetIds[0] ?? null;
                  setSelectedCollectionAssetId(nextId);
                  if (nextId) {
                    setSelectedSavedReferenceId(null);
                    if (!selectedModel.startsWith("kling-3.0")) {
                      setSelectedModel("kling-3.0-motion");
                    }
                  }
                  setSubmitError(null);
                }}
                onSelectGenerated={(index) => {
                  setSelectedSavedReferenceId(null);
                  setSelectedCollectionAssetId(null);
                  setSelectedRefIndex(index);
                }}
                onToggleLibrary={() => {
                  setReferenceLibraryOpen((open) => !open);
                }}
                onSelectSavedReference={handleSelectSavedReference}
                onLoadMore={() => void loadMoreSavedReferences()}
                onToggleAvatarReferences={() => setShowAvatarReferences((current) => !current)}
              />
            </div>
          </section>

          <CloneLiveComposition
            activeStep={activeSetupStep}
            videoInfo={videoInfo}
            sourcePreviewSrc={sourcePreviewSrc}
            avatarId={avatarId}
            selectedReference={selectedSavedReference}
            selectedGeneratedReference={selectedRef}
            collectionReferenceUrl={
              selectedCollectionAssetId
                ? `/api/files/${encodeURIComponent(selectedCollectionAssetId)}`
                : null
            }
            sourceReady={sourceReady}
            identityReady={avatarReady}
            referenceReady={referenceReady}
            onJumpToStep={setActiveSetupStep}
          />
        </div>
      </div>

      <CloneActionBar
        cloneTip={cloneTip}
        mobileSettingsOpen={mobileSettingsOpen}
        cloneVideoModels={cloneVideoModels}
        referenceImageModels={referenceImageModels}
        selectedModel={selectedModel}
        selectedReferenceImageModel={selectedReferenceImageModel}
        keepOriginalSound={keepOriginalSound}
        removeTextOverlays={removeTextOverlays}
        durationSec={durationSec}
        referenceBatchSize={referenceBatchSize}
        textErasureCost={textErasureCost}
        totalRefCost={totalRefCost}
        referenceBatchCost={referenceBatchCost}
        videoCost={videoCost}
        isSubmitting={isSubmitting}
        isGenerating={isGenerating}
        compactActionLabel={compactActionLabel}
        primaryActionDisabled={primaryActionDisabled}
        onToggleMobileSettings={() => setMobileSettingsOpen((open) => !open)}
        onCloseMobileSettings={() => setMobileSettingsOpen(false)}
        onSelectModel={setSelectedModel}
        onSelectReferenceImageModel={setSelectedReferenceImageModel}
        onToggleSound={setKeepOriginalSound}
        onToggleTextOverlays={setRemoveTextOverlays}
        onPrimaryAction={handlePrimaryAction}
      />
    </>
  );
}
