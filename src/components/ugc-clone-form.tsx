"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TikTokInput, type TikTokVideoInfo } from "@/components/tiktok-input";
import { VideoTrimmer } from "@/components/video-trimmer";
import { AvatarPicker } from "@/components/avatar-picker";
import { MediaPreviewFrame } from "@/components/media-preview";
import { WorkspaceHeaderAccessory } from "@/components/workspace-shell";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { calculateEstimatedCost, BRIA_ERASER_COST_PER_SEC, getModelsByType } from "@/lib/ai/models";
import type { ModelDefinition } from "@/lib/ai/types";
import { apiGet, apiPost } from "@/lib/api/client";
import {
  Loader2,
  Check,
  ArrowLeft,
  Sparkles,
  PenLine,
  Volume2,
  Clock3,
  Video,
  Users,
  Layers,
  Zap,
  Info,
  Plus,
} from "lucide-react";

const IDENTITY_ROLE_LABELS: Record<string, string> = {
  front: "Front",
  threeQuarterLeft: "3/4 Left",
  threeQuarterRight: "3/4 Right",
  expressionNeutralOrSmile: "Expression",
};

const UGC_CLONE_TIPS = [
  {
    title: "Start with the cleanest hook",
    body: "Pick a source where the first 1-2 seconds clearly show the face, motion, and spoken setup you want to preserve.",
  },
  {
    title: "Trim before you generate",
    body: "Cut dead air, jump cuts, and outro moments so motion control focuses on the useful part of the clip.",
  },
  {
    title: "Use a front-facing identity",
    body: "Choose an avatar with a clear face, even lighting, and minimal accessories for stronger identity transfer.",
  },
  {
    title: "Anchor the visual style",
    body: "Add a 9:16 reference that matches the lighting and framing you want in the final clone.",
  },
  {
    title: "Keep audio only when it helps",
    body: "Preserve original sound for timing and delivery; turn it off when the source audio is noisy or off-brand.",
  },
  {
    title: "Remove overlays early",
    body: "Strip heavy captions or stickers before generation when they cover faces, hands, or product motion.",
  },
  {
    title: "Use Pro for hard motion",
    body: "Move up to the Pro video model when the source has fast gestures, dance movement, or frequent face turns.",
  },
  {
    title: "Review reference before video",
    body: "A strong reference still reduces wasted video runs because identity, lighting, and framing are checked first.",
  },
] as const;

const UGC_CLONE_TIP_INDEX_KEY = "postforge:ugc-clone:tip-index";

function formatIdentityRole(role: string) {
  return IDENTITY_ROLE_LABELS[role] ?? role;
}

