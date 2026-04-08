"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  Film,
  ImageIcon,
  Loader2,
  PenLine,
  Sparkles,
  Volume2,
} from "lucide-react";

import { AvatarPicker } from "@/components/avatar-picker";
import { UGCCloneJobInfo, UGCCloneJobStage, useUGCCloneJob } from "@/components/ugc-clone-job-view";
import { UGCCloneQueue } from "@/components/ugc-clone-queue";
import { TikTokInput, type TikTokVideoInfo } from "@/components/tiktok-input";
import { VideoTrimmer } from "@/components/video-trimmer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api/client";
import { BRIA_ERASER_COST_PER_SEC, calculateEstimatedCost, getModel } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";

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

type PanelKey = "source" | "avatar" | "settings" | "reference";

export function UGCCloneForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeJobId = searchParams.get("job");

  const [refImages, setRefImages] = useState<RefImageEntry[]>([]);
  const [selectedRefIndex, setSelectedRefIndex] = useState(0);
  const [refPrompt, setRefPrompt] = useState("");

  const [videoInfo, setVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [originalVideoInfo, setOriginalVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [sourcesRefreshKey, setSourcesRefreshKey] = useState(0);

  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PanelKey>("source");

  const [prompt, setPrompt] = useState("");
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [removeTextOverlays, setRemoveTextOverlays] = useState(false);
  const [selectedModel, setSelectedModel] = useState<
    "kling-3.0-motion" | "kling-3.0-pro-motion" | "kling-2.6-motion"
  >("kling-3.0-motion");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { job: activeJob, isLoading: isJobLoading, error: jobError, isRetrying, retryJob } =
    useUGCCloneJob(activeJobId);

  const durationSec = videoInfo?.durationSec ?? 5;
  const videoCost = calculateEstimatedCost(selectedModel, { durationSec });
  const imageCost = calculateEstimatedCost("nano-banana-2", { numImages: 1 });
  const pricePerSec = getModel(selectedModel)?.pricing.amount ?? 0;
  const textErasureCost = removeTextOverlays ? BRIA_ERASER_COST_PER_SEC * durationSec : 0;
  const modelName =
    selectedModel === "kling-3.0-motion"
      ? "Kling 3.0"
      : selectedModel === "kling-3.0-pro-motion"
        ? "Kling 3.0 Pro"
        : "Kling 2.6";

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refImagesRef = useRef(refImages);

  useEffect(() => {
    refImagesRef.current = refImages;
  }, [refImages]);

  const setActiveJobQuery = useCallback(
    (jobId: string | null) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (jobId) {
        nextParams.set("job", jobId);
      } else {
        nextParams.delete("job");
      }

      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const pollGeneratingJobs = useCallback(async () => {
    const generating = refImagesRef.current.filter((entry) => entry.status === "generating");
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
          (update) => update.status === "fulfilled" && update.value.jobId === entry.jobId
        );
        if (!result || result.status !== "fulfilled") return entry;

        const { job } = result.value;
        if (job.status === "completed" && job.outputs[0]) {
          changed = true;
          return {
            ...entry,
            status: "completed" as const,
            fileId: job.outputs[0].id,
            cost: job.estimatedCost,
          };
        }
        if (job.status === "failed") {
          changed = true;
          return {
            ...entry,
            status: "failed" as const,
            error: job.error ?? "Unknown error",
          };
        }
        return entry;
      });

      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    const hasGenerating = refImages.some((entry) => entry.status === "generating");
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
  }, [pollGeneratingJobs, refImages]);

  const selectedRef = refImages[selectedRefIndex] ?? null;
  const selectedRefFileId = selectedRef?.status === "completed" ? selectedRef.fileId : null;
  const totalRefCost = refImages
    .filter((entry) => entry.status === "completed")
    .reduce((sum, entry) => sum + entry.cost, 0);
  const hasAnyCompleted = refImages.some((entry) => entry.status === "completed");
  const latestEntry = refImages[refImages.length - 1] ?? null;
  const isGeneratingReference = latestEntry?.status === "generating";
  const estimatedRefSpend = totalRefCost > 0 ? totalRefCost : imageCost;
  const totalProjectedCost = estimatedRefSpend + videoCost + textErasureCost;
  const canGenerateReference = Boolean(videoInfo && avatarId) && !isSubmitting;
  const isReferenceTabLocked = refImages.length === 0 && !isGeneratingReference && !submitError;

  const clearReferenceState = useCallback(() => {
    setRefImages([]);
    setSelectedRefIndex(0);
    setRefPrompt(prompt);
    setSubmitError(null);
  }, [prompt]);

  const getNextSetupTab = useCallback(
    (nextAvatarId?: string | null, nextVideoInfo?: TikTokVideoInfo | null) => {
      const resolvedVideoInfo = nextVideoInfo ?? videoInfo;
      const resolvedAvatarId = nextAvatarId ?? avatarId;

      if (!resolvedVideoInfo) return "source";
      if (!resolvedAvatarId) return "avatar";
      return "settings";
    },
    [avatarId, videoInfo]
  );

  const handleVideoDownloaded = (info: TikTokVideoInfo | null) => {
    clearReferenceState();
    setActiveJobQuery(null);
    setVideoInfo(info);
    setOriginalVideoInfo(info);
    setShowTrimmer(false);
    setActiveTab(info ? getNextSetupTab(undefined, info) : "source");
  };

  const handleTrimmed = (info: {
    localPath: string;
    filename: string;
    durationSec: number;
    width: number;
    height: number;
  }) => {
    const updated = videoInfo ? { ...videoInfo, ...info } : null;
    clearReferenceState();
    setActiveJobQuery(null);
    setVideoInfo(updated);
    setOriginalVideoInfo(updated);
    setShowTrimmer(false);
    setSourcesRefreshKey((value) => value + 1);
    setActiveTab(getNextSetupTab(undefined, updated));
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
    setActiveTab("reference");

    try {
      const result = await apiPost<{ id: string }>("/api/ugc-clone/reference-image", {
        tiktokVideoPath: videoInfo.localPath,
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

      const nextIndex = refImagesRef.current.length;
      setSelectedRefIndex(nextIndex);
      setRefImages((prev) => [...prev, newEntry]);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to generate reference image.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateRefImage = () => {
    setRefPrompt(prompt);
    submitRefImageGeneration(prompt);
  };

  const handleRegenerateRefImage = () => {
    submitRefImageGeneration(refPrompt);
  };

  const handleApproveAndGenerate = async () => {
    if (!videoInfo || !avatarId || !selectedRefFileId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await apiPost<{ id: string }>("/api/ugc-clone/generate", {
        tiktokVideoPath: videoInfo.localPath,
        avatarId,
        keepOriginalSound,
        removeTextOverlays,
        model: selectedModel,
        referenceImageFileId: selectedRefFileId,
        durationSec,
      });
      setActiveJobQuery(result.id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to generate clone.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryActiveJob = async () => {
    const nextId = await retryJob();
    if (nextId) {
      setActiveJobQuery(nextId);
    }
  };

  const resetReferenceSession = () => {
    clearReferenceState();
    setActiveTab(getNextSetupTab());
  };

  const handleAvatarSelect = (id: string) => {
    if (id !== avatarId) {
      clearReferenceState();
      setActiveJobQuery(null);
    }
    const nextAvatarId = id || null;
    setAvatarId(nextAvatarId);
    setActiveTab(nextAvatarId ? getNextSetupTab(nextAvatarId) : "avatar");
  };

  const sourcePreviewSrc = videoInfo
    ? `/api/ugc-clone/preview?path=${encodeURIComponent(videoInfo.localPath)}`
    : null;

  const actionCard =
    activeJobId ? (
      {
        eyebrow: "Viewing Clone",
        title: activeJob ? `Clone ${activeJob.id.slice(0, 8)} is inline` : "Loading the selected clone",
        description: activeJob
          ? activeJob.status === "completed"
            ? "Review the result here, then jump back into the editor for another pass."
            : activeJob.status === "failed"
              ? "The job state is pinned here until you retry or return to the editor."
              : "Stay in the workspace while the motion transfer finishes in the stage."
          : "The stage is fetching the latest job state before you jump back into editing.",
        primaryLabel: "Back to Editor",
        primaryDisabled: false,
        onPrimary: () => setActiveJobQuery(null),
        secondaryLabel: null as string | null,
        onSecondary: null as (() => void) | null,
      }
    ) : isGeneratingReference ? (
      {
        eyebrow: "Reference Running",
        title: "Generating your next scene composite",
        description: "The stage updates automatically while the reference image job runs.",
        primaryLabel: "Generating Reference...",
        primaryDisabled: true,
        onPrimary: () => undefined,
        secondaryLabel: refImages.length > 0 ? "Reset References" : null,
        onSecondary: refImages.length > 0 ? resetReferenceSession : null,
      }
    ) : hasAnyCompleted ? (
      {
        eyebrow: "Reference Approved",
        title: "The workspace is ready for the final clone",
        description: "Use the selected reference to generate the UGC clone without leaving the page.",
        primaryLabel: isSubmitting ? "Generating Clone..." : "Approve & Generate Clone",
        primaryDisabled: !selectedRefFileId || isSubmitting,
        onPrimary: handleApproveAndGenerate,
        secondaryLabel: "Reset References",
        onSecondary: resetReferenceSession,
      }
    ) : (
      {
        eyebrow: "Reference Setup",
        title: "Generate the first integrated reference",
        description: "Once the source and avatar are ready, create a scene composite to review on the stage.",
        primaryLabel: isSubmitting ? "Generating Reference..." : "Generate Reference",
        primaryDisabled: !canGenerateReference,
        onPrimary: handleGenerateRefImage,
        secondaryLabel: null as string | null,
        onSecondary: null as (() => void) | null,
      }
    );

  const workspaceSteps = [
    {
      key: "source" as const,
      label: "Source",
      ready: Boolean(videoInfo),
      detail: videoInfo ? `${durationSec}s clip ready` : "Pick a TikTok",
      disabled: false,
    },
    {
      key: "avatar" as const,
      label: "Avatar",
      ready: Boolean(avatarId),
      detail: avatarId ? "Identity locked" : "Choose a face",
      disabled: false,
    },
    {
      key: "settings" as const,
      label: "Scene",
      ready: Boolean(prompt.trim()),
      detail: prompt.trim() ? "Direction set" : "Add scene direction",
      disabled: false,
    },
    {
      key: "reference" as const,
      label: "Reference",
      ready: Boolean(selectedRefFileId),
      detail: selectedRefFileId
        ? "Ready for clone"
        : refImages.length > 0 || isGeneratingReference
          ? "Review the latest pass"
          : "Generate first pass",
      disabled: isReferenceTabLocked,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(400px,440px)]">
        <div className="space-y-3">
          <div className="rounded-[34px] border border-border bg-card/85 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
                  Workspace Stage
                </p>
                <h2 className="mt-2 text-[1.75rem] font-semibold">
                  {activeJobId
                    ? "Latest Clone"
                    : selectedRef
                      ? "Reference Review"
                      : videoInfo
                        ? "Source Preview"
                        : "Start with a TikTok"}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-border/70 bg-background/40 px-3 py-1 text-muted-foreground">
                  {modelName}
                </span>
                {videoInfo ? (
                  <span className="rounded-full border border-accent-green/20 bg-accent-green/10 px-3 py-1 text-accent-green">
                    {durationSec}s source
                  </span>
                ) : null}
                {selectedRef ? (
                  <span className="rounded-full border border-accent-coral/20 bg-accent-coral/10 px-3 py-1 text-accent-coral">
                    {refImages.length} refs
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-[30px] border border-border/60 bg-background/35 p-3 sm:p-4">
              {activeJobId ? (
                <UGCCloneJobStage
                  key={activeJobId}
                  job={activeJob}
                  isLoading={isJobLoading}
                  error={jobError}
                  isRetrying={isRetrying}
                  onRetry={handleRetryActiveJob}
                  className="h-[52vh] min-h-[300px] max-h-[580px] shadow-none lg:h-[44vh]"
                />
              ) : selectedRef ? (
                <div className="flex h-[52vh] min-h-[300px] max-h-[580px] items-center justify-center rounded-[28px] border border-border/60 bg-card/70 p-4 lg:h-[44vh]">
                  {selectedRef.status === "generating" ? (
                    <div className="text-center">
                      <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-muted border-t-accent-coral" />
                      <p className="text-sm font-semibold">Generating reference image</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        The avatar and scene composite will drop into this stage automatically.
                      </p>
                    </div>
                  ) : null}

                  {selectedRef.status === "failed" ? (
                    <div className="max-w-sm rounded-[24px] border border-destructive/30 bg-destructive/10 px-6 py-5 text-center">
                      <p className="text-sm font-semibold text-destructive">Reference generation failed</p>
                      {selectedRef.error ? (
                        <p className="mt-2 text-xs text-destructive/80">{selectedRef.error}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedRef.status === "completed" && selectedRef.fileId ? (
                    <div className="flex h-full w-full max-w-[420px] items-center justify-center overflow-hidden rounded-[24px] border border-border/60 bg-background/40 p-4">
                      <img
                        src={`/api/files/${selectedRef.fileId}`}
                        alt="Reference image"
                        className="max-h-full w-full rounded-[20px] object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              ) : videoInfo && sourcePreviewSrc ? (
                <div className="flex h-[52vh] min-h-[300px] max-h-[580px] items-center justify-center rounded-[28px] border border-border/60 bg-card/70 p-4 lg:h-[44vh]">
                  <div className="flex h-full w-full max-w-[400px] items-center justify-center overflow-hidden rounded-[24px] border border-border/60 bg-background/40 p-4">
                    <video
                      src={sourcePreviewSrc}
                      controls
                      muted
                      playsInline
                      className="max-h-full w-full rounded-[20px] object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-[52vh] min-h-[300px] max-h-[580px] items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-card/50 px-6 py-10 text-center lg:h-[44vh]">
                  <div className="max-w-sm">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent-green/10 text-accent-green">
                      <Film className="size-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Everything stays in one workspace</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Drop in a TikTok, choose an avatar, and iterate on references without getting routed through separate pages.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {refImages.length > 1 && !activeJobId ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                    Reference Variants
                  </p>
                  <p className="text-xs text-muted-foreground">Tap to swap the stage.</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {refImages.map((entry, index) => (
                    <button
                      key={entry.jobId}
                      type="button"
                      onClick={() => setSelectedRefIndex(index)}
                      className={cn(
                        "relative shrink-0 overflow-hidden rounded-[20px] border-2 p-1 transition-all",
                        selectedRefIndex === index
                          ? "border-accent-coral bg-accent-coral/5"
                          : "border-border/70 bg-background/30 hover:border-foreground/20"
                      )}
                    >
                      <div className="flex size-16 items-center justify-center overflow-hidden rounded-[16px] bg-muted">
                        {entry.status === "completed" && entry.fileId ? (
                          <img
                            src={`/api/files/${entry.fileId}`}
                            alt={`Reference ${index + 1}`}
                            className="size-full object-cover"
                          />
                        ) : entry.status === "generating" ? (
                          <Loader2 className="size-4 animate-spin text-accent-coral" />
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-destructive">
                            Failed
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <WorkspaceStat
              label="Reference Spend"
              value={formatCost(estimatedRefSpend)}
              detail={refImages.length > 0 ? `${refImages.length} variations so far` : "First reference included"}
              accent="green"
            />
            <WorkspaceStat
              label="Video Engine"
              value={`${durationSec}s`}
              detail={`Estimated ${formatCost(videoCost)} at $${pricePerSec}/s`}
              accent="coral"
            />
            <WorkspaceStat
              label="Projected Total"
              value={formatCost(totalProjectedCost)}
              detail={removeTextOverlays ? `Includes ${formatCost(textErasureCost)} text cleanup` : "Before final clone run"}
              accent="blue"
            />
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-3">
          <div className="overflow-hidden rounded-[30px] border border-border bg-card/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)] xl:flex xl:h-[calc(100vh-11rem)] xl:flex-col xl:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Workspace Controls
                </p>
                <h3 className="mt-2 text-xl font-semibold">{actionCard.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{actionCard.description}</p>
              </div>
              <div className="hidden rounded-[22px] border border-border/60 bg-background/40 px-4 py-3 text-right sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Cost Projection
                </p>
                <p className="mt-2 text-2xl font-semibold">{formatCost(totalProjectedCost)}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {workspaceSteps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => !step.disabled && setActiveTab(step.key)}
                  disabled={step.disabled}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors",
                    activeTab === step.key
                      ? "border-foreground/20 bg-background/70 text-foreground"
                      : "border-border/70 bg-background/30 text-muted-foreground hover:text-foreground",
                    step.disabled && "cursor-not-allowed opacity-45"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                      step.ready ? "bg-accent-green/15 text-accent-green" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step.ready ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span>{step.label}</span>
                  <span className="hidden text-[10px] text-muted-foreground sm:inline">{step.detail}</span>
                </button>
              ))}
            </div>

            {submitError ? (
              <div className="mt-4 rounded-[20px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            ) : null}

            {activeJob ? (
              <div className="mt-4 shrink-0">
                <UGCCloneJobInfo
                  job={activeJob}
                  isRetrying={isRetrying}
                  onRetry={activeJob.status === "failed" ? handleRetryActiveJob : undefined}
                  onClear={() => setActiveJobQuery(null)}
                  clearLabel="Back to Editor"
                  permalinkHref={`/ugc-clone/${activeJob.id}`}
                />
              </div>
            ) : null}

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as PanelKey)}
              className="mt-4 min-h-0 flex-1"
            >
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-[22px] bg-background/35 p-1">
                <TabsTrigger value="source" className="min-w-max rounded-[16px] px-3 py-2 text-xs font-semibold">
                  01 Source
                </TabsTrigger>
                <TabsTrigger value="avatar" className="min-w-max rounded-[16px] px-3 py-2 text-xs font-semibold">
                  02 Avatar
                </TabsTrigger>
                <TabsTrigger value="settings" className="min-w-max rounded-[16px] px-3 py-2 text-xs font-semibold">
                  03 Scene
                </TabsTrigger>
                <TabsTrigger
                  value="reference"
                  disabled={isReferenceTabLocked}
                  className="min-w-max rounded-[16px] px-3 py-2 text-xs font-semibold"
                >
                  04 Reference
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 min-h-0 flex-1 rounded-[26px] border border-border/60 bg-background/30 p-4 sm:p-5 xl:overflow-hidden">
                <TabsContent value="source" className="space-y-4 xl:h-full xl:overflow-y-auto xl:pr-1">
                  <ComposerPanelHeading
                    eyebrow="01 / TikTok Source"
                    title="Pick or swap the motion source"
                    description="Paste a new TikTok or reuse a recent clip without leaving this contained panel."
                    detail={videoInfo ? `${durationSec}s selected` : "No source yet"}
                  />

                  <TikTokInput
                    onDownloaded={handleVideoDownloaded}
                    videoInfo={videoInfo}
                    refreshKey={sourcesRefreshKey}
                    onTrimRequest={() => setShowTrimmer((value) => !value)}
                    isTrimActive={showTrimmer}
                  />

                  {videoInfo && showTrimmer && originalVideoInfo ? (
                    <div className="rounded-[24px] border border-border/70 bg-background/30 p-4">
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
                  ) : null}
                </TabsContent>

                <TabsContent value="avatar" className="space-y-4 xl:h-full xl:overflow-y-auto xl:pr-1">
                  <ComposerPanelHeading
                    eyebrow="02 / Avatar"
                    title="Keep identity locked while you iterate"
                    description="Upload, generate, or import a face inline, then keep that identity selected while you move through the rest of the flow."
                    detail={avatarId ? "Avatar in use" : "Choose one to continue"}
                  />

                  <AvatarPicker selectedId={avatarId} onSelect={handleAvatarSelect} />
                </TabsContent>

                <TabsContent value="settings" className="space-y-5 xl:h-full xl:overflow-y-auto xl:pr-1">
                  <ComposerPanelHeading
                    eyebrow="03 / Scene & Motion"
                    title="Tune the clone before generating"
                    description="Set the motion engine, scene direction, and cleanup toggles without dropping below the fold."
                    detail={prompt ? `${prompt.length}/500 scene prompt` : "Scene prompt optional"}
                  />

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                      Motion Engine
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {([
                        { id: "kling-3.0-motion" as const, label: "Kling 3.0", price: "$0.126/s" },
                        { id: "kling-3.0-pro-motion" as const, label: "Kling 3.0 Pro", price: "$0.168/s" },
                        { id: "kling-2.6-motion" as const, label: "Kling 2.6", price: "$0.07/s" },
                      ]).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedModel(option.id)}
                          className={cn(
                            "rounded-[22px] border px-4 py-3 text-left transition-colors",
                            selectedModel === option.id
                              ? "border-accent-coral/30 bg-accent-coral/10 text-accent-coral"
                              : "border-border/70 bg-background/30 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className="mt-1 block text-[11px] font-mono opacity-80">{option.price}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedModel === "kling-3.0-pro-motion"
                        ? "Higher fidelity motion transfer with the same integrated review flow."
                        : selectedModel === "kling-2.6-motion"
                          ? "Cheaper output, but weaker element binding."
                          : "Balanced default with better identity preservation for UGC clones."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                        Scene Direction
                      </label>
                      <span className="text-[10px] font-mono text-muted-foreground">{prompt.length}/500</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {PROMPT_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setPrompt(preset.prompt)}
                          className={cn(
                            "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                            prompt === preset.prompt
                              ? "border-accent-coral/30 bg-accent-coral/10 text-accent-coral"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      placeholder="Describe lighting, framing, wardrobe, and environment details..."
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value.slice(0, 500))}
                      maxLength={500}
                      className="min-h-[110px] resize-none rounded-[24px] border border-border bg-muted/50 p-4 text-sm transition-all focus:border-accent-coral/20 focus:bg-card"
                    />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Reference generation uses this direction to place your avatar in the right environment. The TikTok still drives the motion.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-[22px] border border-border/70 bg-background/30 p-4">
                      <div className="flex items-start gap-3">
                        <Volume2 className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold">Keep Original Sound</p>
                          <p className="text-xs text-muted-foreground">Preserve the TikTok audio track in the final clone.</p>
                        </div>
                      </div>
                      <Switch checked={keepOriginalSound} onCheckedChange={setKeepOriginalSound} />
                    </div>

                    <div className="flex items-center justify-between rounded-[22px] border border-border/70 bg-background/30 p-4">
                      <div className="flex items-start gap-3">
                        <ImageIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold">Remove Text Overlays</p>
                          <p className="text-xs text-muted-foreground">
                            Clean hook text and captions before motion transfer.
                            {removeTextOverlays ? (
                              <span className="text-accent-green"> +{formatCost(textErasureCost)}</span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <Switch checked={removeTextOverlays} onCheckedChange={setRemoveTextOverlays} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="reference" className="space-y-4 xl:h-full xl:overflow-y-auto xl:pr-1">
                  <ComposerPanelHeading
                    eyebrow="04 / Reference Review"
                    title="Refine the scene without leaving the studio"
                    description="Edit the prompt, regenerate variants, and keep the chosen reference pinned to the stage."
                    detail={
                      selectedRefFileId
                        ? `${refImages.length} variants available`
                        : isGeneratingReference
                          ? "Generating reference"
                          : "Generate a first pass below"
                    }
                  />

                  {refImages.length > 0 || submitError ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PenLine className="size-3.5 text-muted-foreground" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                              Reference Prompt
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">{refPrompt.length}/500</span>
                        </div>
                        <Textarea
                          placeholder="Add wardrobe, expression, or environmental cues for the reference image..."
                          value={refPrompt}
                          onChange={(event) => setRefPrompt(event.target.value.slice(0, 500))}
                          maxLength={500}
                          className="min-h-[110px] resize-none rounded-[24px] border border-border bg-muted/50 p-4 text-sm transition-all focus:border-accent-coral/20 focus:bg-card"
                        />
                        <Button
                          size="lg"
                          onClick={handleRegenerateRefImage}
                          disabled={isSubmitting || isGeneratingReference || !videoInfo || !avatarId}
                          className="h-auto rounded-full bg-background px-4 py-2.5 text-foreground hover:bg-muted"
                        >
                          {isSubmitting || isGeneratingReference ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-4" />
                              Regenerate Reference
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="rounded-[24px] border border-border/70 bg-background/30 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                          Cost Breakdown
                        </p>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Reference images</span>
                            <span className="font-mono">{formatCost(estimatedRefSpend)}</span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Video generation</span>
                            <span className="font-mono">{formatCost(videoCost)}</span>
                          </div>
                          {removeTextOverlays ? (
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>Text cleanup</span>
                              <span className="font-mono">{formatCost(textErasureCost)}</span>
                            </div>
                          ) : null}
                          <div className="flex items-center justify-between border-t border-border/70 pt-2 text-base font-semibold">
                            <span>Total</span>
                            <span>{formatCost(totalProjectedCost)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-border/70 bg-background/20 px-4 py-8 text-center text-sm text-muted-foreground">
                      The reference tab becomes useful after you generate the first scene composite.
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            <div className="mt-4 border-t border-border/60 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {actionCard.eyebrow}
                  </p>
                  <p className="mt-2 text-base font-semibold">{formatCost(totalProjectedCost)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasAnyCompleted
                      ? "The selected reference is ready to send to motion transfer."
                      : canGenerateReference
                        ? "Source and avatar are ready. Generate a reference next."
                        : "Finish the source and avatar steps to unlock reference generation."}
                  </p>
                </div>
                <div className="rounded-full border border-accent-green/20 bg-accent-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-green">
                  {modelName}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  onClick={actionCard.onPrimary}
                  disabled={actionCard.primaryDisabled}
                  className="h-auto flex-1 rounded-full bg-accent-coral px-5 py-3 text-white hover:bg-[#ff6540]"
                >
                  {actionCard.primaryLabel}
                  {activeJobId ? null : hasAnyCompleted ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
                </Button>

                {actionCard.secondaryLabel && actionCard.onSecondary ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={actionCard.onSecondary}
                    className="h-auto rounded-full px-5 py-3"
                  >
                    {actionCard.secondaryLabel}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <UGCCloneQueue activeJobId={activeJobId} onSelectJob={setActiveJobQuery} />

      <div className="fixed inset-x-4 bottom-4 z-30 md:hidden">
        <div className="rounded-[24px] border border-border bg-card/95 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                {actionCard.eyebrow}
              </p>
              <p className="mt-1 text-sm font-medium">{formatCost(totalProjectedCost)}</p>
            </div>
            <span className="rounded-full border border-accent-green/20 bg-accent-green/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-green">
              {modelName}
            </span>
          </div>
          <Button
            size="lg"
            onClick={actionCard.onPrimary}
            disabled={actionCard.primaryDisabled}
            className="h-auto w-full rounded-full bg-accent-coral px-5 py-3 text-white hover:bg-[#ff6540]"
          >
            {actionCard.primaryLabel}
            {activeJobId ? null : hasAnyCompleted ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ComposerPanelHeading({
  eyebrow,
  title,
  description,
  detail,
}: {
  eyebrow: string;
  title: string;
  description: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-md">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>
        <h4 className="mt-2 text-lg font-semibold">{title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {detail ? (
        <span className="rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {detail}
        </span>
      ) : null}
    </div>
  );
}

function WorkspaceStat({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent: "green" | "coral" | "blue";
}) {
  const accentClasses =
    accent === "green"
      ? "border-accent-green/20 bg-accent-green/10 text-accent-green"
      : accent === "coral"
        ? "border-accent-coral/20 bg-accent-coral/10 text-accent-coral"
        : "border-accent-blue/20 bg-accent-blue/10 text-accent-blue";

  return (
    <div className="rounded-[26px] border border-border bg-card/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]", accentClasses)}>
          Live
        </span>
      </div>
      <p className="mt-2.5 text-xl font-semibold">{value}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
