"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePolling } from "@/lib/hooks/use-polling";
import { apiGet, apiPost } from "@/lib/api/client";
import { MediaPreview } from "@/components/media-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Play,
  ZoomIn,
  Maximize,
  Crop,
  Repeat,
  Plus,
  Zap,
  Sparkles,
  Palette,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { downloadFile } from "@/lib/utils/download";

interface JobOutput {
  id: string;
  url: string;
  type: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  fileSizeBytes: number | null;
  createdAt: string;
}

interface JobDetail {
  id: string;
  type: "image" | "video";
  model: string;
  status: "queued" | "processing" | "completed" | "failed";
  prompt: string;
  input: Record<string, unknown>;
  output: unknown;
  estimatedCost: number;
  actualCost: number | null;
  durationMs: number | null;
  error: string | null;
  tags: string[];
  outputs: JobOutput[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [motionIntensity, setMotionIntensity] = useState(7.5);
  const [creativityStrength, setCreativityStrength] = useState(4.2);
  const [styleFidelity, setStyleFidelity] = useState(9.0);
  const [upscale, setUpscale] = useState<"standard" | "ultra">("standard");
  const [activeTab, setActiveTab] = useState<"enhance" | "details" | "prompts">("enhance");

  const fetchJob = useCallback(
    () => apiGet<JobDetail>(`/api/jobs/${id}`),
    [id]
  );

  const shouldStop = useCallback(
    (data: JobDetail) =>
      data.status === "completed" || data.status === "failed",
    []
  );

  const { data: job, isLoading, error } = usePolling<JobDetail>(
    fetchJob,
    5000,
    shouldStop
  );

  const handleRetry = async () => {
    if (!job) return;
    setIsRetrying(true);
    try {
      const result = await apiPost<{ id: string }>(
        `/api/jobs/${job.id}/retry`,
        {}
      );
      router.push(`/generate/${result.id}`);
    } catch {
      setIsRetrying(false);
    }
  };

  // Loading skeleton
  if (isLoading && !job) {
    return (
      <div className="min-h-screen md:ml-24 p-8 flex flex-col animate-fade-in-up">
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="ml-auto h-10 w-32 rounded-xl" />
        </div>
        <div className="flex flex-col lg:flex-row gap-8 flex-1">
          <Skeleton className="flex-1 min-h-[400px] rounded-[32px]" />
          <Skeleton className="w-full lg:w-[420px] h-[500px] rounded-[32px]" />
        </div>
      </div>
    );
  }

  // Error loading
  if (error && !job) {
    return (
      <div className="min-h-screen md:ml-24 p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-4">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-destructive">
            Failed to load job: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const isActive = job.status === "queued" || job.status === "processing";
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const input = job.input ?? {};
  const featured = job.outputs[featuredIdx] ?? job.outputs[0];

  return (
    <div className="min-h-screen md:ml-24 p-6 lg:p-8 flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-card border border-border hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Generation Editor</h1>
          <span className="rounded-full bg-accent-blue/15 px-3 py-0.5 text-xs font-medium text-accent-blue">
            {job.model}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {job.id.slice(0, 8)}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {isCompleted && featured && (
            <button
              type="button"
              onClick={() => downloadFile(`/api/files/${featured.id}/download`, featured.filename)}
              className="flex items-center gap-2 rounded-xl bg-accent-coral px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_24px_rgba(255,122,89,0.25)] transition-all hover:shadow-[0_4px_32px_rgba(255,122,89,0.35)] hover:brightness-110"
            >
              <Download className="size-4" />
              Download
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              router.push(
                `/generate?prompt=${encodeURIComponent(job.prompt)}&model=${encodeURIComponent(job.model)}`
              )
            }
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Sparkles className="size-4 text-accent-blue" />
            Generate Similar
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Left: Preview Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative flex-1 rounded-[32px] bg-card border border-border overflow-hidden flex items-center justify-center min-h-[400px]">
            {/* Processing overlay */}
            {isActive && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm">
                <div className="relative mb-4">
                  <div className="size-14 animate-spin rounded-full border-4 border-muted border-t-accent-blue" />
                </div>
                <p className="text-sm font-medium">
                  {job.status === "queued"
                    ? "Waiting in queue..."
                    : "Forging your content..."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This may take a moment
                </p>
              </div>
            )}

            {/* Failed overlay */}
            {isFailed && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-6 py-4 text-center">
                  <AlertCircle className="mx-auto mb-2 size-6 text-destructive" />
                  <p className="text-sm font-medium text-destructive">Generation Failed</p>
                  {job.error && (
                    <p className="mt-1 max-w-sm text-xs text-destructive/80">{job.error}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex items-center gap-2 rounded-xl bg-accent-blue px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isRetrying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  {isRetrying ? "Retrying..." : "Retry Generation"}
                </button>
              </div>
            )}

            {/* Completed preview */}
            {isCompleted && featured && (
              <div className="group relative w-full h-full flex items-center justify-center p-6">
                <MediaPreview
                  type={job.type}
                  src={`/api/files/${featured.id}`}
                  width={featured.width ?? undefined}
                  height={featured.height ?? undefined}
                  alt={job.prompt}
                  className="max-w-full max-h-full rounded-2xl"
                />

                {/* Hover play overlay for videos */}
                {job.type === "video" && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex size-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                      <Play className="size-6 text-foreground ml-1" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Floating toolbar */}
            {isCompleted && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-2xl bg-card/90 border border-border backdrop-blur-md px-2 py-1.5 shadow-lg">
                {[
                  { icon: ZoomIn, label: "Zoom" },
                  { icon: Maximize, label: "Fullscreen" },
                  { icon: Crop, label: "Crop" },
                  { icon: Repeat, label: "Repeat" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    title={label}
                    className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Variations strip */}
          {isCompleted && (
            <div className="mt-4 flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
              {job.outputs.map((output, idx) => (
                <button
                  key={output.id}
                  type="button"
                  onClick={() => setFeaturedIdx(idx)}
                  className={cn(
                    "relative size-[128px] shrink-0 overflow-hidden rounded-2xl transition-all",
                    idx === featuredIdx
                      ? "border-2 border-accent-blue shadow-[0_0_0_2px_rgba(79,159,217,0.2)]"
                      : "border border-border grayscale hover:grayscale-0 hover:border-accent-blue/50"
                  )}
                >
                  <MediaPreview
                    type={job.type}
                    src={`/api/files/${output.id}`}
                    width={output.width ?? undefined}
                    height={output.height ?? undefined}
                    fill
                    className="size-full"
                  />
                </button>
              ))}
              {/* Create placeholder */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/generate?prompt=${encodeURIComponent(job.prompt)}&model=${encodeURIComponent(job.model)}`
                  )
                }
                className="flex size-[128px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-accent-blue hover:text-accent-blue"
              >
                <Plus className="size-6" />
                <span className="text-xs font-medium">Create</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Control Panel */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-6">
          {/* Main control card */}
          <div className="rounded-[32px] bg-card border border-border p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-2xl bg-muted p-1">
              {(["enhance", "details", "prompts"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                    activeTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Enhance tab */}
            {activeTab === "enhance" && (
              <div className="space-y-6">
                {/* Motion Intensity */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-accent-blue" />
                      <span className="text-sm font-medium">Motion Intensity</span>
                    </div>
                    <span className="rounded-lg bg-accent-blue/10 px-2 py-0.5 text-xs font-semibold text-accent-blue">
                      {motionIntensity}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="editor-slider"
                    min={0}
                    max={10}
                    step={0.5}
                    value={motionIntensity}
                    onChange={(e) => setMotionIntensity(parseFloat(e.target.value))}
                  />
                </div>

                {/* Creativity Strength */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-accent-green" />
                      <span className="text-sm font-medium">Creativity Strength</span>
                    </div>
                    <span className="rounded-lg bg-accent-green/10 px-2 py-0.5 text-xs font-semibold text-accent-green">
                      {creativityStrength}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="editor-slider"
                    min={0}
                    max={10}
                    step={0.1}
                    value={creativityStrength}
                    onChange={(e) => setCreativityStrength(parseFloat(e.target.value))}
                  />
                </div>

                {/* Style Fidelity */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="size-4 text-accent-coral" />
                      <span className="text-sm font-medium">Style Fidelity</span>
                    </div>
                    <span className="rounded-lg bg-accent-coral/10 px-2 py-0.5 text-xs font-semibold text-accent-coral">
                      {styleFidelity}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="editor-slider"
                    min={0}
                    max={10}
                    step={0.1}
                    value={styleFidelity}
                    onChange={(e) => setStyleFidelity(parseFloat(e.target.value))}
                  />
                </div>

                {/* Upscaling */}
                <div>
                  <p className="mb-3 text-sm font-medium">Upscaling</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUpscale("standard")}
                      className={cn(
                        "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                        upscale === "standard"
                          ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                          : "border-border text-muted-foreground hover:border-accent-blue/50"
                      )}
                    >
                      Standard 2K
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpscale("ultra")}
                      className={cn(
                        "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                        upscale === "ultra"
                          ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                          : "border-border text-muted-foreground hover:border-accent-blue/50"
                      )}
                    >
                      Ultra 4K
                    </button>
                  </div>
                </div>

                {/* Apply button */}
                <button
                  type="button"
                  className="w-full rounded-xl bg-accent-blue py-3 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(79,159,217,0.25)] transition-all hover:shadow-[0_4px_32px_rgba(79,159,217,0.35)] hover:brightness-110"
                >
                  Apply Changes
                </button>
              </div>
            )}

            {/* Details tab */}
            {activeTab === "details" && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Est. Cost</p>
                    <p className="font-medium">{formatCost(job.estimatedCost)}</p>
                  </div>
                  {job.actualCost !== null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Actual Cost</p>
                      <p className="font-medium">{formatCost(job.actualCost)}</p>
                    </div>
                  )}
                  {job.durationMs !== null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Gen Time</p>
                      <p className="font-medium">{(job.durationMs / 1000).toFixed(1)}s</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                    <p className="font-medium capitalize">{job.status}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Created {formatRelativeDate(job.createdAt)}</span>
                    {job.startedAt && <span>Started {formatRelativeDate(job.startedAt)}</span>}
                    {job.completedAt && <span>Completed {formatRelativeDate(job.completedAt)}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Prompts tab */}
            {activeTab === "prompts" && (
              <div className="space-y-3">
                <p className="italic text-sm leading-relaxed text-muted-foreground">
                  {job.prompt}
                </p>
              </div>
            )}
          </div>

          {/* Prompt metadata card */}
          <div className="rounded-[32px] bg-card border border-border p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Prompt
            </p>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm italic leading-relaxed text-muted-foreground line-clamp-4">
                {job.prompt}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {input.aspectRatio != null && (
                <span className="rounded-lg bg-accent-blue/10 px-2.5 py-1 text-xs font-medium text-accent-blue">
                  {String(input.aspectRatio)}
                </span>
              )}
              {input.duration != null && (
                <span className="rounded-lg bg-accent-green/10 px-2.5 py-1 text-xs font-medium text-accent-green">
                  {String(input.duration)}s
                </span>
              )}
              {input.numImages != null && (
                <span className="rounded-lg bg-accent-coral/10 px-2.5 py-1 text-xs font-medium text-accent-coral">
                  {String(input.numImages)} images
                </span>
              )}
              <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {job.model}
              </span>
              {job.type === "video" && (
                <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  30 FPS
                </span>
              )}
            </div>
          </div>

          {/* Discard button */}
          <button
            type="button"
            onClick={() => router.push("/generate")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent-coral/50 px-4 py-3 text-sm font-medium text-accent-coral transition-all hover:border-accent-coral hover:bg-accent-coral/5"
          >
            <Trash2 className="size-4" />
            Discard Generation
          </button>
        </div>
      </div>
    </div>
  );
}
