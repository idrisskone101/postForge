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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { calculateEstimatedCost, BRIA_ERASER_COST_PER_SEC } from "@/lib/ai/models";
import { apiGet, apiPost } from "@/lib/api/client";
import {
  Loader2,
  Scissors,
  Check,
  ArrowLeft,
  Sparkles,
  PenLine,
  ArrowRight,
  Volume2,
  Search,
  Image as ImageIcon,
  Clock3,
  RefreshCcw,
  ShieldCheck,
  ChevronDown,
  Video,
  Users,
  Settings2,
} from "lucide-react";

const PROMPT_PRESETS = [
  {
    label: "Talking Head",
    prompt: "Medium close-up, soft natural lighting, neutral background, casual indoor setting",
  },
  {
    label: "Product Demo",
    prompt: "Well-lit environment, clean background, warm lighting, medium shot framing",
  },
  {
    label: "Dance / Movement",
    prompt: "Full body visible, vibrant atmosphere, dynamic lighting, open space",
  },
  {
    label: "Reaction",
    prompt: "Close-up framing, casual setting, natural ambient lighting",
  },
  {
    label: "Lifestyle / Vlog",
    prompt: "Cozy everyday setting, warm natural lighting, medium close-up, authentic candid feel",
  },
  {
    label: "Office / B2B",
    prompt: "Modern office or clean backdrop, medium shot, crisp even lighting, professional environment",
  },
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

function formatReferenceDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function SectionTitle({
  icon,
  title,
  detail,
  action,
}: {
  icon: ReactNode;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/35">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {detail && (
            <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{detail}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
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
  const [isStartingIdentityPack, setIsStartingIdentityPack] = useState(false);
  const [identityPackError, setIdentityPackError] = useState<string | null>(null);
  const [savedReferences, setSavedReferences] = useState<SavedReference[]>([]);
  const [isLoadingSavedReferences, setIsLoadingSavedReferences] = useState(false);
  const [savedReferencesError, setSavedReferencesError] = useState<string | null>(null);
  const [selectedSavedReferenceId, setSelectedSavedReferenceId] = useState<string | null>(null);
  const [isReferenceLibraryOpen, setIsReferenceLibraryOpen] = useState(false);
  const [referenceSearchQuery, setReferenceSearchQuery] = useState("");
  const [avatarToolsOpen, setAvatarToolsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Step 3: Settings
  const [prompt, setPrompt] = useState("");
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [removeTextOverlays, setRemoveTextOverlays] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"kling-3.0-motion" | "kling-3.0-pro-motion" | "kling-2.6-motion">("kling-3.0-motion");

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
      setIsReferenceLibraryOpen(false);
      setReferenceSearchQuery("");
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
    setReferenceSearchQuery("");
    setAvatarToolsOpen(false);
    setAdvancedOpen(false);
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
  const normalizedReferenceQuery = referenceSearchQuery.trim().toLowerCase();
  const filteredSavedReferences = normalizedReferenceQuery
    ? savedReferences.filter((reference) => {
      const searchableText = [
        reference.prompt,
        reference.source?.label,
        reference.filename,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedReferenceQuery);
    })
    : savedReferences;
  const recentSavedReferences = savedReferences.slice(0, 4);

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

  const handlePickSavedReference = (referenceId: string) => {
    setSelectedSavedReferenceId(referenceId);
    setIsReferenceLibraryOpen(false);
  };

  const modelName = selectedModel === "kling-3.0-motion"
    ? "Kling 3.0"
    : selectedModel === "kling-3.0-pro-motion"
      ? "Kling 3.0 Pro"
      : "Kling 2.6";
  const referenceCost = selectedSavedReference ? 0 : imageCost;
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
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
          <Badge
            variant="outline"
            className={cn(
              canGenerateClone
                ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
                : "bg-muted/45 text-muted-foreground"
            )}
          >
            Production State
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            {nextAction.label}
          </span>
        </div>
      </WorkspaceHeaderAccessory>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card data-ugc-builder className="border-border bg-card py-0 shadow-sm">
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h1 className="text-xl font-extrabold sm:text-2xl">Clone</h1>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
              Keep Source, Trim, Identity, Reference, and readiness visible while you prepare the clone.
            </p>
          </div>

          <CardContent className="p-0">
            <section className="border-b border-border px-4 py-3.5 sm:px-5">
              <SectionTitle
                icon={<Video className="size-4 text-accent-blue" />}
                title="Source"
                detail="Paste a TikTok URL or pick a saved source."
                action={
                  <Badge
                    variant="outline"
                    className={cn(
                      sourceReady && "border-accent-green/30 bg-accent-green/10 text-accent-green"
                    )}
                  >
                    {sourceReady ? "Ready" : "Required"}
                  </Badge>
                }
              />
              <TikTokInput
                onDownloaded={handleVideoDownloaded}
                videoInfo={videoInfo}
                refreshKey={sourcesRefreshKey}
                preselectedSourceId={pendingSourceId}
                onPreselectedSourceResolved={handlePreselectedSourceResolved}
              />

              {videoInfo && !showTrimmer && sourcePreviewSrc && (
                <div className="mt-4">
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
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:text-white"
                      >
                        <Scissors className="size-3" />
                        {originalVideoInfo && videoInfo.localPath !== originalVideoInfo.localPath
                          ? "Re-trim"
                          : "Trim"}
                      </button>
                    }
                  />
                </div>
              )}

              {videoInfo && showTrimmer && originalVideoInfo && (
                <div className="mt-4">
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
                </div>
              )}
            </section>

          <section className="border-b border-border px-4 py-3.5 sm:px-5">
            <SectionTitle
              icon={<Users className="size-4 text-accent-green" />}
              title="Avatar"
              detail="Pick the person for the clone."
              action={
                <Badge
                  variant="outline"
                  className={cn(
                    avatarReady && "border-accent-green/30 bg-accent-green/10 text-accent-green"
                  )}
                >
                  {avatarReady ? "Selected" : "Required"}
                </Badge>
              }
            />
            {!avatarId ? (
              <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
            ) : (
              <>
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-green" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Avatar selected</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {identityPack?.status === "completed"
                            ? `${identityPack.images.length} facial references ready.`
                            : identityPack?.status === "failed"
                              ? "Pack failed. The original avatar remains available as fallback."
                              : identityPack?.status === "queued" || identityPack?.status === "processing" || isStartingIdentityPack
                                ? "Preparing facial references in the background."
                                : "Original avatar fallback is available."}
                        </p>
                        {(identityPackError || identityPack?.error) && (
                          <p className="mt-1 line-clamp-2 text-[11px] text-destructive">
                            {identityPackError || identityPack?.error}
                          </p>
                        )}
                      </div>
                    </div>
                    {identityPack?.status === "completed" ? (
                      <Badge variant="outline" className="border-accent-green/30 bg-accent-green/10 text-accent-green">
                        Ready
                      </Badge>
                    ) : identityPack?.status === "failed" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void startIdentityPack(avatarId, true)}
                        disabled={isStartingIdentityPack}
                        className="h-7 gap-1 text-xs"
                      >
                        {isStartingIdentityPack ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <RefreshCcw className="size-3" />
                        )}
                        Retry
                      </Button>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        Working
                      </Badge>
                    )}
                  </div>
                </div>

                <Collapsible open={avatarToolsOpen} onOpenChange={setAvatarToolsOpen}>
                  <div className="mt-3 rounded-lg border border-border">
                    <CollapsibleTrigger
                      render={
                        <button
                          type="button"
                          className="group flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-muted/30"
                        />
                      }
                    >
                      Change avatar
                      <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-open:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border p-3">
                        <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </>
            )}
          </section>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <div className="border-b border-border">
              <CollapsibleTrigger
                render={
                  <button
                    type="button"
                    className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 sm:px-5"
                  />
                }
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Settings2 className="size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-semibold">Advanced</span>
                    <span className="block text-xs text-muted-foreground">
                      References, model, prompt, audio, and cleanup.
                    </span>
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-open:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 px-4 pb-4 sm:px-5">
                  <div className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Saved reference</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Reuse an existing avatar-scene composite when available.
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-muted/50">
                        {selectedSavedReference ? "Selected" : avatarReady ? savedReferences.length : "Locked"}
                      </Badge>
                    </div>
                    {!avatarId ? (
                      <p className="text-xs text-muted-foreground">
                        Select an avatar to browse saved references.
                      </p>
                    ) : isLoadingSavedReferences ? (
                      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        Loading saved references...
                      </div>
                    ) : savedReferencesError ? (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        {savedReferencesError}
                      </div>
                    ) : savedReferences.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                        No saved references yet. Generate one and it will be reusable next time.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedSavedReference ? (
                          <div className="flex items-start gap-3 rounded-md border border-accent-coral/30 bg-accent-coral/5 p-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={selectedSavedReference.previewUrl}
                              alt="Selected saved reference"
                              className="size-14 shrink-0 rounded-md border border-accent-coral/20 object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">
                                {selectedSavedReference.source?.label ?? "Saved reference selected"}
                              </p>
                              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                                {selectedSavedReference.prompt || "Reusable avatar-scene composite"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                            No saved reference selected. A new reference image will be generated.
                          </p>
                        )}

                        <div className="grid grid-cols-4 gap-2">
                          {recentSavedReferences.map((reference) => {
                            const isSelected = reference.id === selectedSavedReferenceId;

                            return (
                              <button
                                key={reference.id}
                                type="button"
                                onClick={() => handleSelectSavedReference(reference.id)}
                                className={cn(
                                  "overflow-hidden rounded-md border transition-colors duration-150",
                                  isSelected
                                    ? "border-accent-coral"
                                    : "border-border hover:border-foreground/20"
                                )}
                                title={reference.source?.label ?? "Saved reference"}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={reference.previewUrl}
                                  alt={reference.prompt || "Saved reference image"}
                                  className="h-14 w-full object-cover"
                                />
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsReferenceLibraryOpen(true)}
                            className="flex-1"
                          >
                            Browse library
                          </Button>
                          {selectedSavedReference && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSavedReferenceId(null)}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {([
                      { id: "kling-3.0-motion" as const, label: "Kling 3.0", price: "$0.126/s" },
                      { id: "kling-3.0-pro-motion" as const, label: "Kling 3.0 Pro", price: "$0.168/s" },
                      { id: "kling-2.6-motion" as const, label: "Kling 2.6", price: "$0.07/s" },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedModel(opt.id)}
                        className={cn(
                          "rounded-md border px-3 py-2 text-left transition-colors duration-150",
                          selectedModel === opt.id
                            ? "border-accent-coral bg-accent-coral/5"
                            : "border-border hover:border-foreground/20"
                        )}
                      >
                        <span className="block text-sm font-medium">{opt.label}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                          {opt.price}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {PROMPT_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setPrompt(preset.prompt)}
                          className={cn(
                            "whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
                            prompt === preset.prompt
                              ? "border-accent-coral bg-accent-coral/5 text-accent-coral"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder="Optional: lighting, framing, environment, style..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                      maxLength={500}
                      className="min-h-[88px] resize-none rounded-md border border-border bg-muted/40 p-3 text-sm"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="flex items-center gap-3">
                        <Volume2 className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Keep original sound</p>
                          <p className="text-xs text-muted-foreground">Preserve the TikTok audio track.</p>
                        </div>
                      </div>
                      <Switch checked={keepOriginalSound} onCheckedChange={setKeepOriginalSound} />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">Remove text overlays</p>
                        <p className="text-xs text-muted-foreground">
                          Strip hook text before motion control
                          {removeTextOverlays && (
                            <span className="text-accent-green"> (+{formatCost(textErasureCost)})</span>
                          )}
                        </p>
                      </div>
                      <Switch checked={removeTextOverlays} onCheckedChange={setRemoveTextOverlays} />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <div className="p-4 sm:p-5">
            {submitError && (
              <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {submitError}
              </div>
            )}

            <div className="mb-3 flex flex-col gap-1.5 rounded-lg border border-border bg-muted/25 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                {selectedSavedReference ? "Using saved reference" : "New reference image"}
              </span>
              <span className="font-mono font-semibold">
                {formatCost(referenceCost + videoCost + textErasureCost)}
              </span>
            </div>

            <Button
              size="lg"
              onClick={selectedSavedReference ? handleGenerateWithSavedReference : handleGenerateRefImage}
              disabled={!canSubmit}
              className="h-10 w-full gap-2 rounded-md bg-accent-coral font-bold text-white hover:bg-[#ff6540]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {selectedSavedReference ? "Submitting..." : "Generating..."}
                </>
              ) : (
                <>
                  {nextAction.label}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            {!canSubmit && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Add a source and avatar to continue.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {productionStatePanel}
      </div>

      {avatarId && (
        <Sheet open={isReferenceLibraryOpen} onOpenChange={setIsReferenceLibraryOpen}>
          <SheetContent
            side="right"
            className="p-0 data-[side=right]:w-[min(96vw,1120px)] data-[side=right]:sm:max-w-[min(96vw,1120px)]"
          >
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle className="text-sm uppercase tracking-wider">Saved Reference Library</SheetTitle>
              <SheetDescription className="text-xs">
                Browse previous avatar-scene composites and choose one without cluttering the main settings panel.
              </SheetDescription>
            </SheetHeader>

            <div className="grid h-[calc(100vh-72px)] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-h-0 flex-col xl:border-r xl:border-b-0">
                <div className="space-y-3 border-b border-border p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={referenceSearchQuery}
                      onChange={(e) => setReferenceSearchQuery(e.target.value)}
                      placeholder="Search by source or prompt..."
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {filteredSavedReferences.length} of {savedReferences.length} references
                  </p>
                  {filteredSavedReferences.length > 8 && (
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                      Scroll to browse all references
                    </p>
                  )}
                  {selectedSavedReference && (
                    <div className="rounded-md border border-accent-coral/30 bg-accent-coral/5 px-3 py-2 xl:hidden">
                      <p className="truncate text-xs font-semibold">
                        Selected: {selectedSavedReference.source?.label ?? "Saved reference"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatReferenceDate(selectedSavedReference.createdAt)}
                      </p>
                    </div>
                  )}
                </div>

                {filteredSavedReferences.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center p-6 text-center">
                    <div>
                      <p className="text-sm font-medium">No matching references</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try a different keyword or clear your search.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="library-scrollbar flex-1 overflow-y-auto overscroll-contain p-4">
                    <div className="grid grid-cols-2 gap-3 pb-8 xl:grid-cols-3">
                      {filteredSavedReferences.map((reference) => {
                        const isSelected = reference.id === selectedSavedReferenceId;

                        return (
                          <button
                            key={reference.id}
                            type="button"
                            onClick={() => handlePickSavedReference(reference.id)}
                            className={cn(
                              "overflow-hidden rounded-lg border bg-muted/20 text-left transition-colors duration-150",
                              isSelected
                                ? "border-accent-coral shadow-[0_0_0_1px_rgba(255,123,74,0.2)]"
                                : "border-border hover:border-foreground/20"
                            )}
                          >
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={reference.previewUrl}
                                alt={reference.prompt || "Saved reference image"}
                                className="h-36 w-full object-cover"
                              />
                              {isSelected && (
                                <span className="absolute right-2 top-2 rounded-full bg-accent-coral px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  <Check className="size-3" />
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 px-3 py-2">
                              <p className="truncate text-xs font-semibold">
                                {reference.source?.label ?? "Saved reference"}
                              </p>
                              <p className="line-clamp-2 text-[11px] text-muted-foreground">
                                {reference.prompt || "Reusable avatar-scene composite"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatReferenceDate(reference.createdAt)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden min-h-0 flex-col bg-muted/20 xl:flex">
                <div className="border-b border-border p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Current Selection
                  </p>
                </div>
                {selectedSavedReference ? (
                  <div className="space-y-3 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedSavedReference.previewUrl}
                      alt="Currently selected saved reference"
                      className="h-56 w-full rounded-lg border border-border object-cover"
                    />
                    <p className="text-xs font-semibold">
                      {selectedSavedReference.source?.label ?? "Saved reference selected"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedSavedReference.prompt || "Reusable avatar-scene composite"}
                    </p>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock3 className="size-3" />
                      {formatReferenceDate(selectedSavedReference.createdAt)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedSavedReferenceId(null)}
                      className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors duration-150 hover:border-foreground/20"
                    >
                      Clear Selection
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-4 text-center">
                    <div>
                      <ImageIcon className="mx-auto size-5 text-muted-foreground" />
                      <p className="mt-2 text-xs font-medium">No saved reference selected</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Pick one from the gallery to reuse it for clone generation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

    </>
  );
}
