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
  MessageSquare,
  Check,
  RotateCcw,
  ImageIcon,
  ArrowLeft,
  Sparkles,
  PenLine,
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
      // Don't send the scene direction prompt to video generation when using a
      // reference image — it already captures the scene. Extra prompt text is noise
      // that confuses the motion control model.
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

  // ─── Review Phase ───────────────────────────────────────────────────
  if (phase === "reviewing") {
    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Image Preview + History */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToInput}
                className="flex size-10 items-center justify-center rounded-full bg-card border border-border hover:bg-muted transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div>
                <h2 className="text-xl font-semibold">Review Reference Image</h2>
                <p className="text-sm text-muted-foreground">
                  Your avatar composited into the TikTok&apos;s environment
                </p>
              </div>
            </div>

            {/* Main Preview */}
            <div className="launch-card bg-card border border-border rounded-[32px] overflow-hidden">
              <div className="relative min-h-[500px] flex items-center justify-center">
                {selectedRef?.status === "generating" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="size-14 animate-spin rounded-full border-4 border-muted border-t-accent-green" />
                    </div>
                    <p className="text-sm font-medium">Generating reference image...</p>
                    <p className="text-xs text-muted-foreground">
                      Compositing your avatar into the video&apos;s environment
                    </p>
                  </div>
                )}

                {selectedRef?.status === "failed" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-6 py-4 text-center">
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
                      className="max-w-full max-h-[600px] mx-auto rounded-2xl object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail History — show when there are 2+ images */}
            {refImages.length > 1 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Generated Variants ({refImages.length})
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {refImages.map((entry, i) => (
                    <button
                      key={entry.jobId}
                      type="button"
                      onClick={() => setSelectedRefIndex(i)}
                      className={cn(
                        "relative shrink-0 size-20 rounded-xl border-2 overflow-hidden transition-all",
                        selectedRefIndex === i
                          ? "border-accent-green shadow-[0_0_12px_rgba(123,165,67,0.3)]"
                          : "border-border hover:border-accent-green/50 opacity-70 hover:opacity-100"
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
                          <Loader2 className="size-5 animate-spin text-accent-green" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-destructive/10">
                          <span className="text-[10px] text-destructive">Failed</span>
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
            <div className="launch-card bg-card p-8 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <PenLine className="size-4 text-accent-green" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Reference Image Prompt
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                Edit the prompt and regenerate to refine the reference image. Describe how your avatar should appear in the scene — clothing, pose, expression, environment details.
              </p>
              <Textarea
                placeholder="e.g. The person is wearing a casual blue hoodie, sitting at a coffee shop table, warm afternoon light coming through windows..."
                value={refPrompt}
                onChange={(e) => setRefPrompt(e.target.value.slice(0, 500))}
                maxLength={500}
                className="min-h-[120px] resize-none bg-muted border-2 border-transparent focus:border-accent-green/30 focus:bg-card rounded-2xl p-4 text-sm transition-all"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {refPrompt.length}/500
                </span>
                <Button
                  size="sm"
                  onClick={handleRegenerateRefImage}
                  disabled={isSubmitting || isGenerating}
                  className="bg-accent-green/15 text-accent-green hover:bg-accent-green/25 rounded-full px-5 text-xs font-bold h-8 flex items-center gap-2"
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
            <div className="bg-accent-green rounded-[32px] p-8 text-white shadow-[0_20px_40px_rgba(123,165,67,0.3)] relative overflow-hidden">
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-xl" />
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-4">
                  Cost Breakdown
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/80">
                      Reference images ({refImages.filter((r) => r.status === "completed").length} generated)
                    </span>
                    <span className="font-medium">{formatCost(totalRefCost || imageCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/80">Video generation (estimated)</span>
                    <span className="font-medium">{formatCost(videoCost)}</span>
                  </div>
                  {removeTextOverlays && (
                    <div className="flex justify-between">
                      <span className="text-white/80">Text overlay removal</span>
                      <span className="font-medium">{formatCost(textErasureCost)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/20 pt-2 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="text-2xl font-extrabold">
                      {formatCost((totalRefCost || imageCost) + videoCost + textErasureCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected image prompt label */}
            {selectedRef && selectedRef.prompt && (
              <div className="rounded-2xl bg-muted/50 border border-border p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Prompt used for #{selectedRefIndex + 1}
                </p>
                <p className="text-xs text-foreground/80 italic leading-relaxed line-clamp-3">
                  {selectedRef.prompt || "(no additional prompt)"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Bar */}
        <div className="fixed bottom-0 left-0 md:left-24 right-0 h-auto min-h-24 bg-card/90 backdrop-blur-xl border-t border-border px-6 md:px-12 z-50">
          <div className="max-w-[1200px] mx-auto h-full flex flex-col items-end justify-center gap-2 py-4">
            {submitError && (
              <div className="w-full rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                variant="outline"
                onClick={handleBackToInput}
                className="rounded-full px-8 py-4 text-lg h-auto flex items-center gap-3"
              >
                <ArrowLeft className="size-5" />
                Back
              </Button>
              <Button
                size="lg"
                onClick={handleApproveAndGenerate}
                disabled={!hasAnyCompleted || !selectedRefFileId || isSubmitting}
                className="bg-accent-green text-white font-extrabold px-12 py-4 rounded-full text-lg shadow-[0_8px_24px_rgba(123,165,67,0.3)] hover:scale-105 hover:brightness-110 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] h-auto flex items-center gap-3"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  <>
                    Approve & Generate Video
                    <Check className="size-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Input Phase ────────────────────────────────────────────────────
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: TikTok + Avatar */}
        <div className="lg:col-span-7 space-y-8">
          {/* Step 1: TikTok URL */}
          <div className="launch-card bg-card p-8 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex size-8 items-center justify-center rounded-full bg-accent-green/15 text-accent-green text-sm font-bold">
                1
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest">
                TikTok Source
              </h3>
            </div>
            <TikTokInput onDownloaded={handleVideoDownloaded} videoInfo={videoInfo} refreshKey={sourcesRefreshKey} />

            {/* Trim button — show after download, when trimmer is not open */}
            {videoInfo && !showTrimmer && (
              <button
                type="button"
                onClick={() => setShowTrimmer(true)}
                className="mt-4 flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground transition-all hover:border-accent-green/50 hover:text-accent-green"
              >
                <Scissors className="size-3.5" />
                Trim Video
                {originalVideoInfo && videoInfo.localPath !== originalVideoInfo.localPath && (
                  <span className="ml-1 rounded-full bg-accent-green/15 px-2 py-0.5 text-[10px] font-bold text-accent-green">
                    trimmed
                  </span>
                )}
              </button>
            )}

            {/* Video Trimmer */}
            {videoInfo && showTrimmer && originalVideoInfo && (
              <div className="mt-4">
                <VideoTrimmer
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
          <div className="launch-card bg-card p-8 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex size-8 items-center justify-center rounded-full bg-accent-green/15 text-accent-green text-sm font-bold">
                2
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest">
                Choose Avatar
              </h3>
            </div>
            <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-5 space-y-8">
          {/* Step 3: Settings */}
          <div className="launch-card bg-card p-8 border border-border">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex size-8 items-center justify-center rounded-full bg-accent-green/15 text-accent-green text-sm font-bold">
                3
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest">
                Settings
              </h3>
            </div>

            <div className="space-y-8">
              {/* Model Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Model
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
                        "flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-all",
                        selectedModel === opt.id
                          ? "border-accent-green bg-accent-green/10 text-accent-green"
                          : "border-border text-muted-foreground hover:border-accent-green/50"
                      )}
                    >
                      <span className="block">{opt.label}</span>
                      <span className="block text-[10px] mt-0.5 opacity-70">{opt.price}</span>
                    </button>
                  ))}
                </div>
                {selectedModel === "kling-3.0-motion" && (
                  <p className="text-[10px] text-accent-green">
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
                    V2.6 is cheaper but does not support element binding. Facial consistency may vary.
                  </p>
                )}
              </div>

              {/* Prompt Presets */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Scene Direction
                  </label>
                  <MessageSquare className="size-3 text-muted-foreground" />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPrompt(preset.prompt)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[10px] font-medium transition-all",
                        prompt === preset.prompt
                          ? "border-accent-green bg-accent-green/10 text-accent-green"
                          : "border-border text-muted-foreground hover:border-accent-green/50 hover:text-foreground"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <Textarea
                  placeholder="Describe the scene: shot type, lighting, environment, style. Motion comes from the reference video. Leave empty for a smart default."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                  maxLength={500}
                  className="min-h-[100px] resize-none bg-muted border-2 border-transparent focus:border-accent-green/30 focus:bg-card rounded-2xl p-4 text-sm transition-all"
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Describe <span className="text-foreground font-medium">scene context only</span>: lighting, environment, framing. Don&apos;t describe actions or motion — that comes from the reference video.
                  {selectedModel === "kling-3.0-motion" && (
                    <span className="text-accent-green"> V3 auto-binds your avatar&apos;s face for consistency.</span>
                  )}
                </p>
              </div>

              {/* Keep Original Sound */}
              <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Keep Original Sound</p>
                  <p className="text-xs text-muted-foreground">
                    Preserve the TikTok&apos;s audio track
                  </p>
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
          <div className="bg-accent-green rounded-[32px] p-8 text-white shadow-[0_20px_40px_rgba(123,165,67,0.3)] relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-4">
                Estimated Total Cost
              </p>
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-4xl font-extrabold tracking-tight">
                    {formatCost(imageCost + videoCost + textErasureCost)}
                  </span>
                </div>
                <div className="text-right text-xs space-y-1">
                  <p className="text-white/70">Ref image: {formatCost(imageCost)}</p>
                  <p className="text-white/70">Video: {durationSec}s @ ${pricePerSec}/s</p>
                  {removeTextOverlays && (
                    <p className="text-white/70">Text removal: {formatCost(textErasureCost)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 md:left-24 right-0 h-auto min-h-24 bg-card/90 backdrop-blur-xl border-t border-border px-6 md:px-12 z-50">
        <div className="max-w-[1200px] mx-auto h-full flex flex-col items-end justify-center gap-2 py-4">
          {submitError && (
            <div className="w-full rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}
          <Button
            size="lg"
            onClick={handleGenerateRefImage}
            disabled={!canSubmit}
            className="bg-accent-green text-white font-extrabold px-12 py-4 rounded-full text-lg shadow-[0_8px_24px_rgba(123,165,67,0.3)] hover:scale-105 hover:brightness-110 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] h-auto flex items-center gap-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Reference Image
                <ImageIcon className="size-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
