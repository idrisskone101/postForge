"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SwapUploadedAsset } from "@/components/swap-input-section";
import { getContinuityVideoModel } from "@/lib/ai/models";
import type { ModelDefinition, SwapMode } from "@/lib/ai/types";
import { apiGet } from "@/lib/api/client";
import { userErrorMessage } from "@/lib/user-error-message";
import {
  describeGenerateIdentityStatus,
  type GenerateIdentityPackSummary,
} from "@/lib/generation-workflow";
import { useGenerationVibe } from "./use-generation-vibe";
import { usePromptImprovement } from "./use-prompt-improvement";

export function useGenerationForm(models: ModelDefinition[]) {
  const searchParams = useSearchParams();
  const requestedModel = searchParams.get("model");
  const initialModel = models.find((model) => model.id === requestedModel) ?? null;

  const [selectedModel, setSelectedModel] = useState<string | null>(
    initialModel?.id ?? null
  );
  const [prompt, setPrompt] = useState(searchParams.get("prompt") ?? "");
  const [aspectRatio, setAspectRatio] = useState(
    initialModel?.defaults.aspectRatio ?? "9:16"
  );
  const [numImages, setNumImages] = useState(
    initialModel?.defaults.numImages ?? 1
  );
  const [duration, setDuration] = useState(initialModel?.defaults.duration ?? 5);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [enableAudio, setEnableAudio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [collectionAssetIds, setCollectionAssetIds] = useState<string[]>([]);
  const [videoReferenceFileId, setVideoReferenceFileId] = useState<string | null>(
    searchParams.get("referenceFileId") ?? null
  );
  const [videoSeedMissing, setVideoSeedMissing] = useState(false);
  const [identityPack, setIdentityPack] =
    useState<GenerateIdentityPackSummary | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [swapVideo, setSwapVideo] = useState<SwapUploadedAsset | null>(null);
  const [swapReference, setSwapReference] = useState<SwapUploadedAsset | null>(null);
  const [swapMode, setSwapMode] = useState<SwapMode>("person");

  const vibe = useGenerationVibe();
  const selectedDefinition = models.find((model) => model.id === selectedModel);
  const promptImprovementContext = JSON.stringify({
    prompt,
    selectedModel,
    aspectRatio,
    duration,
    enableAudio,
    avatarId,
    collectionAssetIds,
    hasVibeTemplate: Boolean(vibe.vibeTemplate),
    foldEnabled: vibe.foldEnabled,
    videoReferenceFileId,
    swapVideoId: swapVideo?.id ?? null,
    swapReferenceId: swapReference?.id ?? null,
    swapMode,
  });
  const improvement = usePromptImprovement(promptImprovementContext);

  useEffect(() => {
    if (!avatarId) return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const pack = await apiGet<GenerateIdentityPackSummary | null>(
          `/api/avatars/${encodeURIComponent(avatarId)}/identity-pack`
        );
        if (!active) return;
        setIdentityPack(pack);
        setIdentityError(null);
        if (pack && (pack.status === "queued" || pack.status === "processing")) {
          timeoutId = setTimeout(load, 4000);
        }
      } catch (error) {
        if (!active) return;
        setIdentityPack(null);
        setIdentityError(
          userErrorMessage(error, "Identity references could not be checked.")
        );
      }
    };

    void load();
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [avatarId]);

  const handleModelSelect = (modelId: string) => {
    const nextModel = models.find((model) => model.id === modelId);
    if (!nextModel) return;
    improvement.promptImprovementRequestGateRef.current.invalidateInputs();

    setSelectedModel(nextModel.id);
    setAspectRatio(nextModel.defaults.aspectRatio);
    setSubmitError(null);
    improvement.setPromptImprovementError(null);
    improvement.setPromptImprovementNotice(null);
    setNotice(null);

    if (nextModel.type === "video") {
      vibe.resetVibeState();
      if (avatarId && collectionAssetIds.length > 0) {
        setCollectionAssetIds([]);
        setNotice(
          "Collection images were cleared because the collection vibe JSON is only available for image generation."
        );
      }
    }

    const acceptsCollectionReference =
      nextModel.type === "image"
        ? nextModel.capabilities.referenceImages === true
        : nextModel.capabilities.imageToVideo === true;
    if (collectionAssetIds.length > 0 && !acceptsCollectionReference) {
      setCollectionAssetIds([]);
      vibe.resetVibeState();
      setNotice(
        "Collection references were cleared because the selected model does not accept them."
      );
    }

    if (
      videoReferenceFileId &&
      (nextModel.capabilities.videoToVideo !== true ||
        nextModel.capabilities.subjectSwap === true)
    ) {
      setVideoReferenceFileId(null);
      setNotice(
        "The video seed was cleared because the selected model does not accept it. Kling 3.0 Image-to-Video supports continuity."
      );
    }

    if (nextModel.type === "image") {
      setNumImages(nextModel.defaults.numImages ?? 1);
      setEnableAudio(false);
    } else {
      setDuration(nextModel.defaults.duration ?? 5);
      setEnableWebSearch(false);
      if (avatarId && !nextModel.capabilities.characterReference) {
        setAvatarId(null);
        setIdentityPack(null);
        setIdentityError(null);
        setNotice((current) =>
          current ?? `${nextModel.name} does not accept a saved character identity.`
        );
      }
    }
  };

  useEffect(() => {
    if (!videoReferenceFileId) return;

    const continuityModel = getContinuityVideoModel();
    if (!continuityModel) {
      setVideoReferenceFileId(null);
      setSubmitError("No configured video model supports a video seed reference.");
      return;
    }

    if (selectedDefinition?.capabilities.videoToVideo !== true) {
      handleModelSelect(continuityModel.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCollectionAssetChange = (assetIds: string[]) => {
    setSubmitError(null);
    setNotice(null);
    improvement.promptImprovementRequestGateRef.current.invalidateInputs();
    if (assetIds.length > 0 && avatarId && selectedDefinition?.type === "video") {
      setNotice(
        "Visual collections are only available with a character identity for image generation."
      );
      return;
    }
    setCollectionAssetIds(assetIds);
    if (assetIds.length === 0) {
      vibe.resetVibeState();
      return;
    }
    if (videoReferenceFileId) {
      setVideoReferenceFileId(null);
      setNotice(
        "The video seed was cleared because visual collections cannot be combined with it yet."
      );
    }

    if (avatarId) return;

    const selectedSupportsCollection =
      selectedDefinition?.type === "image"
        ? selectedDefinition.capabilities.referenceImages === true
        : selectedDefinition?.capabilities.imageToVideo === true;
    if (selectedSupportsCollection) return;

    const fallback =
      selectedDefinition?.type === "video"
        ? models.find(
            (model) =>
              model.type === "video" && model.capabilities.imageToVideo === true
          )
        : models.find(
            (model) =>
              model.type === "image" && model.capabilities.referenceImages === true
          );
    if (fallback) {
      handleModelSelect(fallback.id);
      setCollectionAssetIds(assetIds);
      setNotice(
        `${fallback.name} selected because it supports collection references.`
      );
    } else {
      setCollectionAssetIds([]);
      setSubmitError("No configured model supports collection references.");
    }
  };

  const handleVideoReferenceChange = (fileId: string | null) => {
    improvement.promptImprovementRequestGateRef.current.invalidateInputs();
    setSubmitError(null);
    setNotice(null);
    setVideoSeedMissing(false);
    setVideoReferenceFileId(fileId);
    if (fileId && collectionAssetIds.length > 0) {
      setCollectionAssetIds([]);
      vibe.resetVibeState();
      setNotice(
        "Collection references were cleared because a video seed cannot be combined with them yet."
      );
    }
    if (avatarId) {
      setAvatarId(null);
      setIdentityPack(null);
      setIdentityError(null);
      vibe.resetVibeState();
      setNotice(
        "Character identity was cleared because video seeds do not accept it yet."
      );
    }
    if (!fileId) return;

    if (selectedDefinition?.capabilities.videoToVideo === true) return;

    const continuityModel = getContinuityVideoModel();
    if (continuityModel) {
      handleModelSelect(continuityModel.id);
      setVideoReferenceFileId(fileId);
      setNotice(
        `${continuityModel.name} selected because it supports video seed references.`
      );
    } else {
      setVideoReferenceFileId(null);
      setSubmitError("No configured video model supports a video seed reference.");
    }
  };

  const vibeMode =
    Boolean(avatarId) &&
    collectionAssetIds.length > 0 &&
    selectedDefinition?.type === "image";
  const vibeStale =
    vibe.vibeTemplate !== null &&
    vibe.vibeAssetKey !== null &&
    vibe.vibeAssetKey !== collectionAssetIds.join(",");
  const foldStale =
    vibe.foldEnabled &&
    vibe.vibeTemplate !== null &&
    vibe.foldedPromptValue !== prompt.trim();
  const vibeRequirement = !vibeMode
    ? null
    : vibe.vibeJsonError
      ? "Fix the vibe JSON (or re-extract it) to continue."
      : !vibe.vibeTemplate
        ? "Extract the vibe JSON from your collection images to continue."
        : vibeStale
          ? "Your collection selection changed. Re-extract the vibe JSON to continue."
          : vibe.foldEnabled && foldStale
            ? "Fold your prompt into the vibe JSON to continue."
            : null;

  const canSubmit =
    Boolean(selectedDefinition) &&
    prompt.trim().length > 0 &&
    !vibeRequirement &&
    !isSubmitting &&
    !improvement.isImprovingPrompt;

  const isSwapSelected = selectedDefinition?.capabilities.subjectSwap === true;
  const swapCanSubmit =
    !isSwapSelected ||
    (Boolean(swapVideo) &&
      (selectedDefinition?.id !== "pixverse-swap" || Boolean(swapReference)));

  const identityStatus = describeGenerateIdentityStatus(identityPack);
  const maximumCollectionReferences =
    selectedDefinition?.type === "video"
      ? 1
      : selectedDefinition?.capabilities.maxReferenceImages ?? 14;

  return {
    selectedModel,
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    numImages,
    duration,
    setDuration,
    negativePrompt,
    setNegativePrompt,
    enableWebSearch,
    setEnableWebSearch,
    enableAudio,
    setEnableAudio,
    isSubmitting,
    setIsSubmitting,
    advancedOpen,
    setAdvancedOpen,
    submitError,
    setSubmitError,
    notice,
    setNotice,
    avatarId,
    setAvatarId,
    collectionAssetIds,
    setCollectionAssetIds,
    videoReferenceFileId,
    setVideoReferenceFileId,
    videoSeedMissing,
    setVideoSeedMissing,
    setIdentityPack,
    identityError,
    setIdentityError,
    swapVideo,
    setSwapVideo,
    swapReference,
    setSwapReference,
    swapMode,
    setSwapMode,
    selectedDefinition,
    vibe,
    improvement,
    vibeMode,
    vibeStale,
    foldStale,
    vibeRequirement,
    canSubmit,
    isSwapSelected,
    swapCanSubmit,
    identityStatus,
    maximumCollectionReferences,
    handleModelSelect,
    handleCollectionAssetChange,
    handleVideoReferenceChange,
  };
}
