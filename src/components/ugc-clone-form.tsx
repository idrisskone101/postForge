"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TikTokInput, type TikTokVideoInfo } from "@/components/tiktok-input";
import { VideoTrimmer } from "@/components/video-trimmer";
import { AvatarPicker } from "@/components/avatar-picker";
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
  CardDescription,
  CardHeader,
  CardTitle,
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
import { calculateEstimatedCost, getModel, BRIA_ERASER_COST_PER_SEC } from "@/lib/ai/models";
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
  Circle,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import {
  FloatingToolbar,
  ToolbarHeading,
  ToolbarDivider,
  ToolbarLabel,
} from "@/components/floating-toolbar";

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

function SimpleStatus({
  label,
  complete,
  detail,
}: {
  label: string;
  complete: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          complete
            ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
            : "border-border text-muted-foreground"
        )}
      >
        {complete ? <Check className="size-3" /> : <Circle className="size-2.5" />}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function AccordionSection({
  title,
  description,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <Collapsible open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <div className="border-t border-border first:border-t-0">
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="group flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30"
            />
          }
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold">
              {title}
              {badge}
            </span>
            {description && (
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {description}
              </span>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-open:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
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
  const pricePerSec = getModel(selectedModel)?.pricing.amount ?? 0;
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

  // ─── Review Phase ───────────────────────────────────────────────────
  if (phase === "reviewing") {
    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Image Preview + History */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToInput}
                className="flex size-9 items-center justify-center rounded-lg bg-card border border-border hover:bg-muted transition-colors duration-150"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div>
                <h2 className="text-lg font-bold">Review Reference Image</h2>
                <p className="text-xs text-muted-foreground">
                  Your avatar composited into the TikTok&apos;s environment
                </p>
              </div>
            </div>

            {/* Main Preview */}
            <div className="launch-card bg-card border border-border overflow-hidden">
              <div className="relative min-h-[500px] flex items-center justify-center">
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

            {/* Thumbnail History — show when there are 2+ images */}
            {refImages.length > 1 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Generated Variants ({refImages.length})
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
          </div>

          {/* Right Column: Prompt Editor + Cost + Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* Prompt Editor */}
            <div className="launch-card bg-card p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PenLine className="size-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Reference Image Prompt
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {refPrompt.length}/500
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                Edit the prompt and regenerate to refine the reference image.
              </p>
              <Textarea
                placeholder="e.g. The person is wearing a casual blue hoodie, sitting at a coffee shop table, warm afternoon light..."
                value={refPrompt}
                onChange={(e) => setRefPrompt(e.target.value.slice(0, 500))}
                maxLength={500}
                className="min-h-[120px] resize-none bg-muted/50 border border-border focus:border-accent-coral/20 focus:bg-card rounded-lg p-4 text-sm transition-all duration-150"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleRegenerateRefImage}
                  disabled={isSubmitting || isGenerating}
                  className="bg-muted text-foreground hover:bg-accent-coral/10 hover:text-accent-coral rounded-md px-4 text-xs font-bold h-8 flex items-center gap-2 border border-border transition-colors duration-150"
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

            {/* Cost Breakdown */}
            <div className="bg-muted rounded-lg p-6 border border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Cost Breakdown
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Reference images ({refImages.filter((r) => r.status === "completed").length})
                  </span>
                  <span className="font-medium font-mono">{formatCost(totalRefCost || imageCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Video generation</span>
                  <span className="font-medium font-mono">{formatCost(videoCost)}</span>
                </div>
                {removeTextOverlays && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Text overlay removal</span>
                    <span className="font-medium font-mono">{formatCost(textErasureCost)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="text-xl font-bold tracking-tight">
                    {formatCost((totalRefCost || imageCost) + videoCost + textErasureCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* Selected image prompt label */}
            {selectedRef && selectedRef.prompt && (
              <div className="rounded-lg bg-muted/50 border border-border p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  Prompt used for #{selectedRefIndex + 1}
                </p>
                <p className="text-xs text-foreground/80 italic leading-relaxed line-clamp-3">
                  {selectedRef.prompt || "(no additional prompt)"}
                </p>
              </div>
            )}
          </div>
        </div>

        <FloatingToolbar
          summary={
            <>
              <ToolbarHeading>Review</ToolbarHeading>
              <ToolbarDivider />
              <ToolbarLabel>{refImages.filter(r => r.status === "completed").length} variants</ToolbarLabel>
              <ToolbarDivider />
              <ToolbarLabel>{modelName}</ToolbarLabel>
            </>
          }
        >
          {submitError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
              {submitError}
            </div>
          )}
          <Button
            size="lg"
            variant="outline"
            onClick={handleBackToInput}
            className="rounded-md px-6 h-auto py-2.5 text-sm font-bold flex items-center gap-2"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button
            size="lg"
            onClick={handleApproveAndGenerate}
            disabled={!hasAnyCompleted || !selectedRefFileId || isSubmitting}
            className="bg-accent-coral text-white font-bold px-8 py-2.5 rounded-md text-sm hover:bg-[#ff6540] transition-all duration-150 h-auto flex items-center gap-2 uppercase tracking-wider"
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
        </FloatingToolbar>
      </>
    );
  }

  // ─── Input Phase ────────────────────────────────────────────────────
  return (
    <>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Card className="border-border bg-card py-0 shadow-sm">
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="flex items-center justify-between gap-3">
                <span>1. Source</span>
                <Badge
                  variant="outline"
                  className={cn(
                    sourceReady && "border-accent-green/30 bg-accent-green/10 text-accent-green"
                  )}
                >
                  {sourceReady ? "Loaded" : "Required"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Paste a TikTok or reuse a saved source. Trim only when the hook or ending needs cleanup.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <TikTokInput
                onDownloaded={handleVideoDownloaded}
                videoInfo={videoInfo}
                refreshKey={sourcesRefreshKey}
                preselectedSourceId={pendingSourceId}
                onPreselectedSourceResolved={handlePreselectedSourceResolved}
              />

              {videoInfo && !showTrimmer && (
                <button
                  type="button"
                  onClick={() => setShowTrimmer(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-foreground/20 hover:text-foreground"
                >
                  <Scissors className="size-3.5" />
                  Trim source
                  {originalVideoInfo && videoInfo.localPath !== originalVideoInfo.localPath && (
                    <span className="ml-1 rounded-md bg-accent-coral/10 px-2 py-0.5 text-[10px] font-bold text-accent-coral">
                      trimmed
                    </span>
                  )}
                </button>
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
            </CardContent>
          </Card>

          <Card className="border-border bg-card py-0 shadow-sm">
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="flex items-center justify-between gap-3">
                <span>2. Avatar</span>
                <Badge
                  variant="outline"
                  className={cn(
                    avatarReady && "border-accent-green/30 bg-accent-green/10 text-accent-green"
                  )}
                >
                  {avatarReady ? "Selected" : "Required"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Select, upload, or generate the person who will appear in the cloned video.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {!avatarId ? (
                <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
              ) : (
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">Avatar selected</p>
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
              )}

              {avatarId && (
                <Collapsible
                  open={avatarToolsOpen}
                  onOpenChange={(nextOpen) => setAvatarToolsOpen(nextOpen)}
                >
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
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-border bg-card py-0 shadow-sm lg:sticky lg:top-6">
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                Review & settings
              </CardTitle>
              <CardDescription>
                Confirm the minimum setup, then expand only the tools you need.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 p-5">
              <SimpleStatus
                label="Source"
                complete={sourceReady}
                detail={sourceReady ? `${durationSec}s loaded` : "Required"}
              />
              <SimpleStatus
                label="Avatar"
                complete={avatarReady}
                detail={avatarReady ? "Selected" : "Required"}
              />
              <SimpleStatus
                label="Reference"
                complete={!!selectedSavedReference || avatarReady}
                detail={selectedSavedReference ? "Using saved reference" : "New reference will be generated"}
              />
            </CardContent>

            <AccordionSection
              key={`reference-${avatarReady}`}
              title="Reference"
              description={avatarReady ? "Reuse a saved reference or generate a fresh one." : "Choose an avatar to unlock saved references."}
              badge={
                <Badge variant="outline" className="bg-muted/50">
                  {selectedSavedReference ? "Saved" : avatarReady ? savedReferences.length : "Locked"}
                </Badge>
              }
              defaultOpen={avatarReady}
            >
              {!avatarId ? (
                <p className="text-xs text-muted-foreground">
                  Saved avatar-scene composites appear here after an avatar is selected.
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
                  No saved references yet. Generate one below and it will be reusable next time.
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
                      No saved reference selected. A new reference image will be generated for review.
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
            </AccordionSection>

            <AccordionSection
              title="Motion engine"
              description={`${modelName} selected`}
              defaultOpen
            >
              <div className="grid gap-2">
                {([
                  { id: "kling-3.0-motion" as const, label: "Kling 3.0", price: "$0.126/s", note: "Best default identity preservation." },
                  { id: "kling-3.0-pro-motion" as const, label: "Kling 3.0 Pro", price: "$0.168/s", note: "Higher quality and motion fidelity." },
                  { id: "kling-2.6-motion" as const, label: "Kling 2.6", price: "$0.07/s", note: "Cheaper, no element binding." },
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
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{opt.price}</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{opt.note}</span>
                  </button>
                ))}
              </div>
            </AccordionSection>

            <AccordionSection
              title="Scene direction"
              description={prompt ? "Custom scene guidance added" : "Optional context for lighting, environment, and framing"}
            >
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
                <p className="text-[11px] text-muted-foreground">
                  Motion comes from the source video. This only guides the generated scene/reference.
                </p>
              </div>
            </AccordionSection>

            <AccordionSection
              title="Audio & cleanup"
              description={keepOriginalSound ? "Original audio kept" : "Audio removed"}
              badge={removeTextOverlays ? <Badge variant="outline">Text cleanup on</Badge> : undefined}
            >
              <div className="space-y-3">
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
            </AccordionSection>

            <CardContent className="border-t border-border p-5">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Estimated cost
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {formatCost(referenceCost + videoCost + textErasureCost)}
                  </p>
                </div>
                <div className="text-right font-mono text-[10px] text-muted-foreground">
                  <p>Ref: {selectedSavedReference ? `${formatCost(0)} saved` : formatCost(imageCost)}</p>
                  <p>Video: {durationSec}s @ ${pricePerSec}/s</p>
                  {removeTextOverlays && <p>Cleanup: {formatCost(textErasureCost)}</p>}
                </div>
              </div>

              {submitError && (
                <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {submitError}
                </div>
              )}

              {selectedSavedReference && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateRefImage}
                  disabled={!canSubmit}
                  className="mb-2 w-full gap-2"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Generate new reference instead
                </Button>
              )}

              <Button
                size="lg"
                onClick={selectedSavedReference ? handleGenerateWithSavedReference : handleGenerateRefImage}
                disabled={!canSubmit}
                className="h-11 w-full gap-2 rounded-md bg-accent-coral font-bold text-white hover:bg-[#ff6540]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {selectedSavedReference ? "Submitting..." : "Generating..."}
                  </>
                ) : (
                  <>
                    {selectedSavedReference ? "Generate clone" : "Generate reference"}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              {!canSubmit && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Add a source and avatar to continue.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
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
