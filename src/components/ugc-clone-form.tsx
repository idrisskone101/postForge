"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TikTokInput, type TikTokVideoInfo } from "@/components/tiktok-input";
import { VideoTrimmer } from "@/components/video-trimmer";
import { AvatarPicker } from "@/components/avatar-picker";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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

export function UGCCloneForm() {
  const router = useRouter();

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

  // Step 3: Settings
  const [prompt, setPrompt] = useState("");
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [removeTextOverlays, setRemoveTextOverlays] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"kling-3.0-motion" | "kling-3.0-pro-motion" | "kling-2.6-motion">("kling-3.0-motion");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const durationSec = videoInfo?.durationSec ?? 5;
  const videoCost = calculateEstimatedCost(selectedModel, { durationSec });
  const imageCost = calculateEstimatedCost("nano-banana-2", { numImages: 1 });
  const pricePerSec = getModel(selectedModel)?.pricing.amount ?? 0;
  const textErasureCost = removeTextOverlays ? BRIA_ERASER_COST_PER_SEC * durationSec : 0;

  const canSubmit = videoInfo && avatarId && !isSubmitting;

  // Poll for any "generating" ref images
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refImagesRef = useRef(refImages);
  useEffect(() => { refImagesRef.current = refImages; });

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
  }, []);

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

  const handleVideoDownloaded = (info: TikTokVideoInfo | null) => {
    setVideoInfo(info);
    setOriginalVideoInfo(info);
    setShowTrimmer(false);
  };

  const handleTrimmed = (info: { localPath: string; filename: string; durationSec: number; width: number; height: number }) => {
    // Update both videoInfo and originalVideoInfo so the trimmed version
    // becomes the canonical source (the DB record was already updated by the API)
    const updated = { ...videoInfo, ...info };
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
  };

  const modelName = selectedModel === "kling-3.0-motion" ? "Kling 3.0" : "Kling 2.6";

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: TikTok + Avatar */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: TikTok URL */}
          <div className="launch-card bg-card p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest">
                01 / TikTok Source
              </span>
            </div>
            <TikTokInput onDownloaded={handleVideoDownloaded} videoInfo={videoInfo} refreshKey={sourcesRefreshKey} />

            {/* Trim button — show after download, when trimmer is not open */}
            {videoInfo && !showTrimmer && (
              <button
                type="button"
                onClick={() => setShowTrimmer(true)}
                className="mt-4 flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-foreground/20 hover:text-foreground"
              >
                <Scissors className="size-3.5" />
                Trim Video
                {originalVideoInfo && videoInfo.localPath !== originalVideoInfo.localPath && (
                  <span className="ml-1 rounded-md bg-accent-coral/10 px-2 py-0.5 text-[10px] font-bold text-accent-coral">
                    trimmed
                  </span>
                )}
              </button>
            )}

            {/* Video Trimmer */}
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
          </div>

          {/* Step 2: Avatar */}
          <div className="launch-card bg-card p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest">
                02 / Choose Avatar
              </span>
            </div>
            <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 3: Settings */}
          <div className="launch-card bg-card p-6 border border-border">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest">
                03 / Settings
              </span>
            </div>

            <div className="space-y-6">
              {/* Model Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Motion Engine
                </label>
                <div className="flex gap-2">
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
                        "flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-all duration-150",
                        selectedModel === opt.id
                          ? "border-accent-coral bg-accent-coral/5 text-accent-coral"
                          : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      )}
                    >
                      <span className="block">{opt.label}</span>
                      <span className="block text-[10px] mt-0.5 opacity-70 font-mono">{opt.price}</span>
                    </button>
                  ))}
                </div>
                {selectedModel === "kling-3.0-motion" && (
                  <p className="text-[10px] text-accent-coral">
                    V3 includes facial element binding for better identity preservation.
                  </p>
                )}
                {selectedModel === "kling-3.0-pro-motion" && (
                  <p className="text-[10px] text-accent-green">
                    V3 Pro — higher quality output with improved motion fidelity.
                  </p>
                )}
                {selectedModel === "kling-2.6-motion" && (
                  <p className="text-[10px] text-muted-foreground">
                    V2.6 is cheaper but does not support element binding.
                  </p>
                )}
              </div>

              {/* Prompt Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Scene Direction
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {prompt.length} / 500
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPrompt(preset.prompt)}
                      className={cn(
                        "whitespace-nowrap border px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150",
                        prompt === preset.prompt
                          ? "border-accent-coral bg-accent-coral/5 text-accent-coral"
                          : "border-border bg-muted text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <Textarea
                  placeholder="Describe the scene: lighting, framing, environment, style..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                  maxLength={500}
                  className="min-h-[100px] resize-none bg-muted/50 border border-border focus:border-accent-coral/20 focus:bg-card rounded-lg p-4 text-sm transition-all duration-150"
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">Context only</span>: lighting, environment, framing. Motion comes from the reference video.
                  {selectedModel === "kling-3.0-motion" && (
                    <span className="text-accent-coral"> V3 auto-binds your avatar&apos;s face.</span>
                  )}
                </p>
              </div>

              {/* Keep Original Sound */}
              <div className="flex items-center justify-between rounded-md border border-border p-4">
                <div className="flex items-center gap-3">
                  <Volume2 className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Keep Original Sound</p>
                    <p className="text-xs text-muted-foreground">
                      Preserve the TikTok&apos;s audio track
                    </p>
                  </div>
                </div>
                <Switch
                  checked={keepOriginalSound}
                  onCheckedChange={setKeepOriginalSound}
                />
              </div>

              {/* Remove Text Overlays */}
              <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Remove Text Overlays</p>
                  <p className="text-xs text-muted-foreground">
                    Strip hook text &amp; captions before motion control
                    {removeTextOverlays && (
                      <span className="text-accent-green"> (+{formatCost(textErasureCost)})</span>
                    )}
                  </p>
                </div>
                <Switch
                  checked={removeTextOverlays}
                  onCheckedChange={setRemoveTextOverlays}
                />
              </div>
            </div>
          </div>

          {/* Cost Preview */}
          <div className="bg-muted rounded-lg p-6 border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Cost Estimate
            </p>
            <div className="flex justify-between items-end">
              <span className="text-2xl font-bold tracking-tight">
                {formatCost(imageCost + videoCost + textErasureCost)}
              </span>
              <div className="text-right text-[10px] space-y-0.5 text-muted-foreground font-mono">
                <p>Ref image: {formatCost(imageCost)}</p>
                <p>Video: {durationSec}s @ ${pricePerSec}/s</p>
                {removeTextOverlays && (
                  <p>Text removal: {formatCost(textErasureCost)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FloatingToolbar
        summary={
          <>
            <ToolbarHeading>Config</ToolbarHeading>
            <ToolbarDivider />
            <ToolbarLabel>{modelName}</ToolbarLabel>
            <ToolbarDivider />
            <ToolbarLabel>{keepOriginalSound ? "Original Audio" : "No Audio"}</ToolbarLabel>
            {videoInfo && (
              <>
                <ToolbarDivider />
                <ToolbarLabel>{durationSec}s</ToolbarLabel>
              </>
            )}
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
          onClick={handleGenerateRefImage}
          disabled={!canSubmit}
          className="bg-accent-coral text-white font-bold px-8 py-2.5 rounded-md text-sm hover:bg-[#ff6540] transition-all duration-150 h-auto flex items-center gap-2 uppercase tracking-wider"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              Generate Reference
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </FloatingToolbar>
    </>
  );
}
