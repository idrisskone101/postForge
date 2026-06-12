"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TikTokInput, type TikTokVideoInfo } from "@/components/tiktok-input";
import { VideoTrimmer } from "@/components/video-trimmer";
import { AvatarPicker } from "@/components/avatar-picker";
import { MediaPreviewFrame } from "@/components/media-preview";
import { WorkspaceHeaderAccessory } from "@/components/workspace-shell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { calculateEstimatedCost, BRIA_ERASER_COST_PER_SEC } from "@/lib/ai/models";
import { apiGet, apiPost } from "@/lib/api/client";
import {
  Loader2,
  Check,
  ArrowLeft,
  Sparkles,
  PenLine,
  Clock3,
  Video,
  Users,
  Layers,
  Zap,
  Info,
  Plus,
} from "lucide-react";

const FALLBACK_REFERENCE_THUMBNAILS = [
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=200",
] as const;

type Phase = "input" | "reviewing" | "submitted";

interface RefJobStatus {
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  estimatedCost: number;
  outputs: { id: string }[];
}

interface RefImageEntry {
  jobId: string;
  fileId: string | null;
  prompt: string;
  cost: number;
  status: "generating" | "completed" | "failed";
  error?: string;
}

interface SavedReference {
  id: string;
  avatarId: string;
  prompt: string;
  createdAt: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  previewUrl: string;
  source: {
    id: string;
    label: string;
    originalUrl: string;
  } | null;
}

interface AvatarIdentityPack {
  id: string;
  avatarId: string;
  status: "queued" | "processing" | "completed" | "failed";
  imageModel: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  images: {
    id: string;
    role: string;
    previewUrl: string;
  }[];
}

type CloneProductionStepStatus = "ready" | "required" | "working" | "optional";

interface ClonePrimaryActionState {
  sourceReady: boolean;
  identityReady: boolean;
  referenceReady: boolean;
  canGenerate: boolean;
  usesSavedReference: boolean;
}

export interface ClonePrimaryAction {
  label: string;
  detail: string;
}

interface CloneProductionStatePanelProps {
  sourceReady: boolean;
  trimReady: boolean;
  identityReady: boolean;
  referenceReady: boolean;
  canGenerate: boolean;
  nextAction: ClonePrimaryAction;
  sourceDetail?: string;
  trimDetail?: string;
  identityDetail?: string;
  referenceDetail?: string;
  readinessDetail?: string;
}

export function getClonePrimaryAction({
  sourceReady,
  identityReady,
  referenceReady,
  canGenerate,
  usesSavedReference,
}: ClonePrimaryActionState): ClonePrimaryAction {
  if (!sourceReady) {
    return {
      label: "Add source to continue",
      detail: "Paste a TikTok URL or choose a source from Inspiration.",
    };
  }

  if (!identityReady) {
    return {
      label: "Select identity",
      detail: "Choose the avatar that should appear in the clone.",
    };
  }

  if (canGenerate || referenceReady) {
    return {
      label: "Generate clone",
      detail: usesSavedReference
        ? "Use the selected saved reference to start video generation."
        : "Approve the completed reference and start video generation.",
    };
  }

  return {
    label: "Generate reference",
    detail: "Create or select the visual reference before final generation.",
  };
}

function getStepStatus(isReady: boolean, readyStatus: CloneProductionStepStatus = "ready") {
  return isReady ? readyStatus : "required";
}

function ProductionStateRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: CloneProductionStepStatus;
  detail: string;
}) {
  const statusClassName = {
    ready: "border-accent-green/30 bg-accent-green/10 text-accent-green",
    required: "border-accent-coral/30 bg-accent-coral/10 text-accent-coral",
    working: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue",
    optional: "border-border bg-muted/45 text-muted-foreground",
  }[status];

  const statusLabel = {
    ready: "Ready",
    required: "Required",
    working: "Working",
    optional: "Optional",
  }[status];

  return (
    <li className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            statusClassName
          )}
        >
          {statusLabel}
        </span>
      </div>
    </li>
  );
}

