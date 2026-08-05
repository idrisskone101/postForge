"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Users,
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
  advancedOpen: boolean;
  submitError?: string | null;
  notice?: string | null;
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
      label: "The original avatar image is ready while identity references prepare.",
      tone: "working",
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

    setSelectedModel(nextModel.id);
    setAspectRatio(nextModel.defaults.aspectRatio);
    setSubmitError(null);
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
      if (avatarId) {
        setAvatarId(null);
        setIdentityPack(null);
        setIdentityError(null);
        setNotice("Avatar identity was cleared because video models do not accept it yet.");
      }
    }
  };

  const handleAvatarSelect = (id: string) => {
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
    if (!nextAvatarId) {
      setIdentityPack(null);
      return;
    }

    const selectedSupportsIdentity =
      selectedDefinition?.type === "image" &&
      selectedDefinition.capabilities.referenceImages === true;
    if (selectedSupportsIdentity) return;

    const fallback = models.find(
      (model) =>
        model.type === "image" && model.capabilities.referenceImages === true
    );
    if (fallback) {
      handleModelSelect(fallback.id);
      setAvatarId(nextAvatarId);
      setNotice(`${fallback.name} selected because it supports avatar identity.`);
    } else {
      setAvatarId(null);
      setIdentityError("No configured image model supports avatar identity.");
    }
  };

  const handleCollectionAssetChange = (assetIds: string[]) => {
    setSubmitError(null);
    setNotice(null);
    if (avatarId) return;
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
    Boolean(selectedDefinition) && prompt.trim().length > 0 && !isSubmitting;

  const isSwapSelected = selectedDefinition?.capabilities.subjectSwap === true;
  const swapCanSubmit =
    !isSwapSelected ||
    (Boolean(swapVideo) &&
      (selectedDefinition?.id !== "pixverse-swap" || Boolean(swapReference)));

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
          enableAudio: enableAudio && selectedDefinition.id === "veo3",
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
  const avatarSection = selectedDefinition?.type !== "video" ? (
    <div className="rounded-[13px] border border-[#DADBD2] bg-white p-4 shadow-[var(--pf-shadow-xs)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-[7px] bg-[#F0F1EB] text-[#777873]">
              <Users className="size-3.5" />
            </span>
            <h2 className="text-[13px] font-semibold text-[#30312E]">
              Character identity
            </h2>
            <span className="rounded-full bg-[#F1F2EC] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#777873]">
              Optional
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[10px] leading-4 text-[#858681]">
            Reuse a saved identity. A compatible image model is selected automatically.
          </p>
        </div>
        {avatarId && (
          <button
            type="button"
            onClick={() => handleAvatarSelect("")}
            className="text-[10px] font-semibold text-[#378EFF] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {avatarId && (
        <div
          role={identityStatus.tone === "failed" ? "alert" : "status"}
          className={cn(
            "mb-3 flex min-w-0 items-start gap-2 rounded-lg px-3 py-2 text-[10px] leading-4",
            identityStatus.tone === "ready" && "bg-[#EAF8ED] text-[#238A40]",
            identityStatus.tone === "working" && "bg-[#EEF5FF] text-[#2A71C7]",
            identityStatus.tone === "failed" && "bg-[#FEF0EF] text-[#C53A32]"
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
          className="mb-3 flex min-w-0 items-start gap-2 rounded-lg bg-[#FEF0EF] px-3 py-2 text-[10px] leading-4 text-[#C53A32]"
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
    <div className="rounded-[13px] border border-[#DADBD2] bg-white p-4 shadow-[var(--pf-shadow-xs)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-[7px] bg-[#FFF0EC] text-[#FF4A20]">
              <ImageIcon className="size-3.5" />
            </span>
            <h2 className="text-[13px] font-semibold text-[#30312E]">
              Visual collection
            </h2>
            <span className="rounded-full bg-[#F1F2EC] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#777873]">
              Optional
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[10px] leading-4 text-[#858681]">
            Reuse server-owned product, location, or style images from Collections.
          </p>
        </div>
        {collectionAssetIds.length > 0 && (
          <button
            type="button"
            onClick={() => setCollectionAssetIds([])}
            className="text-[10px] font-semibold text-[#378EFF] hover:underline"
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
      <div className="animate-content-enter rounded-[13px] border border-[#DADBD2] bg-white p-4 shadow-[var(--pf-shadow-xs)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-[7px] bg-[#EEF5FF] text-[#378EFF]">
                <RefreshCw className="size-3.5" />
              </span>
              <h2 className="text-[13px] font-semibold text-[#30312E]">
                Character continuity
              </h2>
              <span className="rounded-full bg-[#F1F2EC] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#777873]">
                Optional
              </span>
            </div>
            <p className="mt-2 max-w-lg text-[10px] leading-4 text-[#858681]">
              Seed the next video with a previous output so the same character
              carries across your series.
            </p>
          </div>
          {videoReferenceFileId && !videoSeedMissing && (
            <button
              type="button"
              onClick={() => handleVideoReferenceChange(null)}
              className="text-[10px] font-semibold text-[#378EFF] hover:underline"
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
    <div className="rounded-[13px] border border-[#DADBD2] bg-white p-4 shadow-[var(--pf-shadow-xs)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-[7px] bg-[#FFF0EC] text-[#FF4A20]">
              <ImageIcon className="size-3.5" />
            </span>
            <h2 className="text-[13px] font-semibold text-[#30312E]">
              Subject swap
            </h2>
            <span className="rounded-full bg-[#F1F2EC] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#777873]">
              {selectedDefinition?.id === "pixverse-swap" ? "Reference required" : "Prompt-driven"}
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[10px] leading-4 text-[#858681]">
            {selectedDefinition?.id === "pixverse-swap"
              ? "Upload a video and a reference image. The referenced subject replaces the matching subject while the rest of the video stays the same."
              : "Upload a video and describe the swap in your prompt. Gemini Omni Edit keeps everything else in the frame consistent."}
          </p>
        </div>
      </div>
      <SwapInputSection
        value={{ video: swapVideo, reference: swapReference, swapMode }}
        onChange={({ video, reference, swapMode: nextSwapMode }) => {
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
      advancedOpen={advancedOpen}
      submitError={submitError}
      notice={notice}
      onModelSelect={handleModelSelect}
      onPromptChange={setPrompt}
      onAspectRatioChange={setAspectRatio}
      onNumImagesChange={setNumImages}
      onDurationChange={setDuration}
      onNegativePromptChange={setNegativePrompt}
      onEnableWebSearchChange={setEnableWebSearch}
      onEnableAudioChange={setEnableAudio}
      onAdvancedOpenChange={setAdvancedOpen}
      onSubmit={handleSubmit}
      onAppendToPrompt={(text) =>
        setPrompt((current) => (current ? `${current}, ${text}` : text))
      }
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
  advancedOpen,
  submitError = null,
  notice = null,
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
  const canSubmit =
    Boolean(model) && prompt.trim().length > 0 && !isSubmitting && swapReady;
  const missing: string[] = [];
  if (!model) missing.push("a model");
  if (!prompt.trim()) missing.push("a prompt");
  const activeType = model?.type ?? "image";
  const recommendedModelId =
    models.find((item) => item.type === activeType)?.id ?? undefined;
  const estimatedCost = model
    ? calculateEstimatedCost(model.id, {
        numImages: isImage ? numImages : undefined,
        durationSec: isSwap ? swapSourceDurationSec : isVideo ? duration : undefined,
        enableAudio: enableAudio && model.id === "veo3",
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
      data-magicpath-frame="generate-studio-435054350382039040"
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
        <section className="rounded-[13px] border border-[#DADBD2] bg-white p-4 shadow-[var(--pf-shadow-xs)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-[7px] bg-[#F0F1EB] text-[10px] font-bold text-[#777873]">
                01
              </span>
              <h2 className="text-[13px] font-semibold text-[#30312E]">
                Describe your {isVideo ? "video" : "image"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                onAppendToPrompt(
                  "natural composition, clear focal point, production-ready detail"
                )
              }
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#378EFF] hover:underline"
            >
              <Sparkles className="size-3" /> Improve prompt
            </button>
          </div>

          <Textarea
            aria-label="Creative prompt"
            placeholder="Describe the scene, subject, action, lighting, and camera framing..."
            value={prompt}
            maxLength={1500}
            onChange={(event) => onPromptChange(event.target.value.slice(0, 1500))}
            className="min-h-[118px] resize-none rounded-[9px] border-[#D7D8D0] bg-[#FCFCFA] px-3 py-3 text-[12px] leading-5 text-[#30312E] shadow-none focus-visible:border-[#FF4A20] focus-visible:ring-[#FF4A20]/10"
          />
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#969792]">
            <span>{prompt.length}/1,500</span>
            <span>Be specific about the opening frame</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {CREATIVE_SPARKS.map((spark) => (
              <button
                key={spark}
                type="button"
                onClick={() => onAppendToPrompt(spark)}
                className="rounded-md border border-[#DEDFD8] bg-[#F8F9F5] px-2.5 py-1.5 text-[10px] font-medium text-[#686965] transition-colors hover:border-[#BFC0B9] hover:text-[#30312E]"
              >
                {spark}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[13px] border border-[#DADBD2] bg-white p-4 shadow-[var(--pf-shadow-xs)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-[7px] bg-[#F0F1EB] text-[10px] font-bold text-[#777873]">
                02
              </span>
              <h2 className="text-[13px] font-semibold text-[#30312E]">
                Choose a model
              </h2>
            </div>
            <span className="rounded-full bg-[#E9F7EC] px-2 py-1 text-[11px] font-bold text-[#238A40]">
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
            className="animate-content-enter rounded-[13px] border border-[#DADBD2] bg-white p-4 shadow-[var(--pf-shadow-xs)]"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-[7px] bg-[#F0F1EB] text-[10px] font-bold text-[#777873]">
                03
              </span>
              <h2 className="text-[13px] font-semibold text-[#30312E]">
                Format and output
              </h2>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
                <label className="text-[10px] text-[#72736F]">Aspect Ratio</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableRatios.map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      aria-pressed={aspectRatio === ratio}
                      onClick={() => onAspectRatioChange(ratio)}
                      className={cn(
                        "flex h-8 min-w-[64px] items-center justify-center gap-1.5 rounded-lg border px-2 text-[10px] font-medium transition-colors",
                        aspectRatio === ratio
                          ? "border-[#232323] bg-[#F3F4EF] text-[#232323]"
                          : "border-[#DCDED6] bg-white text-[#6F706C] hover:border-[#BFC0B9]"
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
                  <label className="text-[10px] text-[#72736F]">Outputs</label>
                  <div className="flex gap-1.5">
                    {outputOptions.map((count) => (
                      <button
                        key={count}
                        type="button"
                        aria-pressed={numImages === count}
                        onClick={() => onNumImagesChange(count)}
                        className={cn(
                          "grid size-8 place-items-center rounded-lg border text-[10px] font-semibold transition-colors",
                          numImages === count
                            ? "border-[#232323] bg-[#F3F4EF] text-[#232323]"
                            : "border-[#DCDED6] bg-white text-[#6F706C] hover:border-[#BFC0B9]"
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
                  <label className="text-[10px] text-[#72736F]">Duration</label>
                  <div className="flex flex-wrap gap-1.5">
                    {durationOptions.map((seconds) => (
                      <button
                        key={seconds}
                        type="button"
                        aria-pressed={duration === seconds}
                        onClick={() => onDurationChange(seconds)}
                        className={cn(
                          "flex h-8 min-w-12 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition-colors",
                          duration === seconds
                            ? "border-[#232323] bg-[#F3F4EF] text-[#232323]"
                            : "border-[#DCDED6] bg-white text-[#6F706C] hover:border-[#BFC0B9]"
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
                    className="mt-4 flex w-full items-center justify-between border-t border-[#ECECE7] pt-3 text-[10px] font-semibold text-[#666762] hover:text-[#30312E]"
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
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#777873]">
                      Negative prompt
                    </span>
                    <Textarea
                      value={negativePrompt}
                      onChange={(event) => onNegativePromptChange(event.target.value)}
                      placeholder="Logos, distorted hands, extra fingers..."
                      className="min-h-20 resize-none rounded-lg border-[#D7D8D0] bg-[#FCFCFA] text-[11px] shadow-none"
                    />
                  </label>
                )}

                {isImage && model.capabilities.webSearch && (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E1E2DC] bg-[#FAFBF7] px-3 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Search className="size-3.5 text-[#777873]" />
                      <span>
                        <strong className="block text-[10px] font-semibold text-[#363733]">
                          Web grounding
                        </strong>
                        <small className="mt-0.5 block text-[11px] text-[#92938E]">
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

                {isVideo && model.id === "veo3" && (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E1E2DC] bg-[#FAFBF7] px-3 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Volume2 className="size-3.5 text-[#777873]" />
                      <span>
                        <strong className="block text-[10px] font-semibold text-[#363733]">
                          Native audio
                        </strong>
                        <small className="mt-0.5 block text-[11px] text-[#92938E]">
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

      <aside className="min-w-0 overflow-hidden rounded-[14px] border border-[#DADBD2] bg-white shadow-[var(--pf-shadow-sm)] xl:sticky xl:top-4">
        <div className="flex h-12 items-center justify-between border-b border-[#E1E2DC] px-4">
          <span className="text-[11px] font-semibold text-[#3F403C]">Preview</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F2EC] px-2 py-1 text-[11px] font-semibold text-[#777873]">
            {isVideo ? <Video className="size-3" /> : <ImageIcon className="size-3" />}
            {RATIO_LABELS[aspectRatio] ?? aspectRatio}
          </span>
        </div>

        <div className="grid min-h-[470px] place-items-center bg-[#EFEFE9] bg-[linear-gradient(#E7E8E1_1px,transparent_1px),linear-gradient(90deg,#E7E8E1_1px,transparent_1px)] bg-[size:24px_24px] p-5 dark:bg-[linear-gradient(#343531_1px,transparent_1px),linear-gradient(90deg,#343531_1px,transparent_1px)] sm:min-h-[560px] sm:p-8 xl:min-h-[590px]">
          <div
            aria-label={`${aspectRatio} output preview`}
            className={cn(
              "relative grid max-h-[520px] min-h-[220px] place-items-center overflow-hidden rounded-[13px] border-[6px] border-white bg-[#F8F0E8] shadow-[var(--pf-shadow-lg)]",
              previewWidthClass
            )}
            style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,rgba(255,246,208,0.95),transparent_25%),linear-gradient(155deg,#F6D9AD_0%,#E6B58D_48%,#B97862_48%,#765044_70%,#3F312C_100%)] opacity-45" />
            <div className="relative mx-6 min-w-0 max-w-full rounded-xl border border-white/70 bg-card/90 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
              <Sparkles className="mx-auto size-5 text-[#FF4A20]" />
              <strong className="mt-2 block text-[11px] font-semibold text-[#30312E]">
                {model ? "Ready to generate" : "Choose a model"}
              </strong>
              <span className="mt-1 block min-w-0 max-w-52 break-words text-[10px] leading-4 text-[#777873] [overflow-wrap:anywhere]">
                {prompt.trim()
                  ? prompt.trim().slice(0, 112)
                  : "Your prompt and output settings will appear here before submission."}
              </span>
            </div>
            {model && (
              <span className="absolute bottom-3 left-3 rounded-full bg-[#232323] px-2.5 py-1 text-[11px] font-semibold text-white">
                {model.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex min-h-[72px] items-center gap-2 overflow-x-auto border-t border-[#E1E2DC] px-3 py-2.5">
          {Array.from({ length: Math.max(1, variationCount) }, (_, index) => (
            <div
              key={index}
              className={cn(
                "relative grid h-12 w-10 shrink-0 place-items-center rounded-[7px] border bg-[#F3F4EF] text-[11px] font-semibold text-[#8A8B86]",
                index === 0 ? "border-[#FF4A20]" : "border-[#DADBD2]"
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </div>
          ))}
          <span className="ml-1 text-[10px] leading-4 text-[#858681]">
            {variationCount} output{variationCount === 1 ? "" : "s"} will be added to
            the editor.
          </span>
        </div>

        {(submitError || notice) && (
          <div
            role={submitError ? "alert" : "status"}
            className={cn(
              "mx-3 mt-3 flex min-w-0 items-start gap-2 rounded-lg px-3 py-2.5 text-[10px] leading-4",
              !submitError && "animate-success-pulse",
              submitError
                ? "bg-[#FEF0EF] text-[#C53A32]"
                : "bg-[#EEF5FF] text-[#2A71C7]"
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

        <div className="sticky bottom-0 hidden gap-3 border-t border-[#E1E2DC] bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <span className="block truncate text-[10px] text-[#858681]">
              {model
                ? isSwap
                  ? `${model.name} · subject swap · ${swapSourceDurationSec ? `${Math.round(swapSourceDurationSec)}s source` : "source video"}`
                  : `${model.name} · ${aspectRatio} · ${isImage ? `${numImages} output${numImages === 1 ? "" : "s"}` : `${duration}s video`}${avatarName ? ` · ${avatarName}` : ""}`
                : "Select a model and describe your asset"}
            </span>
            <strong className="mt-1 block text-[11px] font-semibold text-[#30312E]">
              Cost Estimate · {model ? formatCost(estimatedCost) : "—"}
            </strong>
            {missing.length > 0 && (
              <span className="mt-0.5 block text-[10px] text-[#B08A00]">
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
            className="h-11 min-w-[174px] rounded-[10px] bg-[#FF4A20] px-5 text-[11px] font-bold text-white shadow-[0_2px_0_rgba(130,25,0,0.14)] hover:bg-[#E9421C]"
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

      <div className="fixed inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-[12px] border border-border bg-card/95 p-2.5 shadow-[0_12px_36px_rgba(35,35,35,0.18)] backdrop-blur-md md:hidden">
        <div className="min-w-0 flex-1 pl-1">
          <span className="block truncate text-[11px] text-[#858681]">
            {model
              ? isSwap
                ? `${model.name} · subject swap${swapSourceDurationSec ? ` · ${Math.round(swapSourceDurationSec)}s source` : ""}`
                : `${model.name} · ${aspectRatio}`
              : "Choose a model"}
          </span>
          <strong className="mt-0.5 block text-[10px] text-[#30312E]">
            {model ? formatCost(estimatedCost) : "—"}
          </strong>
          {missing.length > 0 && (
            <span className="mt-0.5 block truncate text-[10px] text-[#B08A00]">
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
          className="h-10 rounded-[9px] bg-[#FF4A20] px-4 text-[10px] font-bold text-white hover:bg-[#E9421C]"
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
