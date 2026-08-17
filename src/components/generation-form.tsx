"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ImageIcon,
  Loader2,
  Search,
  Sparkles,
  Undo2,
  Video,
  Volume2,
} from "lucide-react";
import { AvatarPicker } from "@/components/avatar-picker";
import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { ModelPicker } from "@/components/model-picker";
import { SwapInputSection, type SwapUploadedAsset } from "@/components/swap-input-section";
import { VideoReferencePicker } from "@/components/video-reference-picker";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceState } from "@/components/workspace-state";
import {
  calculateEstimatedCost,
  getContinuityVideoModel,
} from "@/lib/ai/models";
import {
  canRunPromptImprovement,
  createPromptImprovementRequestGate,
  invalidatePromptImprovementUndo,
  restorePromptImprovementUndo,
} from "@/lib/ai/prompt-improvement-ui";
import type { ModelDefinition, SwapMode } from "@/lib/ai/types";
import { apiGet, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";

interface GenerationFormProps {
  models: ModelDefinition[];
}

interface AvatarIdentityPackSummary {
  id: string;
  avatarId: string;
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  images: { id: string }[];
}

interface GenerateFormViewProps {
  models: ModelDefinition[];
  selectedModel: string | null;
  prompt: string;
  aspectRatio: string;
  numImages: number;
  duration?: number;
  negativePrompt: string;
  enableWebSearch: boolean;
  enableAudio: boolean;
  isSubmitting: boolean;
  isImprovingPrompt?: boolean;
  advancedOpen: boolean;
  submitError?: string | null;
  notice?: string | null;
  promptImprovementError?: string | null;
  promptImprovementNotice?: string | null;
  promptEnhancerConfigured?: boolean | null;
  canUndoPromptImprovement?: boolean;
  onModelSelect: (modelId: string) => void;
  onPromptChange: (prompt: string) => void;
  onAspectRatioChange: (ratio: string) => void;
  onNumImagesChange: (numImages: number) => void;
  onDurationChange?: (duration: number) => void;
  onNegativePromptChange: (prompt: string) => void;
  onEnableWebSearchChange: (enabled: boolean) => void;
  onEnableAudioChange: (enabled: boolean) => void;
  onAdvancedOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onImprovePrompt?: () => void;
  onUndoPromptImprovement?: () => void;
  onAppendToPrompt: (text: string) => void;
  avatarSection?: ReactNode;
  referenceSection?: ReactNode;
  continuitySection?: ReactNode;
  swapSection?: ReactNode;
  swapReady?: boolean;
  swapSourceDurationSec?: number;
  avatarName?: string | null;
}

const CREATIVE_SPARKS = [
  "Candid UGC",
  "Natural window light",
  "Crisp product detail",
  "Handheld framing",
  "Soft focus",
  "Cinematic lighting",
];

const RATIO_LABELS: Record<string, string> = {
  "9:16": "Portrait",
  "4:5": "Social",
  "1:1": "Square",
  "4:3": "Classic",
  "3:2": "Photo",
  "16:9": "Landscape",
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;
}

function describeIdentityStatus(pack: AvatarIdentityPackSummary | null): {
  label: string;
  tone: "ready" | "working" | "failed";
} {
  if (!pack) {
    return {
      label: "No prepared identity pack yet. The original avatar image will be used.",
      tone: "ready",
    };
  }

  if (pack.status === "completed") {
    return {
      label: `${pack.images.length} identity reference${pack.images.length === 1 ? " is" : "s are"} ready.`,
      tone: "ready",
    };
  }

  if (pack.status === "failed") {
    return {
      label: pack.error
        ? `Identity preparation failed: ${pack.error}`
        : "Identity preparation failed. The original avatar image will be used.",
      tone: "failed",
    };
  }

  return {
    label: "Preparing identity references. The original avatar is usable now.",
    tone: "working",
  };
}

export function GenerateEmptyState() {
  return (
    <WorkspaceState
      tone="empty"
      icon={Sparkles}
      title="No generation models available"
      description="Model configuration could not be loaded. Use Clone or return Home while the Generate engines are unavailable."
      action={{ href: "/ugc-clone", label: "Open Clone" }}
      secondaryAction={{ href: "/", label: "Return Home" }}
      className="min-h-96"
    />
  );
}

export function GenerationForm({ models }: GenerationFormProps) {
  const router = useRouter();
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
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [promptBeforeImprovement, setPromptBeforeImprovement] = useState<string | null>(
    null
  );
  const [promptImprovementError, setPromptImprovementError] = useState<string | null>(
    null
  );
  const [promptImprovementNotice, setPromptImprovementNotice] = useState<string | null>(
    null
  );
  const [promptEnhancerConfigured, setPromptEnhancerConfigured] = useState<
    boolean | null
  >(null);
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
    useState<AvatarIdentityPackSummary | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [swapVideo, setSwapVideo] = useState<SwapUploadedAsset | null>(null);
  const [swapReference, setSwapReference] = useState<SwapUploadedAsset | null>(null);
  const [swapMode, setSwapMode] = useState<SwapMode>("person");
  const promptImprovementContext = JSON.stringify({
    prompt,
    selectedModel,
    aspectRatio,
    duration,
    enableAudio,
    avatarId,
    collectionAssetIds,
    videoReferenceFileId,
    swapVideoId: swapVideo?.id ?? null,
    swapReferenceId: swapReference?.id ?? null,
    swapMode,
  });
  const promptImprovementContextRef = useRef(promptImprovementContext);
  const promptImprovementRequestGateRef = useRef(
    createPromptImprovementRequestGate()
  );

  useEffect(() => {
    promptImprovementContextRef.current = promptImprovementContext;
  }, [promptImprovementContext]);

  useEffect(() => {
    let active = true;
    void apiGet<{
      providers: Array<{ provider: string; configured: boolean }>;
    }>("/api/settings/provider-credentials")
      .then((result) => {
        if (!active) return;
        const gemini = result.providers.find((provider) => provider.provider === "gemini");
        setPromptEnhancerConfigured(gemini?.configured ?? false);
      })
      .catch(() => {
        if (active) setPromptEnhancerConfigured(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!avatarId) return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const pack = await apiGet<AvatarIdentityPackSummary | null>(
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
          errorMessage(error, "Identity references could not be checked.")
        );
      }
    };

    void load();
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [avatarId]);

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

  if (models.length === 0) return <GenerateEmptyState />;

  const selectedDefinition = models.find((model) => model.id === selectedModel);

  const handleModelSelect = (modelId: string) => {
    const nextModel = models.find((model) => model.id === modelId);
    if (!nextModel) return;
    promptImprovementRequestGateRef.current.invalidateInputs();

    setSelectedModel(nextModel.id);
    setAspectRatio(nextModel.defaults.aspectRatio);
    setSubmitError(null);
    setPromptImprovementError(null);
    setPromptImprovementNotice(null);
    setNotice(null);

    const acceptsCollectionReference =
      nextModel.type === "image"
        ? nextModel.capabilities.referenceImages === true
        : nextModel.capabilities.imageToVideo === true;
    if (collectionAssetIds.length > 0 && !acceptsCollectionReference) {
      setCollectionAssetIds([]);
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
        setNotice(`${nextModel.name} does not accept a saved character identity.`);
      }
    }
  };

  const handleAvatarSelect = (id: string) => {
    promptImprovementRequestGateRef.current.invalidateInputs();
    const nextAvatarId = id || null;
    setSubmitError(null);
    setIdentityError(null);
    setAvatarId(nextAvatarId);
    if (nextAvatarId && collectionAssetIds.length > 0) {
      setCollectionAssetIds([]);
      setNotice(
        "Collection references were cleared because character identity and visual collections cannot be combined yet."
      );
    }
    if (nextAvatarId && videoReferenceFileId) {
      setVideoReferenceFileId(null);
      setNotice(
        "The video seed was cleared because character identity and continuity seeds cannot be combined yet."
      );
    }
    if (!nextAvatarId) {
      setIdentityPack(null);
      return;
    }

    const selectedSupportsIdentity =
      (selectedDefinition?.type === "image" &&
        selectedDefinition.capabilities.referenceImages === true) ||
      (selectedDefinition?.type === "video" &&
        Boolean(selectedDefinition.capabilities.characterReference));
    if (selectedSupportsIdentity) return;

    const fallback =
      selectedDefinition?.type === "video"
        ? models.find(
            (model) =>
              model.type === "video" && Boolean(model.capabilities.characterReference)
          )
        : models.find(
            (model) =>
              model.type === "image" && model.capabilities.referenceImages === true
          );
    if (fallback) {
      handleModelSelect(fallback.id);
      setAvatarId(nextAvatarId);
      setNotice(`${fallback.name} selected because it supports avatar identity.`);
    } else {
      setAvatarId(null);
      setIdentityError("No configured model supports character identity for this output type.");
    }
  };

  const handleCollectionAssetChange = (assetIds: string[]) => {
    setSubmitError(null);
    setNotice(null);
    if (avatarId) return;
    promptImprovementRequestGateRef.current.invalidateInputs();
    setCollectionAssetIds(assetIds);
    if (assetIds.length > 0 && videoReferenceFileId) {
      setVideoReferenceFileId(null);
      setNotice(
        "The video seed was cleared because visual collections cannot be combined with it yet."
      );
    }
    if (assetIds.length === 0) return;

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
    promptImprovementRequestGateRef.current.invalidateInputs();
    setSubmitError(null);
    setNotice(null);
    setVideoSeedMissing(false);
    setVideoReferenceFileId(fileId);
    if (fileId && collectionAssetIds.length > 0) {
      setCollectionAssetIds([]);
      setNotice(
        "Collection references were cleared because a video seed cannot be combined with them yet."
      );
    }
    if (avatarId) {
      setAvatarId(null);
      setIdentityPack(null);
      setIdentityError(null);
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

  const canSubmit =
    Boolean(selectedDefinition) &&
    prompt.trim().length > 0 &&
    !isSubmitting &&
    !isImprovingPrompt;

  const isSwapSelected = selectedDefinition?.capabilities.subjectSwap === true;
  const swapCanSubmit =
    !isSwapSelected ||
    (Boolean(swapVideo) &&
      (selectedDefinition?.id !== "pixverse-swap" || Boolean(swapReference)));

  const handleImprovePrompt = async () => {
    if (!selectedDefinition) {
      setPromptImprovementError("Choose a model before improving the prompt.");
      return;
    }
    const originalPromptValue = prompt;
    const originalPrompt = originalPromptValue.trim();
    if (!originalPrompt) {
      setPromptImprovementError("Write a rough prompt first. A short sentence is enough.");
      return;
    }

    const requestToken = promptImprovementRequestGateRef.current.begin();
    if (!requestToken) return;
    const requestContext = promptImprovementContextRef.current;
    setIsImprovingPrompt(true);
    setPromptImprovementError(null);
    setPromptImprovementNotice(null);
    setNotice(null);
    try {
      const result = await apiPost<{ prompt: string; model: string }>(
        "/api/prompts/improve",
        {
          prompt: originalPrompt,
          model: selectedDefinition.id,
          aspectRatio,
          duration:
            selectedDefinition.type === "video" ? duration : undefined,
          enableAudio:
            selectedDefinition.type === "video" &&
            enableAudio &&
            selectedDefinition.capabilities.nativeAudio === true,
          hasCharacterReference: Boolean(avatarId),
          hasVisualReference:
            collectionAssetIds.length > 0 ||
            Boolean(videoReferenceFileId) ||
            Boolean(swapVideo) ||
            Boolean(swapReference),
        }
      );
      if (
        !promptImprovementRequestGateRef.current.isCurrent(requestToken) ||
        promptImprovementContextRef.current !== requestContext
      ) {
        setPromptImprovementError(
          "Your prompt or generation settings changed while the improved version was being prepared. Run Improve prompt again when you are ready."
        );
        return;
      }
      setPromptBeforeImprovement(originalPromptValue);
      setPrompt(result.prompt);
      setPromptImprovementNotice(
        `Prompt improved for ${selectedDefinition.name}. Review it before generating.`
      );
    } catch (error) {
      setPromptImprovementError(
        errorMessage(error, "Prompt improvement failed. Your original prompt is unchanged.")
      );
    } finally {
      promptImprovementRequestGateRef.current.finish(requestToken);
      setIsImprovingPrompt(false);
    }
  };

  const handleUndoPromptImprovement = () => {
    const restored = restorePromptImprovementUndo({
      promptBeforeImprovement,
      promptImprovementNotice,
    });
    if (!restored) return;
    promptImprovementRequestGateRef.current.invalidateInputs();
    setPrompt(restored.prompt);
    setPromptBeforeImprovement(restored.state.promptBeforeImprovement);
    setPromptImprovementError(null);
    setPromptImprovementNotice(restored.state.promptImprovementNotice);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedDefinition || !swapCanSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setNotice(null);

    try {
      if (selectedDefinition.capabilities.subjectSwap) {
        const result = await apiPost<{ id: string }>("/api/generate/swap", {
          prompt: prompt.trim(),
          model: selectedDefinition.id,
          swapVideoId: swapVideo?.id,
          swapReferenceId: swapReference?.id,
          swapMode,
        });
        router.push(`/generate/${result.id}`);
        return;
      }
      if (selectedDefinition.type === "image") {
        const result = await apiPost<{ id: string }>("/api/generate/images", {
          prompt: prompt.trim(),
          model: selectedDefinition.id,
          aspectRatio,
          numImages,
          negativePrompt: negativePrompt.trim() || undefined,
          enableWebSearch: avatarId ? undefined : enableWebSearch,
          avatarId: avatarId ?? undefined,
          collectionAssetIds:
            collectionAssetIds.length > 0 ? collectionAssetIds : undefined,
        });
        router.push(`/generate/${result.id}`);
      } else {
        const result = await apiPost<{ id: string }>("/api/generate/videos", {
          prompt: prompt.trim(),
          model: selectedDefinition.id,
          aspectRatio,
          duration,
          enableAudio:
            enableAudio && selectedDefinition.capabilities.nativeAudio === true,
          avatarId: avatarId ?? undefined,
          negativePrompt: negativePrompt.trim() || undefined,
          collectionAssetIds:
            collectionAssetIds.length > 0 ? collectionAssetIds.slice(0, 1) : undefined,
          referenceFileId: videoReferenceFileId ?? undefined,
        });
        router.push(`/generate/${result.id}`);
      }
    } catch (error) {
      setSubmitError(errorMessage(error, "Generation could not be started."));
      setIsSubmitting(false);
    }
  };
  const identityStatus = describeIdentityStatus(identityPack);
  const avatarSection =
    selectedDefinition?.type !== "video" ||
    Boolean(selectedDefinition.capabilities.characterReference) ? (
    <div className="rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Character identity
            </h2>
            <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Optional
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[12px] leading-4 text-muted-foreground">
            {selectedDefinition?.type === "video"
              ? "Create an identity-locked opening frame, then bind the same character through the video."
              : "Reuse a saved identity. A compatible image model is selected automatically."}
          </p>
        </div>
        {avatarId && (
          <button
            type="button"
            onClick={() => handleAvatarSelect("")}
            className="text-[12px] font-semibold text-[var(--pf-link)] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {avatarId && (
        <div
          role={identityStatus.tone === "failed" ? "alert" : "status"}
          className={cn(
            "mb-3 flex min-w-0 items-start gap-2 rounded-lg px-3 py-2 text-[12px] leading-4",
            identityStatus.tone === "ready" && "bg-[var(--pf-success)]/10 text-[var(--pf-success)]",
            identityStatus.tone === "working" && "bg-[var(--pf-link)]/10 text-[var(--pf-link)]",
            identityStatus.tone === "failed" && "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
          )}
        >
          {identityStatus.tone === "ready" ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          ) : identityStatus.tone === "failed" ? (
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" />
          )}
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            {identityStatus.label}
          </span>
        </div>
      )}

      {identityError && (
        <div
          role="alert"
          className="mb-3 flex min-w-0 items-start gap-2 rounded-lg bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] leading-4 text-[var(--pf-danger)]"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            {identityError}
          </span>
        </div>
      )}

      <AvatarPicker selectedId={avatarId} onSelect={handleAvatarSelect} />
    </div>
    ) : undefined;
  const maximumCollectionReferences =
    selectedDefinition?.type === "video"
      ? 1
      : selectedDefinition?.capabilities.maxReferenceImages ?? 14;
  const referenceSection = (
    <div className="rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Visual collection
            </h2>
            <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Optional
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[12px] leading-4 text-muted-foreground">
            Reuse server-owned product, location, or style images from Collections.
          </p>
        </div>
        {collectionAssetIds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              promptImprovementRequestGateRef.current.invalidateInputs();
              setCollectionAssetIds([]);
            }}
            className="text-[12px] font-semibold text-[var(--pf-link)] hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <CollectionReferencePicker
        selectedAssetIds={collectionAssetIds}
        onChange={handleCollectionAssetChange}
        maxSelection={maximumCollectionReferences}
        disabled={Boolean(avatarId) || Boolean(videoReferenceFileId)}
        disabledMessage="Clear the character identity or video seed to use visual collection references."
      />
    </div>
  );

  const continuitySection =
    selectedDefinition?.type === "video" && !isSwapSelected ? (
      <div className="animate-content-enter rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                Character continuity
              </h2>
              <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Optional
              </span>
            </div>
            <p className="mt-2 max-w-lg text-[12px] leading-4 text-muted-foreground">
              Seed the next video with a previous output so the same character
              carries across your series.
            </p>
          </div>
          {videoReferenceFileId && !videoSeedMissing && (
            <button
              type="button"
              onClick={() => handleVideoReferenceChange(null)}
              className="text-[12px] font-semibold text-[var(--pf-link)] hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <VideoReferencePicker
          selectedFileId={videoReferenceFileId}
          onChange={handleVideoReferenceChange}
          onSeedMissingChange={setVideoSeedMissing}
          disabled={Boolean(avatarId) || collectionAssetIds.length > 0}
          disabledMessage="Clear the character identity or visual collection references to use a video seed."
        />
      </div>
    ) : undefined;

  const swapSection = isSwapSelected ? (
    <div className="rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Subject swap
            </h2>
            <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {selectedDefinition?.id === "pixverse-swap" ? "Reference required" : "Prompt-driven"}
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[12px] leading-4 text-muted-foreground">
            {selectedDefinition?.id === "pixverse-swap"
              ? "Upload a video and a reference image. The referenced subject replaces the matching subject while the rest of the video stays the same."
              : "Upload a video and describe the swap in your prompt. Gemini Omni Edit keeps everything else in the frame consistent."}
          </p>
        </div>
      </div>
      <SwapInputSection
        value={{ video: swapVideo, reference: swapReference, swapMode }}
        onChange={({ video, reference, swapMode: nextSwapMode }) => {
          promptImprovementRequestGateRef.current.invalidateInputs();
          setSwapVideo(video);
          setSwapReference(reference);
          setSwapMode(nextSwapMode);
        }}
        requireReference={selectedDefinition?.id === "pixverse-swap"}
      />
    </div>
  ) : undefined;

  return (
    <GenerateFormView
      models={models}
      selectedModel={selectedModel}
      prompt={prompt}
      aspectRatio={aspectRatio}
      numImages={numImages}
      duration={duration}
      negativePrompt={negativePrompt}
      enableWebSearch={enableWebSearch}
      enableAudio={enableAudio}
      isSubmitting={isSubmitting}
      isImprovingPrompt={isImprovingPrompt}
      advancedOpen={advancedOpen}
      submitError={submitError}
      notice={notice}
      promptImprovementError={promptImprovementError}
      promptImprovementNotice={promptImprovementNotice}
      promptEnhancerConfigured={promptEnhancerConfigured}
      canUndoPromptImprovement={promptBeforeImprovement !== null}
      onModelSelect={handleModelSelect}
      onPromptChange={(nextPrompt) => {
        promptImprovementRequestGateRef.current.invalidateInputs();
        const invalidated = invalidatePromptImprovementUndo();
        setPrompt(nextPrompt);
        setPromptBeforeImprovement(invalidated.promptBeforeImprovement);
        setPromptImprovementError(null);
        setPromptImprovementNotice(invalidated.promptImprovementNotice);
      }}
      onAspectRatioChange={(nextAspectRatio) => {
        promptImprovementRequestGateRef.current.invalidateInputs();
        setAspectRatio(nextAspectRatio);
      }}
      onNumImagesChange={setNumImages}
      onDurationChange={(nextDuration) => {
        promptImprovementRequestGateRef.current.invalidateInputs();
        setDuration(nextDuration);
      }}
      onNegativePromptChange={setNegativePrompt}
      onEnableWebSearchChange={setEnableWebSearch}
      onEnableAudioChange={(enabled) => {
        promptImprovementRequestGateRef.current.invalidateInputs();
        setEnableAudio(enabled);
      }}
      onAdvancedOpenChange={setAdvancedOpen}
      onSubmit={handleSubmit}
      onImprovePrompt={handleImprovePrompt}
      onUndoPromptImprovement={handleUndoPromptImprovement}
      onAppendToPrompt={(text) => {
        promptImprovementRequestGateRef.current.invalidateInputs();
        const invalidated = invalidatePromptImprovementUndo();
        setPrompt((current) => (current ? `${current}, ${text}` : text));
        setPromptBeforeImprovement(invalidated.promptBeforeImprovement);
        setPromptImprovementError(null);
        setPromptImprovementNotice(invalidated.promptImprovementNotice);
      }}
      avatarSection={isSwapSelected ? undefined : avatarSection}
      referenceSection={isSwapSelected ? undefined : referenceSection}
      continuitySection={continuitySection}
      swapSection={swapSection}
      swapReady={swapCanSubmit}
      swapSourceDurationSec={swapVideo?.durationSec ?? undefined}
      avatarName={
        avatarId
          ? "Character identity"
          : videoReferenceFileId && !videoSeedMissing
            ? "Continuity seed"
            : collectionAssetIds.length > 0
              ? `${collectionAssetIds.length} collection reference${collectionAssetIds.length === 1 ? "" : "s"}`
              : null
      }
    />
  );
}

function RatioIcon({ ratio }: { ratio: string }) {
  const [width, height] = ratio.split(":").map(Number);
  const safeWidth = Number.isFinite(width) ? width : 1;
  const safeHeight = Number.isFinite(height) ? height : 1;
  const max = Math.max(safeWidth, safeHeight);

  return (
    <span
      className="block rounded-[2px] border-[1.5px] border-current"
      style={{
        width: `${Math.max(7, Math.round((safeWidth / max) * 13))}px`,
        height: `${Math.max(7, Math.round((safeHeight / max) * 13))}px`,
      }}
    />
  );
}

export function GenerateFormView({
  models,
  selectedModel,
  prompt,
  aspectRatio,
  numImages,
  duration = 5,
  negativePrompt,
  enableWebSearch,
  enableAudio,
  isSubmitting,
  isImprovingPrompt = false,
  advancedOpen,
  submitError = null,
  notice = null,
  promptImprovementError = null,
  promptImprovementNotice = null,
  promptEnhancerConfigured = null,
  canUndoPromptImprovement = false,
  onModelSelect,
  onPromptChange,
  onAspectRatioChange,
  onNumImagesChange,
  onDurationChange = () => {},
  onNegativePromptChange,
  onEnableWebSearchChange,
  onEnableAudioChange,
  onAdvancedOpenChange,
  onSubmit,
  onImprovePrompt = () => {},
  onUndoPromptImprovement = () => {},
  onAppendToPrompt,
  avatarSection,
  referenceSection,
  continuitySection,
  swapSection,
  swapReady = true,
  swapSourceDurationSec,
  avatarName,
}: GenerateFormViewProps) {
  const model = models.find((item) => item.id === selectedModel);
  const isImage = model?.type === "image";
  const isVideo = model?.type === "video";
  const isSwap = model?.capabilities.subjectSwap === true;
  const requiresVideoSeed = model?.id === "kling-3.0-i2v" && !avatarName;
  const canSubmit =
    Boolean(model) &&
    prompt.trim().length > 0 &&
    !requiresVideoSeed &&
    !isSubmitting &&
    !isImprovingPrompt &&
    swapReady;
  const missing: string[] = [];
  if (!model) missing.push("a model");
  if (!prompt.trim()) missing.push("a prompt");
  if (requiresVideoSeed) missing.push("a character or seed image");
  const activeType = model?.type ?? "image";
  const recommendedModelId =
    models.find((item) => item.type === activeType)?.id ?? undefined;
  const characterVideoAnchorModel = models.find(
    (item) => item.type === "image" && item.capabilities.referenceImages === true
  );
  const characterVideoAnchorCost =
    isVideo && avatarName === "Character identity" && characterVideoAnchorModel
      ? calculateEstimatedCost(characterVideoAnchorModel.id, { numImages: 1 })
      : 0;
  const estimatedCost = model
    ? characterVideoAnchorCost + calculateEstimatedCost(model.id, {
        numImages: isImage ? numImages : undefined,
        durationSec: isSwap ? swapSourceDurationSec : isVideo ? duration : undefined,
        enableAudio: enableAudio && model.capabilities.nativeAudio === true,
      })
    : 0;
  const availableRatios = model?.limits.aspectRatios ?? ["9:16", "1:1", "16:9"];
  const outputOptions = Array.from(
    { length: Math.max(1, model?.limits.maxImages ?? 1) },
    (_, index) => index + 1
  );
  const durationOptions = (() => {
    if (!model || model.type !== "video") return [];
    const minimum = model.limits.minDuration ?? model.defaults.duration ?? 5;
    const maximum = model.limits.maxDuration ?? model.defaults.duration ?? 5;
    const defaultDuration = model.defaults.duration ?? minimum;
    const middle = Math.round((minimum + maximum) / 2);
    return Array.from(new Set([minimum, defaultDuration, middle, maximum])).sort(
      (a, b) => a - b
    );
  })();
  const previewWidthClass =
    aspectRatio === "9:16"
      ? "w-[min(72%,310px)]"
      : aspectRatio === "16:9"
        ? "w-[min(96%,560px)]"
        : "w-[min(86%,430px)]";
  const variationCount = isImage ? numImages : 1;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="grid items-start gap-4 pb-20 md:pb-0 xl:grid-cols-[minmax(360px,0.72fr)_minmax(500px,1.28fr)]"
    >
      <span className="sr-only">
        Creative Prompt Model Selection Current Config {isImage ? `${numImages} img` : ""}
      </span>

      <div className="min-w-0 space-y-3">
        <section className="rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                Describe your {isVideo ? "video" : "image"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {canUndoPromptImprovement && (
                <button
                  type="button"
                  onClick={onUndoPromptImprovement}
                  className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted-foreground hover:bg-[var(--pf-active)] hover:text-foreground"
                >
                  <Undo2 className="size-3" /> Undo
                </button>
              )}
              <button
                type="button"
                onClick={onImprovePrompt}
                disabled={
                  !canRunPromptImprovement({
                    hasModel: Boolean(model),
                    hasPrompt: Boolean(prompt.trim()),
                    isRunning: isImprovingPrompt,
                    configured: promptEnhancerConfigured,
                  })
                }
                aria-busy={isImprovingPrompt}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold text-[var(--pf-link)] hover:bg-[var(--pf-active)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isImprovingPrompt ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                {isImprovingPrompt ? "Improving…" : "Improve prompt"}
              </button>
            </div>
          </div>

          <Textarea
            aria-label="Creative prompt"
            placeholder="Describe the scene, subject, action, lighting, and camera framing..."
            value={prompt}
            maxLength={1500}
            onChange={(event) => onPromptChange(event.target.value.slice(0, 1500))}
            className="min-h-[118px] resize-none rounded-lg border-border bg-card px-3 py-3 text-[12px] leading-5 text-foreground shadow-none focus-visible:border-[var(--pf-orange)] focus-visible:ring-[var(--pf-orange)]/10"
          />
          <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
            <span>{prompt.length}/1,500</span>
            <span>Be specific about the opening frame</span>
          </div>

          {promptImprovementError && (
            <div
              role="alert"
              className="mt-2 flex items-start gap-1.5 text-[12px] leading-4 text-[var(--pf-danger)]"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{promptImprovementError}</span>
            </div>
          )}

          {promptEnhancerConfigured === false && !promptImprovementError && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-4 text-muted-foreground">
              <span>Prompt improvement needs a Gemini API key.</span>
              <Link
                href="/settings?tab=api-keys"
                className="inline-flex min-h-9 items-center font-semibold text-[var(--pf-link)] hover:underline"
              >
                Add key in Settings
              </Link>
            </div>
          )}

          {promptImprovementNotice && (
            <div
              role="status"
              className="mt-2 flex items-start gap-1.5 text-[12px] leading-4 text-[var(--pf-link)]"
            >
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              <span>{promptImprovementNotice}</span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {CREATIVE_SPARKS.map((spark) => (
              <button
                key={spark}
                type="button"
                onClick={() => onAppendToPrompt(spark)}
                className="rounded-md border border-border bg-[var(--pf-active)] px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-[var(--pf-border-strong)] hover:text-foreground"
              >
                {spark}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                Choose a model
              </h2>
            </div>
            <span className="rounded-full bg-[var(--pf-success)]/10 px-2 py-1 text-[13px] font-semibold text-[var(--pf-success)]">
              Live pricing
            </span>
          </div>
          <ModelPicker
            selectedModel={selectedModel}
            onModelSelect={onModelSelect}
            models={models}
            recommendedModelId={recommendedModelId}
          />
        </section>

        {model && (
          <section
            key={model.id}
            className="animate-content-enter rounded-lg border border-border bg-white p-4 shadow-[var(--pf-shadow-2xs)]"
          >
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                Format and output
              </h2>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
                <label className="text-[12px] text-muted-foreground">Aspect Ratio</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableRatios.map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      aria-pressed={aspectRatio === ratio}
                      onClick={() => onAspectRatioChange(ratio)}
                      className={cn(
                        "flex h-8 min-w-[64px] items-center justify-center gap-1.5 rounded-lg border px-2 text-[12px] font-medium transition-colors",
                        aspectRatio === ratio
                          ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)] text-foreground"
                          : "border-border bg-white text-muted-foreground hover:border-[var(--pf-border-strong)]"
                      )}
                      title={RATIO_LABELS[ratio] ?? ratio}
                    >
                      <RatioIcon ratio={ratio} />
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {isImage && (
                <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
                  <label className="text-[12px] text-muted-foreground">Outputs</label>
                  <div className="flex gap-1.5">
                    {outputOptions.map((count) => (
                      <button
                        key={count}
                        type="button"
                        aria-pressed={numImages === count}
                        onClick={() => onNumImagesChange(count)}
                        className={cn(
                          "grid size-8 place-items-center rounded-lg border text-[12px] font-semibold transition-colors",
                          numImages === count
                            ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)] text-foreground"
                            : "border-border bg-white text-muted-foreground hover:border-[var(--pf-border-strong)]"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isVideo && (
                <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
                  <label className="text-[12px] text-muted-foreground">Duration</label>
                  <div className="flex flex-wrap gap-1.5">
                    {durationOptions.map((seconds) => (
                      <button
                        key={seconds}
                        type="button"
                        aria-pressed={duration === seconds}
                        onClick={() => onDurationChange(seconds)}
                        className={cn(
                          "flex h-8 min-w-12 items-center justify-center gap-1 rounded-lg border px-2 text-[12px] font-semibold transition-colors",
                          duration === seconds
                            ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)] text-foreground"
                            : "border-border bg-white text-muted-foreground hover:border-[var(--pf-border-strong)]"
                        )}
                      >
                        <Clock3 className="size-3" /> {seconds}s
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Collapsible open={advancedOpen} onOpenChange={onAdvancedOpenChange}>
              <CollapsibleTrigger
                render={
                  <button
                    type="button"
                    className="mt-4 flex w-full items-center justify-between border-t border-border pt-3 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
                  />
                }
              >
                Advanced settings
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-150",
                    advancedOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                {isImage && (
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                      Negative prompt
                    </span>
                    <Textarea
                      value={negativePrompt}
                      onChange={(event) => onNegativePromptChange(event.target.value)}
                      placeholder="Logos, distorted hands, extra fingers..."
                      className="min-h-20 resize-none rounded-lg border-border bg-card text-[12px] shadow-none"
                    />
                  </label>
                )}

                {isImage && model.capabilities.webSearch && (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-[var(--pf-active)] px-3 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Search className="size-3.5 text-muted-foreground" />
                      <span>
                        <strong className="block text-[12px] font-semibold text-foreground">
                          Web grounding
                        </strong>
                        <small className="mt-0.5 block text-[12px] text-muted-foreground">
                          Use current context to enrich the prompt
                        </small>
                      </span>
                    </span>
                    <Switch
                      aria-label="Web grounding"
                      checked={enableWebSearch}
                      onCheckedChange={onEnableWebSearchChange}
                    />
                  </div>
                )}

                {isVideo &&
                  model.capabilities.nativeAudio === true &&
                  model.id !== "gemini-omni-flash" && (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-[var(--pf-active)] px-3 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Volume2 className="size-3.5 text-muted-foreground" />
                      <span>
                        <strong className="block text-[12px] font-semibold text-foreground">
                          Native audio
                        </strong>
                        <small className="mt-0.5 block text-[12px] text-muted-foreground">
                          Generate ambient sound and dialogue
                        </small>
                      </span>
                    </span>
                    <Switch
                      aria-label="Native audio"
                      checked={enableAudio}
                      onCheckedChange={onEnableAudioChange}
                    />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </section>
        )}

        {avatarSection}
        {referenceSection}
        {continuitySection}
        {swapSection}
      </div>

      <aside className="min-w-0 overflow-hidden rounded-[8px] border border-border bg-white shadow-[var(--pf-shadow-sm)] xl:sticky xl:top-4">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <span className="text-[13px] font-semibold text-foreground">Preview</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold text-muted-foreground">
            {isVideo ? <Video className="size-3" /> : <ImageIcon className="size-3" />}
            {RATIO_LABELS[aspectRatio] ?? aspectRatio}
          </span>
        </div>

        <div className="grid min-h-[470px] place-items-center bg-[#09090B] p-5 sm:min-h-[560px] sm:p-8 xl:min-h-[590px]">
          <div
            aria-label={`${aspectRatio} output preview`}
            className={cn(
              "relative grid max-h-[520px] min-h-[220px] place-items-center overflow-hidden rounded-lg border border-white/10",
              previewWidthClass
            )}
            style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
          >
            <div className="relative mx-6 min-w-0 max-w-full text-center">
              <Sparkles className="mx-auto size-5 text-[var(--pf-orange)]" />
              <strong className="mt-3 block text-[13px] font-semibold text-white">
                {model ? "Ready to generate" : "Choose a model"}
              </strong>
              <span className="mt-1.5 block min-w-0 max-w-52 break-words text-[12px] leading-4 text-white/50 [overflow-wrap:anywhere]">
                {prompt.trim()
                  ? prompt.trim().slice(0, 112)
                  : "Your prompt and output settings will appear here before submission."}
              </span>
            </div>
            {model && (
              <span className="absolute bottom-3 left-3 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                {model.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex min-h-[72px] items-center gap-2 overflow-x-auto border-t border-border px-3 py-2.5">
          {Array.from({ length: Math.max(1, variationCount) }, (_, index) => (
            <div
              key={index}
              className={cn(
                "relative grid h-12 w-10 shrink-0 place-items-center rounded-lg border bg-[var(--pf-canvas)] text-[13px] font-semibold text-muted-foreground",
                index === 0 ? "border-[var(--pf-orange)]" : "border-border"
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </div>
          ))}
          <span className="ml-1 text-[12px] leading-4 text-muted-foreground">
            {variationCount} output{variationCount === 1 ? "" : "s"} will be added to
            the editor.
          </span>
        </div>

        {(submitError || notice) && (
          <div
            role={submitError ? "alert" : "status"}
            className={cn(
              "mx-3 mt-3 flex min-w-0 items-start gap-2 rounded-lg px-3 py-2.5 text-[12px] leading-4",
              !submitError && "animate-success-pulse",
              submitError
                ? "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                : "bg-[var(--pf-link)]/10 text-[var(--pf-link)]"
            )}
          >
            {submitError ? (
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
            )}
            <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
              {submitError ?? notice}
            </span>
          </div>
        )}

        <div className="sticky bottom-0 hidden gap-3 border-t border-border bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <span className="block truncate text-[12px] text-muted-foreground">
              {model
                ? isSwap
                  ? `${model.name} · subject swap · ${swapSourceDurationSec ? `${Math.round(swapSourceDurationSec)}s source` : "source video"}`
                  : `${model.name} · ${aspectRatio} · ${isImage ? `${numImages} output${numImages === 1 ? "" : "s"}` : `${duration}s video`}${avatarName ? ` · ${avatarName}` : ""}`
                : "Select a model and describe your asset"}
            </span>
            <strong className="mt-1 block text-[13px] font-semibold text-foreground">
              Cost Estimate · {model ? formatCost(estimatedCost) : "—"}
            </strong>
            {isVideo && avatarName === "Character identity" && (
              <span className="mt-0.5 block text-[12px] text-muted-foreground">
                Includes one identity-locked opening frame
              </span>
            )}
            {missing.length > 0 && (
              <span className="mt-0.5 block text-[12px] text-[var(--pf-lamp-amber)]">
                {isSwap && !swapReady
                  ? model?.id === "pixverse-swap"
                    ? "Add a source video and a swap reference to continue"
                    : "Add a source video to continue"
                  : `Add ${missing.join(" and ")} to continue`}
              </span>
            )}
          </div>
          <Button
            type="submit"
            aria-label="Generate Now"
            disabled={!canSubmit}
            className="h-11 min-w-[174px] rounded-lg bg-[var(--pf-orange)] px-5 text-[13px] font-semibold text-white shadow-[var(--pf-shadow-orange)] hover:brightness-[0.93]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Generating…
              </>
            ) : (
              <>
                {isSwap ? "Swap subject" : `Generate ${isVideo ? "video" : "image"}`}
                <ArrowRight className="ml-2 size-3.5" />
              </>
            )}
          </Button>
        </div>
      </aside>

      <div className="fixed inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-lg border border-border bg-card/95 p-2.5 shadow-[var(--pf-shadow-lg)] backdrop-blur-md md:hidden">
        <div className="min-w-0 flex-1 pl-1">
          <span className="block truncate text-[12px] text-muted-foreground">
            {model
              ? isSwap
                ? `${model.name} · subject swap${swapSourceDurationSec ? ` · ${Math.round(swapSourceDurationSec)}s source` : ""}`
                : `${model.name} · ${aspectRatio}`
              : "Choose a model"}
          </span>
          <strong className="mt-0.5 block text-[12px] text-foreground">
            {model ? formatCost(estimatedCost) : "—"}
          </strong>
          {missing.length > 0 && (
            <span className="mt-0.5 block truncate text-[12px] text-[var(--pf-lamp-amber)]">
              {isSwap && !swapReady
                ? model?.id === "pixverse-swap"
                  ? "Add a source video and a swap reference"
                  : "Add a source video"
                : `Add ${missing.join(" and ")} to continue`}
            </span>
          )}
        </div>
        <Button
          type="submit"
          aria-label="Generate Now on mobile"
          disabled={!canSubmit}
          className="h-10 rounded-lg bg-[var(--pf-orange)] px-4 text-[12px] font-bold text-white hover:brightness-[0.93]"
        >
          {isSubmitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ArrowRight className="size-3.5" />
          )}
          {isSubmitting ? "Generating…" : isSwap ? "Swap subject" : `Generate ${isVideo ? "video" : "image"}`}
        </Button>
      </div>
    </form>
  );
}