export function CloneProductionStatePanel({
  sourceReady,
  trimReady,
  identityReady,
  referenceReady,
  canGenerate,
  nextAction,
  sourceDetail = sourceReady ? "Source selected and available for preview." : "No TikTok source selected yet.",
  trimDetail = trimReady ? "Trim/preparation state is set." : "Choose a source before trimming.",
  identityDetail = identityReady ? "Identity selected for this clone." : "Select an avatar identity.",
  referenceDetail = referenceReady ? "Reference is ready for generation." : "Generate or choose a reference.",
  readinessDetail = canGenerate ? "All required production state is ready." : "Complete the required state to generate.",
}: CloneProductionStatePanelProps) {
  return (
    <aside
      data-clone-production-state="true"
      className="h-fit rounded-xl border border-border bg-card p-4 shadow-sm xl:sticky xl:top-24"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Production State
          </p>
          <h2 className="mt-1 text-lg font-semibold">Clone readiness</h2>
        </div>
        <Badge
          variant="outline"
          className={cn(
            canGenerate
              ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
              : "bg-muted/45 text-muted-foreground"
          )}
        >
          {canGenerate ? "Ready" : "In progress"}
        </Badge>
      </div>

      <ol className="mt-4 space-y-2">
        <ProductionStateRow
          label="Source"
          status={getStepStatus(sourceReady)}
          detail={sourceDetail}
        />
        <ProductionStateRow
          label="Trim"
          status={sourceReady ? (trimReady ? "ready" : "optional") : "required"}
          detail={trimDetail}
        />
        <ProductionStateRow
          label="Identity"
          status={getStepStatus(identityReady)}
          detail={identityDetail}
        />
        <ProductionStateRow
          label="Reference"
          status={getStepStatus(referenceReady)}
          detail={referenceDetail}
        />
        <ProductionStateRow
          label="Generate readiness"
          status={canGenerate ? "ready" : "working"}
          detail={readinessDetail}
        />
      </ol>

      <div className="mt-4 rounded-lg border border-border bg-muted/25 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Next action
        </p>
        <p className="mt-1 text-sm font-semibold">{nextAction.label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {nextAction.detail}
        </p>
      </div>
    </aside>
  );
}

export function UGCCloneForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceIdParam = searchParams.get("sourceId");

  // Phase
  const [phase, setPhase] = useState<Phase>("input");

  // Reference image iterations
  const [refImages, setRefImages] = useState<RefImageEntry[]>([]);
  const [selectedRefIndex, setSelectedRefIndex] = useState<number>(0);
  const [refPrompt, setRefPrompt] = useState("");

  // Step 1: TikTok
  const [videoInfo, setVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [originalVideoInfo, setOriginalVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [sourcesRefreshKey, setSourcesRefreshKey] = useState(0);

  // Step 2: Avatar
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [identityPack, setIdentityPack] = useState<AvatarIdentityPack | null>(null);
  const [, setIsStartingIdentityPack] = useState(false);
  const [, setIdentityPackError] = useState<string | null>(null);
  const [savedReferences, setSavedReferences] = useState<SavedReference[]>([]);
  const [, setIsLoadingSavedReferences] = useState(false);
  const [, setSavedReferencesError] = useState<string | null>(null);
  const [selectedSavedReferenceId, setSelectedSavedReferenceId] = useState<string | null>(null);
  const [avatarToolsOpen, setAvatarToolsOpen] = useState(false);

  // Step 3: Settings
  const [prompt] = useState("");
  const [keepOriginalSound] = useState(true);
  const [removeTextOverlays] = useState(false);
  const [selectedModel] = useState<"kling-3.0-motion" | "kling-3.0-pro-motion" | "kling-2.6-motion">("kling-3.0-motion");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(sourceIdParam);

  const durationSec = videoInfo?.durationSec ?? 5;
  const videoCost = calculateEstimatedCost(selectedModel, { durationSec });
  const imageCost = calculateEstimatedCost("nano-banana-2", { numImages: 1 });
  const textErasureCost = removeTextOverlays ? BRIA_ERASER_COST_PER_SEC * durationSec : 0;

  const canSubmit = !!videoInfo?.id && !!avatarId && !isSubmitting;

  // Poll for any "generating" ref images
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refImagesRef = useRef(refImages);
  useEffect(() => { refImagesRef.current = refImages; });

  const fetchSavedReferences = useCallback(async (nextAvatarId: string) => {
    setIsLoadingSavedReferences(true);
    setSavedReferencesError(null);

    try {
      const references = await apiGet<SavedReference[]>(
        `/api/ugc-clone/references?avatarId=${encodeURIComponent(nextAvatarId)}`
      );
      setSavedReferences(references);
      setSelectedSavedReferenceId((current) =>
        current && references.some((reference) => reference.id === current)
          ? current
          : null
      );
    } catch (err) {
      console.error("Failed to load saved references:", err);
      setSavedReferences([]);
      setSelectedSavedReferenceId(null);
      setSavedReferencesError(
        err instanceof Error ? err.message : "Failed to load saved references"
      );
    } finally {
      setIsLoadingSavedReferences(false);
    }
  }, []);

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

  useEffect(() => {
    if (sourceIdParam) {
      setPendingSourceId(sourceIdParam);
    }
  }, [sourceIdParam]);

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
    if (!avatarId) {
      setIdentityPack(null);
      setIdentityPackError(null);
      setIsStartingIdentityPack(false);
      setSavedReferences([]);
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
    if (!avatarId || !identityPack || !["queued", "processing"].includes(identityPack.status)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void fetchIdentityPack(avatarId);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [avatarId, fetchIdentityPack, identityPack]);

  useEffect(() => {
    setAvatarToolsOpen(false);
  }, [avatarId]);

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
  const recentSavedReferences = savedReferences.slice(0, 4);
  const visibleReferenceThumbnails = recentSavedReferences.slice(0, 2);

  const handleVideoDownloaded = (info: TikTokVideoInfo | null) => {
    setVideoInfo(info);
    setOriginalVideoInfo(info);
    setShowTrimmer(false);
  };

  const handlePreselectedSourceResolved = () => {
    if (!pendingSourceId) return;

    setPendingSourceId(null);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("sourceId");
    const nextQuery = nextParams.toString();

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
      const result = await apiPost<{ id: string }>("/api/ugc-clone/reference-image", {
        tiktokVideoPath: videoInfo.localPath,
        tiktokSourceId: videoInfo.id,
        avatarId,
        prompt: promptToUse || undefined,
      });

      const newEntry: RefImageEntry = {
        jobId: result.id,
        fileId: null,
        prompt: promptToUse,
        cost: imageCost,
        status: "generating",
      };

      setRefImages((prev) => [...prev, newEntry]);
      setSelectedRefIndex(refImages.length); // select the new one (will be at end)
      setPhase("reviewing");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate reference image.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateRefImage = () => {
    setRefPrompt(prompt); // initialize ref prompt from scene direction
    submitRefImageGeneration(prompt);
  };

  const handleRegenerateRefImage = () => {
    submitRefImageGeneration(refPrompt);
  };

  const handleApproveAndGenerate = async () => {
    if (!videoInfo?.id || !avatarId || !selectedRefFileId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
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
    setSelectedSavedReferenceId((current) =>
      current === referenceId ? null : referenceId
    );
  };

  const modelName = selectedModel === "kling-3.0-motion"
    ? "Kling 3.0"
    : selectedModel === "kling-3.0-pro-motion"
      ? "Kling 3.0 Pro"
      : "Kling 2.6";
  const sourceReady = !!videoInfo?.id;
  const avatarReady = !!avatarId;
  const trimReady = !!videoInfo;
  const referenceReady = !!selectedSavedReference || !!selectedRefFileId;
  const canGenerateClone = !!videoInfo?.id && !!avatarId && referenceReady && !isSubmitting;
  const nextAction = getClonePrimaryAction({
    sourceReady,
    identityReady: avatarReady,
    referenceReady,
    canGenerate: canGenerateClone,
    usesSavedReference: !!selectedSavedReference,
  });
  const sourcePreviewSrc = videoInfo
    ? `/api/ugc-clone/preview?path=${encodeURIComponent(videoInfo.localPath)}`
    : null;
  const sourceDetail = videoInfo
    ? videoInfo.label || "Selected TikTok source"
    : "Paste a TikTok URL or use a source from Inspiration.";
  const trimDetail = videoInfo
    ? originalVideoInfo && videoInfo.localPath !== originalVideoInfo.localPath
      ? `${Math.round(durationSec)}s trimmed portrait source is ready.`
      : "Full source is ready; trim remains editable."
    : "Choose a source before setting trim.";
  const identityDetail = avatarReady
    ? identityPack?.status === "completed"
      ? `${identityPack.images.length} identity references ready.`
      : "Avatar selected; identity references can continue preparing."
    : "Select an avatar identity for this production.";
  const referenceDetail = selectedSavedReference
    ? "Saved reference selected."
    : selectedRefFileId
      ? "Generated reference approved."
      : "Generate a new reference or choose a saved one.";
  const readinessDetail = canGenerateClone
    ? "Source, identity, and reference are ready."
    : "Complete Source, Identity, and Reference before generating.";
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
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                  <p className="mt-1 font-mono text-[10px]">
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
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-center">
                      <p className="text-sm font-medium text-destructive">Generation failed</p>
                      {selectedRef.error && (
                        <p className="mt-1 text-xs text-destructive/80">{selectedRef.error}</p>
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
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                          <span className="text-[9px] text-destructive">Failed</span>
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white drop-shadow-md">
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Reference Image Prompt
                  </p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
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
                    {formatCost((totalRefCost || imageCost) + videoCost + textErasureCost)}
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
                <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Prompt used for #{selectedRefIndex + 1}
                </p>
                <p className="text-xs text-foreground/80 italic leading-relaxed line-clamp-3">
                  {selectedRef.prompt || "(no additional prompt)"}
                </p>
              </div>
            )}

            {submitError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
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
                className="gap-2 bg-accent-coral font-semibold text-white hover:bg-[#ff6540]"
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

  // ─── Input Phase ────────────────────────────────────────────────────
  return (
    <>
      <WorkspaceHeaderAccessory>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/20 px-3 py-1.5">
            <div className="size-2 rounded-full bg-accent-green" />
            <span className="text-xs font-bold uppercase tracking-wider text-accent-green">
              Ready to Generate
            </span>
          </div>
        </div>
      </WorkspaceHeaderAccessory>

      <div
        data-clone-production-state="true"
        className="grid grid-cols-1 gap-8 lg:grid-cols-12"
      >
        <div className="space-y-8 lg:col-span-8">
          <section className="rounded-2xl border border-white/10 bg-[oklch(0.205_0_0)] p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent-blue/10 text-accent-blue">
                  <Video className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">
                    01. Source &amp; Trim
                  </h2>
                  <p className="text-xs text-white/40">
                    Standardized Media Preview • Tech Showcase
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => sourceReady && setShowTrimmer((value) => !value)}
                className="text-xs font-semibold text-accent-blue transition-colors hover:text-accent-blue/80"
              >
                {sourceReady ? (showTrimmer ? "Close Trim" : "Re-trim") : "Replace Source"}
              </button>
            </div>

            {sourceReady && videoInfo && sourcePreviewSrc ? (
              showTrimmer && originalVideoInfo ? (
                <VideoTrimmer
                  key={originalVideoInfo.localPath}
                  videoPath={originalVideoInfo.localPath}
                  durationSec={originalVideoInfo.durationSec}
                  width={originalVideoInfo.width}
                  height={originalVideoInfo.height}
                  sourceId={videoInfo.id}
                  onTrimmed={handleTrimmed}
                  onCancel={handleCancelTrim}
                />
              ) : (
                <MediaPreviewFrame
                  type="video"
                  src={sourcePreviewSrc}
                  width={videoInfo.width}
                  height={videoInfo.height}
                  alt={videoInfo.label || "Selected source preview"}
                  variant="work"
                  showMetadata
                  actions={
                    <button
                      type="button"
                      onClick={() => setShowTrimmer(true)}
                      className="text-[10px] font-bold uppercase tracking-wider text-accent-blue"
                    >
                      Re-trim
                    </button>
                  }
                />
              )
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black p-4">
                <TikTokInput
                  onDownloaded={handleVideoDownloaded}
                  videoInfo={videoInfo}
                  refreshKey={sourcesRefreshKey}
                  preselectedSourceId={pendingSourceId}
                  onPreselectedSourceResolved={handlePreselectedSourceResolved}
                />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[oklch(0.205_0_0)] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent-green/10 text-accent-green">
                <Users className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">
                  02. Identity Mapping
                </h2>
                <p className="text-xs text-white/40">Applying visual DNA to the clone</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setAvatarToolsOpen(true)}
                className={cn(
                  "group flex flex-col items-center gap-3 rounded-xl border p-4 transition-all",
                  "border-accent-green bg-accent-green/10 ring-1 ring-accent-green/40"
                )}
              >
                <div
                  className="size-16 overflow-hidden rounded-full border-2 border-accent-green"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Tech" alt="" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-white">
                    Tech Explorer
                  </div>
                  <div className="text-[10px] font-semibold uppercase text-accent-green">
                    Active
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAvatarToolsOpen(true)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/20"
              >
                <div className="size-16 overflow-hidden rounded-full opacity-50 grayscale transition-all group-hover:opacity-100 group-hover:grayscale-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Minimalist" alt="" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-white/60">Minimalist</div>
                  <div className="text-[10px] uppercase text-white/30">Select</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAvatarToolsOpen((value) => !value)}
                className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-transparent p-4 transition-all hover:border-white/30"
              >
                <Plus className="size-5 text-white/40" />
                <span className="text-[10px] font-bold uppercase text-white/40">New Identity</span>
              </button>
            </div>

            {avatarToolsOpen && (
              <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[oklch(0.205_0_0)] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent-coral/10 text-accent-coral">
                <Layers className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">
                  03. Reference Review
                </h2>
                <p className="text-xs text-white/40">Visual direction anchor</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black p-3">
                {selectedSavedReference ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedSavedReference.previewUrl}
                      alt="Selected reference"
                      className="aspect-square w-full rounded-lg object-contain"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-medium">Aesthetic Reference</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSavedReferenceId(null)}
                        className="text-[10px] font-bold text-accent-coral"
                      >
                        Change
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex aspect-square flex-col items-center justify-center rounded-lg bg-zinc-950 text-center">
                    <Sparkles className="size-6 text-white/20" />
                    <span className="mt-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                      Aesthetic Reference
                    </span>
                    <span className="mt-1 text-[10px] text-white/20">
                      Studio lighting composite (1:1)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={handleGenerateRefImage}
                  disabled={!canSubmit || isSubmitting}
                  className="flex min-h-[168px] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-6 animate-spin text-white/30" />
                  ) : (
                    <Sparkles className="size-6 text-white/20" />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    Generate Variant
                  </span>
                  <p className="max-w-[140px] text-[10px] text-white/20">
                    Create a new reference still from prompt
                  </p>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  {visibleReferenceThumbnails.length > 0
                    ? visibleReferenceThumbnails.map((reference) => (
                      <button
                        key={reference.id}
                        type="button"
                        onClick={() => handleSelectSavedReference(reference.id)}
                        className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black transition-colors hover:border-accent-coral"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={reference.previewUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      </button>
                    ))
                    : FALLBACK_REFERENCE_THUMBNAILS.map((src) => (
                      <div
                        key={src}
                        className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black transition-colors hover:border-accent-coral"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="size-full object-cover" />
                      </div>
                    ))}
                  <button
                    type="button"
                    className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-white/10 transition-colors hover:bg-white/5"
                  >
                    <Plus className="size-4 text-white/20" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <section className="rounded-2xl border border-white/10 bg-[oklch(0.205_0_0)] p-5">
            <h2 className="mb-4 px-1 text-xs font-bold uppercase tracking-widest text-white/40">
              Generation Settings
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-tighter text-white/60">
                  Variation Count
                </label>
                <div className="flex gap-2">
                  {["x1", "x4", "x8"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={cn(
                        "h-9 flex-1 rounded-lg border text-xs font-bold transition-colors hover:bg-white/10",
                        label === "x4"
                          ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                          : "border-white/10 bg-white/5"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-tighter text-white/60">
                  Style Strength
                </label>
                <input
                  type="range"
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-accent-green"
                  defaultValue={70}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-tighter text-white/60">
                  Output Resolution
                </label>
                <select className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent-blue">
                  <option>1080x1920 (9:16)</option>
                  <option>1920x1080 (16:9)</option>
                  <option>1080x1080 (1:1)</option>
                </select>
              </div>
            </div>
          </section>

          <section className="flex flex-col items-center gap-4 rounded-2xl bg-accent-green p-6 text-center text-white">
            <div className="flex size-14 items-center justify-center rounded-full bg-white/20">
              <Zap className="size-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Execute Synthesis</h3>
              <p className="text-sm text-white/80">
                Estimated cost: $1.20 (4x variants)
              </p>
            </div>
            <button
              type="button"
              onClick={selectedSavedReference ? handleGenerateWithSavedReference : handleGenerateRefImage}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-black py-4 text-sm font-bold uppercase tracking-widest text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Starting..." : "Start Generation"}
            </button>
            <div className="flex items-center gap-1 text-[10px] font-medium opacity-60">
              <Clock3 className="size-3" />
              Est. time: 4-6 minutes
            </div>
          </section>

          <section className="rounded-2xl border border-white/5 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-black/40">
                <Info className="size-4 text-white/40" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                  Pro Tip
                </div>
                <p className="text-[11px] leading-relaxed text-white/40">
                  Combine &apos;Identity Mapping&apos; with &apos;References&apos; for 40% higher accuracy in narrative tone.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );

}