function CloneModelSelect({
  label,
  description,
  accentClassName,
  className,
  models,
  selectedValue,
  onValueChange,
  getCost,
}: {
  label: string;
  description: string;
  accentClassName: string;
  className?: string;
  models: ModelDefinition[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  getCost: (modelId: string) => string;
}) {
  const selectedModel = models.find((model) => model.id === selectedValue) ?? models[0];

  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-2", className)}>
      <legend className={cn("text-[10px] font-bold uppercase tracking-wider", accentClassName)}>
        {label}
      </legend>
      <Select
        value={selectedValue}
        onValueChange={(value) => {
          if (value) onValueChange(value);
        }}
      >
        <SelectTrigger
          aria-label={label}
          className="h-auto! min-h-14 w-full border-white/10 bg-white/5 px-3 py-2 text-white hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <SelectValue>
            {() => (
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">
                    {selectedModel?.name ?? "Select model"}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-white/40">
                    {description}
                  </span>
                </span>
                {selectedModel ? (
                  <span className="shrink-0 font-mono text-[10px] text-white/55">
                    {getCost(selectedModel.id)}
                  </span>
                ) : null}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="min-w-[260px]">
          <SelectGroup>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold">
                      {model.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {getCost(model.id)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </fieldset>
  );
}

function ReferencePortraitFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-reference-portrait-frame="true"
      className={cn(
        "mx-auto flex aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-lg bg-zinc-950",
        className
      )}
    >
      {children}
    </div>
  );
}

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
  const [sourceToolsOpen, setSourceToolsOpen] = useState(false);
  const [sourcesRefreshKey, setSourcesRefreshKey] = useState(0);

  // Step 2: Avatar
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [identityPack, setIdentityPack] = useState<AvatarIdentityPack | null>(null);
  const [isStartingIdentityPack, setIsStartingIdentityPack] = useState(false);
  const [identityPackError, setIdentityPackError] = useState<string | null>(null);
  const [savedReferences, setSavedReferences] = useState<SavedReference[]>([]);
  const [isLoadingSavedReferences, setIsLoadingSavedReferences] = useState(false);
  const [savedReferencesError, setSavedReferencesError] = useState<string | null>(null);
  const [selectedSavedReferenceId, setSelectedSavedReferenceId] = useState<string | null>(null);

  // Step 3: Settings
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [removeTextOverlays, setRemoveTextOverlays] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"kling-3.0-motion" | "kling-3.0-pro-motion" | "kling-2.6-motion">("kling-3.0-motion");
  const [selectedReferenceImageModel, setSelectedReferenceImageModel] = useState("nano-banana-2");
  const [cloneTip, setCloneTip] = useState<(typeof UGC_CLONE_TIPS)[number]>(UGC_CLONE_TIPS[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(sourceIdParam);

  const durationSec = videoInfo?.durationSec ?? 5;
  const videoCost = calculateEstimatedCost(selectedModel, { durationSec });
  const imageCost = calculateEstimatedCost(selectedReferenceImageModel, { numImages: 1 });
  const textErasureCost = removeTextOverlays ? BRIA_ERASER_COST_PER_SEC * durationSec : 0;
  const cloneVideoModels = getModelsByType("video").filter((model) => model.capabilities.motionControl);
  const referenceImageModels = getModelsByType("image");

  const canSubmit = !!videoInfo?.id && !!avatarId && !isSubmitting;

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
  const visibleAvatarReferenceThumbnails = avatarReferencePreviews.slice(0, 2);

  const handleVideoDownloaded = (info: TikTokVideoInfo | null) => {
    setVideoInfo(info);
    setOriginalVideoInfo(info);
    setShowTrimmer(false);
    setSourceToolsOpen(!info);
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
        imageModel: selectedReferenceImageModel,
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
      setSelectedSavedReferenceId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate reference image.";
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
  const referenceCost = selectedSavedReference ? 0 : imageCost;
  const sourceReady = !!videoInfo?.id;
  const shouldShowSourceTools = !sourceReady || sourceToolsOpen;
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
  const primaryActionTimeDetail = referenceReady
    ? "Video generation usually takes 4-6 minutes."
    : "Reference generation runs before video generation.";
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
              {canGenerateClone ? "Ready to Generate" : nextAction.label}
            </span>
          </div>
        </div>
      </WorkspaceHeaderAccessory>

      <div
        data-clone-production-state="true"
        className="space-y-8 pb-[32rem] sm:pb-[24rem] lg:pb-[15rem]"
      >
        <div className="space-y-8">
          <section
            data-clone-source-section="true"
            className="rounded-2xl border border-white/10 bg-[oklch(0.205_0_0)] p-6"
          >
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
              <div className="flex items-center gap-3">
                {sourceReady && (
                  <button
                    type="button"
                    onClick={() => {
                      if (showTrimmer) {
                        handleCancelTrim();
                        return;
                      }

                      setSourceToolsOpen(false);
                      setShowTrimmer(true);
                    }}
                    className="text-xs font-semibold text-white/50 transition-colors hover:text-white/80"
                  >
                    {showTrimmer ? "Close Trim" : "Trim Source"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (sourceReady) {
                      setShowTrimmer(false);
                      setSourceToolsOpen((value) => !value);
                      return;
                    }

                    setSourceToolsOpen(true);
                  }}
                  className="text-xs font-semibold text-accent-blue transition-colors hover:text-accent-blue/80"
                >
                  {sourceReady
                    ? sourceToolsOpen
                      ? "Close Source Picker"
                      : "Replace Source"
                    : "Choose Source"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {sourceReady && videoInfo && sourcePreviewSrc && (
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
                    frameAspectRatio="1 / 1"
                    className="mx-auto w-full max-w-[360px] border border-white/10"
                    mediaClassName="aspect-[9/16] h-full w-auto"
                  />
                )
              )}

              {shouldShowSourceTools && (
                <div className="rounded-xl border border-dashed border-white/10 bg-black p-4">
                  <TikTokInput
                    onDownloaded={handleVideoDownloaded}
                    videoInfo={videoInfo}
                    refreshKey={sourcesRefreshKey}
                    preselectedSourceId={sourceReady ? null : pendingSourceId}
                    onPreselectedSourceResolved={handlePreselectedSourceResolved}
                  />
                </div>
              )}
            </div>
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

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xl text-xs leading-5 text-white/40">
                  {avatarReady
                    ? identityPack?.status === "completed"
                      ? `${identityPack.images.length} identity references ready.`
                      : identityPack?.status === "failed"
                        ? "Identity pack failed; the original avatar is still usable."
                        : identityPack?.status === "queued" || identityPack?.status === "processing" || isStartingIdentityPack
                          ? "Preparing identity references in the background."
                          : "Original avatar fallback is available."
                    : "Select a saved identity, upload one, or create a new identity for this clone."}
                </p>
                {avatarReady && (
                  <Badge variant="outline" className="border-accent-green/30 bg-accent-green/10 text-accent-green">
                    Active
                  </Badge>
                )}
              </div>
              {(identityPackError || identityPack?.error) && (
                <p className="text-xs text-destructive">
                  {identityPackError || identityPack?.error}
                </p>
              )}
              <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
            </div>
          </section>

          <section
            data-clone-reference-section="true"
            className="rounded-2xl border border-white/10 bg-[oklch(0.205_0_0)] p-6"
          >
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

            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(220px,320px)_minmax(0,1fr)]">
              <div className="self-start rounded-xl border border-white/10 bg-black p-3">
                {selectedSavedReference ? (
                  <>
                    <ReferencePortraitFrame>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedSavedReference.previewUrl}
                        alt="Selected reference"
                        className="size-full object-contain"
                      />
                    </ReferencePortraitFrame>
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
                ) : selectedRef?.status === "generating" ? (
                  <ReferencePortraitFrame className="flex-col items-center justify-center p-4 text-center">
                    <Loader2 className="size-7 animate-spin text-accent-coral" />
                    <span className="mt-3 text-xs font-semibold uppercase tracking-widest text-white/50">
                      Generating Reference
                    </span>
                    <span className="mt-1 max-w-[180px] text-[10px] leading-4 text-white/25">
                      Compositing the selected identity into the source scene.
                    </span>
                  </ReferencePortraitFrame>
                ) : selectedRef?.status === "failed" ? (
                  <ReferencePortraitFrame className="flex-col items-center justify-center bg-destructive/10 p-4 text-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-destructive">
                      Reference Failed
                    </span>
                    {selectedRef.error && (
                      <span className="mt-2 max-w-[220px] text-[10px] leading-4 text-destructive/80">
                        {selectedRef.error}
                      </span>
                    )}
                  </ReferencePortraitFrame>
                ) : selectedRef?.status === "completed" && selectedRef.fileId ? (
                  <>
                    <ReferencePortraitFrame>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/files/${selectedRef.fileId}`}
                        alt="Generated reference"
                        className="size-full object-contain"
                      />
                    </ReferencePortraitFrame>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-[11px] font-medium">Generated Reference</span>
                        <span className="mt-0.5 block truncate text-[10px] text-white/35">
                          Variant #{selectedRefIndex + 1}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-accent-coral/30 bg-accent-coral/10 text-accent-coral">
                        Ready
                      </Badge>
                    </div>
                  </>
                ) : primaryAvatarReference ? (
                  <>
                    <ReferencePortraitFrame>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={primaryAvatarReference.previewUrl}
                        alt={primaryAvatarReference.label}
                        className="size-full object-contain"
                      />
                    </ReferencePortraitFrame>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-[11px] font-medium">Avatar Reference</span>
                        <span className="mt-0.5 block truncate text-[10px] text-white/35">
                          {primaryAvatarReference.label} • {primaryAvatarReference.detail}
                        </span>
                      </div>
                      {identityPack?.status === "queued" || identityPack?.status === "processing" || isStartingIdentityPack ? (
                        <Badge variant="outline" className="border-accent-green/30 bg-accent-green/10 text-accent-green">
                          Preparing
                        </Badge>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <ReferencePortraitFrame className="flex-col items-center justify-center p-4 text-center">
                    <Users className="size-6 text-white/20" />
                    <span className="mt-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                      Select Identity
                    </span>
                    <span className="mt-1 max-w-[180px] text-[10px] leading-4 text-white/20">
                      Avatar references appear here after choosing an identity.
                    </span>
                  </ReferencePortraitFrame>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-4 self-start">
                <button
                  type="button"
                  onClick={handleGenerateRefImage}
                  disabled={!canSubmit || isSubmitting || isGenerating}
                  className="flex aspect-[9/16] w-full max-w-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60 md:mx-0"
                >
                  {isSubmitting || isGenerating ? (
                    <Loader2 className="size-6 animate-spin text-white/30" />
                  ) : (
                    <Sparkles className="size-6 text-white/20" />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    {isGenerating
                      ? "Generating Variant"
                      : selectedRefFileId
                        ? "Generate New Variant"
                        : "Generate Variant"}
                  </span>
                  <p className="max-w-[140px] text-[10px] text-white/20">
                    Create a new reference still from the selected source and identity
                  </p>
                </button>

                {submitError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {submitError}
                  </div>
                )}

                {refImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                      Generated variants
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {refImages.map((entry, index) => (
                        <button
                          key={entry.jobId}
                          type="button"
                          onClick={() => {
                            setSelectedSavedReferenceId(null);
                            setSelectedRefIndex(index);
                          }}
                          className={cn(
                            "relative aspect-[9/16] overflow-hidden rounded-lg border bg-black transition-colors hover:border-accent-coral",
                            !selectedSavedReference && selectedRefIndex === index
                              ? "border-accent-coral"
                              : "border-white/10"
                          )}
                        >
                          {entry.status === "completed" && entry.fileId ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/files/${entry.fileId}`}
                              alt={`Generated reference variant ${index + 1}`}
                              className="size-full object-cover"
                            />
                          ) : entry.status === "generating" ? (
                            <span className="grid size-full place-items-center bg-white/[0.03] text-accent-coral">
                              <Loader2 className="size-4 animate-spin" />
                            </span>
                          ) : (
                            <span className="grid size-full place-items-center bg-destructive/10 text-[9px] font-semibold uppercase text-destructive">
                              Failed
                            </span>
                          )}
                          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            #{index + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isLoadingSavedReferences && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/40">
                    Loading saved references...
                  </div>
                )}

                {savedReferencesError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {savedReferencesError}
                  </div>
                )}

                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  {savedReferences.length > 0 ? "Saved references" : "Avatar references"}
                </p>
                <div
                  data-reference-thumbnail-grid="true"
                  className="grid max-h-[260px] grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 overflow-y-auto pr-1"
                >
                  {savedReferences.length > 0
                    ? savedReferences.map((reference) => (
                      <button
                        key={reference.id}
                        type="button"
                        onClick={() => handleSelectSavedReference(reference.id)}
                        className={cn(
                          "relative aspect-[9/16] overflow-hidden rounded-lg border bg-black transition-colors hover:border-accent-coral",
                          reference.id === selectedSavedReferenceId
                            ? "border-accent-coral"
                            : "border-white/10"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={reference.previewUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                        {reference.id === selectedSavedReferenceId && (
                          <span className="absolute inset-0 grid place-items-center bg-accent-coral/15 text-accent-coral">
                            <Check className="size-4" />
                          </span>
                        )}
                      </button>
                    ))
                    : visibleAvatarReferenceThumbnails.map((reference) => (
                      <div
                        key={reference.id}
                        className="relative aspect-[9/16] overflow-hidden rounded-lg border border-white/10 bg-black"
                        title={`${reference.label} • ${reference.detail}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={reference.previewUrl}
                          alt={reference.label}
                          className="size-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[9px] font-medium text-white">
                          <span className="block truncate">{reference.label}</span>
                        </span>
                      </div>
                    ))}
                  <button
                    type="button"
                    className="flex aspect-[9/16] items-center justify-center rounded-lg border border-dashed border-white/10 transition-colors hover:bg-white/5"
                    title={savedReferences.length > 0 ? "Saved references are shown first" : "Generate a scene reference from the selected avatar"}
                  >
                    <Plus className="size-4 text-white/20" />
                  </button>
                </div>

                {savedReferences.length === 0 && visibleAvatarReferenceThumbnails.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/30">
                    Select an identity to show avatar references.
                  </div>
                ) : savedReferences.length === 0 && avatarReferencePreviews.length > visibleAvatarReferenceThumbnails.length ? (
                  <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pr-1">
                    {avatarReferencePreviews.slice(2).map((reference) => (
                      <div
                        key={reference.id}
                        className="relative aspect-[9/16] overflow-hidden rounded-lg border border-white/10 bg-black"
                        title={`${reference.label} • ${reference.detail}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={reference.previewUrl}
                          alt={reference.label}
                          className="size-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[9px] font-medium text-white">
                          <span className="block truncate">{reference.label}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  identityPack?.status === "queued" || identityPack?.status === "processing" || isStartingIdentityPack ? (
                    <div className="flex items-center gap-2 rounded-lg border border-accent-green/20 bg-accent-green/5 px-3 py-2 text-xs text-accent-green">
                      <Loader2 className="size-3.5 animate-spin" />
                      Preparing more avatar references...
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </section>
        </div>

      </div>

      <section
        data-clone-primary-action-bar="true"
        data-clone-generation-settings-bar="true"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[oklch(0.145_0_0)]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl md:left-72 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-[1280px] rounded-2xl border border-white/10 bg-[oklch(0.205_0_0)]/95 p-3 sm:p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(190px,230px)_minmax(0,1fr)_minmax(210px,260px)] xl:items-end">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Generation settings
              </p>
              <h3 className="mt-1 truncate text-sm font-bold text-white">
                {nextAction.label}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
                <span className="font-mono">
                  {formatCost(referenceCost + videoCost + textErasureCost)} est.
                </span>
                <span className="hidden items-center gap-1 2xl:inline-flex">
                  <Clock3 className="size-3" />
                  {primaryActionTimeDetail}
                </span>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(180px,220px)_minmax(180px,220px)]">
              <CloneModelSelect
                label="Final video"
                description="Motion-control clone video"
                accentClassName="text-accent-blue"
                className="min-w-0"
                models={cloneVideoModels}
                selectedValue={selectedModel}
                onValueChange={(value) => setSelectedModel(value as typeof selectedModel)}
                getCost={(modelId) =>
                  formatCost(calculateEstimatedCost(modelId, { durationSec }))
                }
              />

              <CloneModelSelect
                label="Reference image"
                description="Identity/reference still"
                accentClassName="text-accent-green"
                className="min-w-0"
                models={referenceImageModels}
                selectedValue={selectedReferenceImageModel}
                onValueChange={setSelectedReferenceImageModel}
                getCost={(modelId) =>
                  formatCost(calculateEstimatedCost(modelId, { numImages: 1 }))
                }
              />

              <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Volume2 className="size-4 shrink-0 text-white/40" />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-white/80">
                      Keep sound
                    </p>
                    <p className="truncate text-[10px] text-white/35">
                      Original audio
                    </p>
                  </div>
                </div>
                <Switch checked={keepOriginalSound} onCheckedChange={setKeepOriginalSound} />
              </div>

              <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-white/80">
                    Remove text
                  </p>
                  <p className="truncate text-[10px] text-white/35">
                    Captions/overlays
                    {removeTextOverlays && (
                      <span className="text-accent-green"> +{formatCost(textErasureCost)}</span>
                    )}
                  </p>
                </div>
                <Switch checked={removeTextOverlays} onCheckedChange={setRemoveTextOverlays} />
              </div>
            </div>

            <button
              type="button"
              onClick={
                selectedSavedReference
                  ? handleGenerateWithSavedReference
                  : selectedRefFileId
                    ? handleApproveAndGenerate
                    : handleGenerateRefImage
              }
              disabled={
                selectedSavedReference || selectedRefFileId
                  ? !canGenerateClone
                  : !canSubmit || isSubmitting || isGenerating
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-green px-5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-accent-green/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
            >
              <Zap className="size-4" />
              {isSubmitting
                ? "Starting..."
                : isGenerating
                  ? "Generating reference..."
                  : nextAction.label}
            </button>
          </div>

          <div className="mt-3 hidden items-start gap-2 border-t border-white/10 pt-3 text-[11px] leading-4 text-white/40 lg:flex">
            <Info className="mt-0.5 size-3.5 shrink-0 text-white/30" />
            <p className="min-w-0 truncate">
              <span className="font-bold uppercase tracking-wider text-white/55">Tip:</span>{" "}
              <span className="font-semibold text-white/60">{cloneTip.title}</span>
              <span className="text-white/35"> - {cloneTip.body}</span>
            </p>
          </div>
        </div>
      </section>
    </>
  );

}
