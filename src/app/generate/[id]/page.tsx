"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  Crop,
  Download,
  Expand,
  GalleryHorizontal,
  ImageUpscale,
  Loader2,
  Maximize2,
  Paintbrush,
  Plus,
  Redo2,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
  Workflow,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { humanizeGenerationFailure } from "@/lib/ai/prompt-presentation";
import { userErrorMessage } from "@/lib/user-error-message";
import { GenerateOutputActions } from "@/components/generate-output-actions";
import { MediaPreview, MediaPreviewFrame } from "@/components/media-preview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { usePolling } from "@/lib/hooks/use-polling";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/utils/download";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import {
  buildCloneHandoffHref,
  buildContinueVideoHref,
  buildEnhancementRequest,
  buildGenerateSimilarHref,
  clampPreviewZoom,
  getGenerationStatusCopy,
  type JobDetail,
  type JobOutput,
} from "@/lib/generation-editor";

type InspectorTab = "enhance" | "details" | "prompts";
type Feedback = { tone: "success" | "error"; message: string } | null;

interface EnhancementTool {
  id: "upscale" | "relight" | "remove-object" | "expand-frame";
  title: string;
  detail: string;
  instruction: string;
  icon: ComponentType<{ className?: string }>;
}

const ENHANCEMENT_TOOLS: EnhancementTool[] = [
  {
    id: "upscale",
    title: "Upscale",
    detail: "Increase detail while preserving texture",
    instruction: "Increase fine detail and resolution without smoothing skin or changing composition.",
    icon: ImageUpscale,
  },
  {
    id: "relight",
    title: "Relight",
    detail: "Balance subject and product lighting",
    instruction: "Balance the subject and product lighting while keeping the scene natural.",
    icon: Sparkles,
  },
  {
    id: "remove-object",
    title: "Remove object",
    detail: "Describe a distracting object to remove",
    instruction: "Remove the distracting object while reconstructing the background naturally.",
    icon: Paintbrush,
  },
  {
    id: "expand-frame",
    title: "Expand frame",
    detail: "Recompose with more space around the subject",
    instruction: "Expand the frame naturally and preserve the subject scale and camera perspective.",
    icon: Expand,
  },
];

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function getEditorTitle(prompt: string) {
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (!clean) return "Untitled generation";
  return clean.length > 52 ? `${clean.slice(0, 52).trim()}…` : clean;
}

function StatusBadge({
  status,
  queueStage,
}: {
  status: JobDetail["status"];
  queueStage: JobDetail["queueStage"];
}) {
  const copy = getGenerationStatusCopy(status, queueStage);
  const completed = status === "completed";
  const failed = status === "failed";

  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold",
        completed && "bg-[var(--pf-success)]/10 text-[var(--pf-success)]",
        failed && "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]",
        status === "processing" && "bg-[var(--pf-link)]/10 text-[var(--pf-link)]",
        status === "queued" && "bg-[var(--pf-active)] text-muted-foreground"
      )}
    >
      {completed ? (
        <Check className="size-3" />
      ) : failed ? (
        <AlertCircle className="size-3" />
      ) : (
        <span
          className={cn(
            "size-1.5 rounded-full bg-current",
            status === "processing" && "animate-pulse"
          )}
        />
      )}
      {copy.label}
    </span>
  );
}

function EditorLoadingState() {
  return (
    <div className="pf-content-viewport animate-fade-in-up">
      <div className="flex min-h-[92px] flex-col gap-4 border-b border-border px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-72 max-w-[60vw]" />
          </div>
        </div>
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>
      <div className="grid gap-4 p-3 sm:p-5 lg:p-6 xl:grid-cols-[minmax(0,1fr)_392px]">
        <div className="overflow-hidden rounded-[8px] border border-border bg-white">
          <Skeleton className="h-12 w-full rounded-none" />
          <div className="grid min-h-[620px] place-items-center bg-[var(--pf-active)] p-8">
            <Skeleton className="h-[560px] w-[315px] max-w-full rounded-lg" />
          </div>
          <Skeleton className="h-24 w-full rounded-none" />
        </div>
        <Skeleton className="h-[760px] w-full rounded-[8px]" />
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const previewStageRef = useRef<HTMLDivElement>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<InspectorTab>("enhance");
  const [previewZoom, setPreviewZoom] = useState(100);
  const [cropMode, setCropMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEnhancement, setSelectedEnhancement] =
    useState<EnhancementTool["id"]>("upscale");
  const [enhancementInstruction, setEnhancementInstruction] = useState(
    ENHANCEMENT_TOOLS[0].instruction
  );
  const [editStrength, setEditStrength] = useState(42);
  const [preserveSubject, setPreserveSubject] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const fetchJob = useCallback(() => apiGet<JobDetail>(`/api/jobs/${id}`), [id]);
  const shouldStop = useCallback(
    (data: JobDetail) => data.status === "completed" || data.status === "failed",
    []
  );
  const { data: job, isLoading, error } = usePolling<JobDetail>(
    fetchJob,
    5000,
    shouldStop
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === previewStageRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const showError = (message: string) => setFeedback({ tone: "error", message });
  const showSuccess = (message: string) =>
    setFeedback({ tone: "success", message });

  const handleRetry = async () => {
    if (!job || isRetrying) return;
    setIsRetrying(true);
    setFeedback(null);
    try {
      const result = await apiPost<{ id: string }>(`/api/jobs/${job.id}/retry`, {});
      router.push(`/generate/${result.id}`);
    } catch (retryError) {
      showError(userErrorMessage(retryError, "The generation could not be retried."));
      setIsRetrying(false);
    }
  };

  const handleDownload = async (output: JobOutput) => {
    if (isDownloading) return;
    setIsDownloading(true);
    setFeedback(null);
    try {
      await downloadFile(`/api/files/${output.id}/download`, output.filename);
      showSuccess("Download prepared.");
    } catch (downloadError) {
      showError(userErrorMessage(downloadError, "The output could not be downloaded."));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async (output?: JobOutput) => {
    if (!job) return;
    const shareUrl = output
      ? new URL(`/api/files/${output.id}`, window.location.origin).toString()
      : window.location.href;
    setFeedback(null);

    try {
      if (navigator.share) {
        await navigator.share({
          title: getEditorTitle(job.prompt),
          text: job.prompt,
          url: shareUrl,
        });
        showSuccess("Share sheet opened.");
        return;
      }
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareUrl);
      showSuccess("Share link copied.");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      showError("The share link could not be copied. Check browser permissions.");
    }
  };

  const handleFullscreen = async () => {
    const stage = previewStageRef.current;
    if (!stage) return;
    setFeedback(null);
    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen();
      } else {
        await stage.requestFullscreen();
      }
    } catch (fullscreenError) {
      showError(
        userErrorMessage(fullscreenError, "Fullscreen is unavailable in this browser.")
      );
    }
  };

  const handleApplyEnhancement = async (output: JobOutput) => {
    if (!job || isApplying || !enhancementInstruction.trim()) return;
    if (job.type === "video") {
      router.push(
        job.tags.includes("video-swap")
          ? buildGenerateSimilarHref(job)
          : buildContinueVideoHref(job, output.id)
      );
      return;
    }

    setIsApplying(true);
    setFeedback(null);
    try {
      const result = await apiPost<{ id: string }>(
        "/api/generate/images",
        buildEnhancementRequest({
          job,
          outputId: output.id,
          instruction: enhancementInstruction,
          editStrength,
          preserveSubject,
        })
      );
      router.push(`/generate/${result.id}`);
    } catch (enhanceError) {
      showError(
        userErrorMessage(enhanceError, "The enhancement could not be started.")
      );
      setIsApplying(false);
    }
  };

  const handleDiscard = async () => {
    if (!job || isDiscarding) return;
    setIsDiscarding(true);
    setFeedback(null);
    try {
      await apiDelete(`/api/jobs/${job.id}`);
      router.push("/generate");
    } catch (discardError) {
      showError(userErrorMessage(discardError, "The generation could not be discarded."));
      setIsDiscarding(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!job) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(job.prompt);
      showSuccess("Prompt copied.");
    } catch {
      showError("The prompt could not be copied. Check browser permissions.");
    }
  };

  if (isLoading && !job) return <EditorLoadingState />;

  if (error && !job) {
    return (
      <div className="pf-content-viewport grid min-w-0 place-items-center px-5">
        <div className="w-full min-w-0 max-w-md rounded-lg border border-[var(--pf-danger)]/40 bg-white p-6 text-center">
          <span className="mx-auto grid size-10 shrink-0 place-items-center rounded-full bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]">
            <AlertCircle className="size-5 shrink-0" />
          </span>
          <h1 className="mt-4 text-[15px] font-semibold">Generation could not load</h1>
          <p className="mt-2 min-w-0 break-words text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            {error.message}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/generate")}
              className="shrink-0"
            >
              Back to Generate
            </Button>
            <Button className="shrink-0" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const isActive = job.status === "queued" || job.status === "processing";
  const isCompleted = job.status === "completed";
  const canDiscard = job.status === "completed" || job.status === "failed";
  const isFailed = job.status === "failed";
  const featured = job.outputs[featuredIdx] ?? job.outputs[0];
  const statusCopy = getGenerationStatusCopy(job.status, job.queueStage);
  const input = job.input ?? {};
  const negativePrompt = asString(input.negativePrompt);
  const selectedTool =
    ENHANCEMENT_TOOLS.find((tool) => tool.id === selectedEnhancement) ??
    ENHANCEMENT_TOOLS[0];

  return (
    <div className="pf-content-viewport min-w-0 animate-fade-in-up">
      <header className="border-b border-border bg-[var(--pf-canvas)] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <button
              type="button"
              aria-label="Back"
              onClick={() => router.back()}
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-[var(--pf-active)] hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
            </button>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <h1 className="max-w-2xl truncate text-[20px] font-semibold tracking-[-0.02em] text-foreground sm:text-[24px]">
                  {getEditorTitle(job.prompt)}
                </h1>
                <StatusBadge status={job.status} queueStage={job.queueStage} />
              </div>
              <p className="mt-1 truncate text-[12px] text-muted-foreground">
                {job.model} · Job {job.id.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleShare(featured)}
              className="h-9 shrink-0 rounded-lg border-border bg-white px-3 text-[12px]"
            >
              <Share2 className="size-3.5 shrink-0" /> Share
            </Button>
            {featured && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/gallery?type=${job.type}`)}
                className="h-9 shrink-0 rounded-lg border-border bg-white px-3 text-[12px]"
              >
                <GalleryHorizontal className="size-3.5 shrink-0" /> Gallery
              </Button>
            )}
            {isCompleted && featured && (
              <Button
                type="button"
                disabled={isDownloading}
                onClick={() => void handleDownload(featured)}
                className="h-9 shrink-0 rounded-lg bg-[var(--pf-orange)] px-3.5 text-[12px] text-white hover:brightness-[0.93]"
              >
                {isDownloading ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <Download className="size-3.5 shrink-0" />
                )}
                Download
              </Button>
            )}
          </div>
        </div>

        {error && job && (
          <div
            role="alert"
            className="mt-3 flex min-w-0 items-start gap-2 rounded-lg bg-[var(--pf-danger)]/10 px-3 py-2.5 text-[12px] leading-4 text-[var(--pf-danger)]"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
              Live status could not refresh: {error.message}. Showing the last known state.
            </span>
          </div>
        )}
      </header>

      <section className="grid items-start gap-4 p-3 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-5 lg:p-6 xl:grid-cols-[minmax(0,1fr)_392px]">
        <div className="min-w-0 overflow-hidden rounded-[8px] border border-border bg-white">
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setPreviewZoom((zoom) => clampPreviewZoom(zoom - 10))}
                disabled={previewZoom <= 50}
                className="grid size-7 place-items-center rounded-lg border border-border bg-white text-muted-foreground hover:bg-[var(--pf-active)] disabled:opacity-35"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="w-12 text-center text-[12px] font-semibold text-muted-foreground">
                {previewZoom}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setPreviewZoom((zoom) => clampPreviewZoom(zoom + 10))}
                disabled={previewZoom >= 150}
                className="grid size-7 place-items-center rounded-lg border border-border bg-white text-muted-foreground hover:bg-[var(--pf-active)] disabled:opacity-35"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {isCompleted && featured && (
                <button
                  type="button"
                  aria-pressed={cropMode}
                  onClick={() => {
                    setCropMode((current) => !current);
                    showSuccess(cropMode ? "Fit preview restored." : "Crop preview enabled.");
                  }}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[12px] font-semibold transition-colors",
                    cropMode
                      ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)] text-foreground"
                      : "border-border bg-white text-muted-foreground hover:bg-[var(--pf-active)]"
                  )}
                >
                  <Crop className="size-3.5" /> {cropMode ? "Fit" : "Crop"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleFullscreen()}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-white px-2 text-[12px] font-semibold text-muted-foreground hover:bg-[var(--pf-active)]"
              >
                <Maximize2 className="size-3.5" />
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </button>
            </div>
          </div>

          <div
            ref={previewStageRef}
            className={cn(
              "relative grid min-h-[460px] place-items-center overflow-auto p-4 sm:min-h-[620px] sm:p-8 fullscreen:min-h-dvh",
              isCompleted && featured ? "bg-[#09090B]" : "bg-[var(--pf-active)]"
            )}
          >
            {isActive && (
              <div className="flex max-w-sm flex-col items-center px-5 text-center">
                {job.status === "processing" ? (
                  <Loader2 className="size-8 animate-spin text-[var(--pf-orange)]" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-full bg-card text-muted-foreground shadow-sm">
                    <Clock3 className="size-5" />
                  </span>
                )}
                <h2 className="mt-4 text-[15px] font-semibold text-foreground">
                  {statusCopy.title}
                </h2>
                <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                  {statusCopy.description}
                </p>
                <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-[var(--pf-border)]">
                  <span
                    className={cn(
                      "block h-full rounded-full bg-[var(--pf-orange)]",
                      job.status === "queued" ? "w-[18%]" : "w-[64%] animate-pulse"
                    )}
                  />
                </div>
              </div>
            )}

            {isFailed && (
              <div className="flex w-full min-w-0 max-w-sm flex-col items-center px-5 text-center">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]">
                  <AlertCircle className="size-5 shrink-0" />
                </span>
                <h2 className="mt-4 text-[15px] font-semibold text-foreground">
                  {statusCopy.title}
                </h2>
                <p className="mt-1.5 min-w-0 break-words text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                  {humanizeGenerationFailure(job.error, statusCopy.description)}
                </p>
                <Button
                  type="button"
                  onClick={() => void handleRetry()}
                  disabled={isRetrying}
                  className="mt-4 h-9 shrink-0 rounded-lg bg-[var(--pf-orange)] px-4 text-[12px] text-white hover:brightness-[0.93]"
                >
                  {isRetrying ? (
                    <Loader2 className="size-3.5 shrink-0 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5 shrink-0" />
                  )}
                  {isRetrying ? "Retrying…" : "Try again"}
                </Button>
              </div>
            )}

            {isCompleted && featured && (
              <div
                className="w-full max-w-[760px] transition-transform duration-150"
                style={{ transform: `scale(${previewZoom / 100})` }}
              >
                <MediaPreviewFrame
                  type={job.type}
                  src={`/api/files/${featured.id}`}
                  width={featured.width ?? undefined}
                  height={featured.height ?? undefined}
                  alt={job.prompt}
                  variant="detail"
                  fill={cropMode}
                  showMetadata
                  className="w-full rounded-lg shadow-[var(--pf-shadow-lg)]"
                />
              </div>
            )}

            {isCompleted && !featured && (
              <div className="flex max-w-sm flex-col items-center text-center">
                <AlertCircle className="size-7 text-[var(--pf-danger)]" />
                <h2 className="mt-3 text-[13px] font-semibold">No output was returned</h2>
                <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  The job completed without a media file. Recreate it from the saved prompt.
                </p>
                <Button
                  type="button"
                  onClick={() => router.push(buildGenerateSimilarHref(job))}
                  className="mt-4 h-9 rounded-lg"
                >
                  <Redo2 className="size-3.5" /> Generate similar
                </Button>
              </div>
            )}
          </div>

          {isCompleted && (
            <div className="flex min-h-[92px] items-center gap-2 overflow-x-auto border-t border-border px-3 py-2.5">
              <div className="mr-1 w-20 shrink-0">
                <span className="block text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Variations
                </span>
                <strong className="mt-1 block text-[12px] font-semibold text-foreground">
                  {job.outputs.length} output{job.outputs.length === 1 ? "" : "s"}
                </strong>
              </div>
              {job.outputs.map((output, index) => (
                <button
                  key={output.id}
                  type="button"
                  aria-label={`Select variation ${index + 1}`}
                  aria-pressed={featured?.id === output.id}
                  onClick={() => setFeaturedIdx(index)}
                  className={cn(
                    "relative h-[68px] w-[54px] shrink-0 overflow-hidden rounded-lg border-2 bg-[var(--pf-active)] transition-colors",
                    featured?.id === output.id
                      ? "border-[var(--pf-orange)]"
                      : "border-transparent hover:border-[var(--pf-border-strong)]"
                  )}
                >
                  <MediaPreview
                    type={job.type}
                    src={`/api/files/${output.id}`}
                    width={output.width ?? undefined}
                    height={output.height ?? undefined}
                    fill
                    className="size-full rounded-lg"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[12px] font-semibold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => router.push(buildGenerateSimilarHref(job))}
                className="flex h-[68px] w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--pf-border-strong)] text-[13px] font-semibold text-muted-foreground hover:border-[var(--pf-orange)] hover:text-[var(--pf-orange)]"
              >
                <Plus className="size-4" /> New variation
              </button>
            </div>
          )}
        </div>

        <aside className="min-w-0 overflow-hidden rounded-[8px] border border-border bg-white xl:sticky xl:top-4">
          <div
            role="tablist"
            aria-label="Generation editor panels"
            className="grid grid-cols-3 border-b border-border px-3 pt-2"
          >
            {(["enhance", "details", "prompts"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative h-10 text-[12px] font-semibold capitalize text-muted-foreground transition-colors hover:text-foreground",
                  activeTab === tab &&
                    "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[var(--pf-orange)]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "enhance" && (
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Quick actions
                  </p>
                  <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                    Refine this output
                  </h2>
                </div>
                <span className="rounded-full bg-[var(--pf-link)]/10 px-2 py-1 text-[13px] font-semibold text-[var(--pf-link)]">
                  AI
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {ENHANCEMENT_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  const active = selectedEnhancement === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setSelectedEnhancement(tool.id);
                        setEnhancementInstruction(tool.instruction);
                      }}
                      className={cn(
                        "min-w-0 rounded-lg border p-2.5 text-left transition-colors",
                        active
                          ? "border-[var(--pf-orange)] bg-[var(--sidebar-accent)]"
                          : "border-border bg-white hover:bg-[var(--pf-active)]"
                      )}
                    >
                      <span className="flex items-start gap-2">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-[12px] font-semibold text-foreground">
                            {tool.title}
                          </strong>
                          <small className="mt-1 block text-[12px] leading-3.5 text-muted-foreground">
                            {tool.detail}
                          </small>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-border pt-4">
                <label
                  htmlFor="enhancement-instruction"
                  className="mb-1.5 block text-[12px] font-semibold text-muted-foreground"
                >
                  Instruction · {selectedTool.title}
                </label>
                <Textarea
                  id="enhancement-instruction"
                  value={enhancementInstruction}
                  onChange={(event) => setEnhancementInstruction(event.target.value)}
                  className="min-h-[104px] resize-none rounded-lg border-border bg-card text-[12px] leading-4 shadow-none"
                />
              </div>

              <label className="block">
                <span className="mb-2 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                  Edit strength <strong className="text-foreground">{editStrength}%</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={editStrength}
                  onChange={(event) => setEditStrength(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-[var(--pf-orange)]"
                />
              </label>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[var(--pf-active)] px-3 py-2.5">
                <span>
                  <strong className="block text-[12px] font-semibold text-foreground">
                    Preserve subject
                  </strong>
                  <small className="mt-0.5 block text-[12px] text-muted-foreground">
                    Lock identity and camera geometry
                  </small>
                </span>
                <Switch
                  aria-label="Preserve subject"
                  checked={preserveSubject}
                  onCheckedChange={setPreserveSubject}
                />
              </div>

              <Button
                type="button"
                disabled={!featured || !isCompleted || isApplying || !enhancementInstruction.trim()}
                onClick={() => featured && void handleApplyEnhancement(featured)}
                className="h-11 w-full rounded-lg bg-[var(--pf-orange)] text-[12px] font-semibold text-white hover:brightness-[0.93]"
              >
                {isApplying ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : job.type === "video" ? (
                  <Redo2 className="size-3.5" />
                ) : (
                  <WandSparkles className="size-3.5" />
                )}
                {isApplying
                  ? "Starting enhancement…"
                  : job.type === "video"
                    ? job.tags.includes("video-swap")
                      ? "Remix video in Generate"
                      : "Continue this video"
                    : "Apply enhancement"}
                {isCompleted && job.type === "image" && (
                  <span className="ml-auto opacity-75">{formatCost(job.estimatedCost)}</span>
                )}
              </Button>
            </div>
          )}

          {activeTab === "details" && (
            <div className="p-4">
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Output details
              </p>
              <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                Generation record
              </h2>
              <dl className="mt-4 divide-y divide-border rounded-lg border border-border px-3">
                {[
                  ["Status", statusCopy.label],
                  ["Type", job.type],
                  ["Model", job.model],
                  ["Created", formatRelativeDate(job.createdAt)],
                  [
                    "Size",
                    featured?.width && featured?.height
                      ? `${featured.width} × ${featured.height} px`
                      : "Not available",
                  ],
                  ["Aspect", asString(input.aspectRatio) ?? "Not available"],
                  [
                    "Generation time",
                    job.durationMs !== null
                      ? `${(job.durationMs / 1000).toFixed(1)}s`
                      : "Not available",
                  ],
                  [
                    "Cost",
                    formatCost(job.actualCost ?? job.estimatedCost),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-2.5 text-[12px]"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="truncate text-right font-semibold capitalize text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 rounded-lg bg-[var(--pf-canvas)] p-3">
                <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Source
                </span>
                <strong className="mt-1 block text-[12px] font-semibold text-foreground">
                  Generate Studio
                </strong>
                <small className="mt-1 block min-w-0 break-words text-[12px] text-muted-foreground [overflow-wrap:anywhere]">
                  Job {job.id}
                </small>
              </div>
            </div>
          )}

          {activeTab === "prompts" && (
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Prompt record
                  </p>
                  <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                    Recreate or remix
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopyPrompt()}
                  className="h-7 rounded-lg border-border bg-white px-2 text-[12px]"
                >
                  <Copy className="size-3" /> Copy
                </Button>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-muted-foreground">Main prompt</p>
                <div className="min-w-0 break-words rounded-lg border border-border bg-[var(--pf-active)] p-3 text-[12px] leading-5 text-foreground [overflow-wrap:anywhere]">
                  {job.prompt}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-muted-foreground">
                  Negative prompt
                </p>
                <div className="min-w-0 break-words rounded-lg border border-border bg-[var(--pf-canvas)] p-3 text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                  {negativePrompt ?? "No negative prompt was used."}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    job.type === "video" &&
                      !job.tags.includes("video-swap")
                      ? buildContinueVideoHref(job, featured?.id)
                      : buildGenerateSimilarHref(job)
                  )
                }
                className="h-10 w-full rounded-lg border-border bg-white text-[12px]"
              >
                <Redo2 className="size-3.5" />{" "}
                {job.type === "video"
                  ? job.tags.includes("video-swap")
                    ? "Remix in Generate Studio"
                    : "Continue this video"
                  : "Remix in Generate Studio"}
              </Button>
            </div>
          )}

          <div className="min-w-0 border-t border-border p-4 pb-[max(16px,env(safe-area-inset-bottom))] [&_[role=alert]]:min-w-0 [&_[role=alert]]:break-words [&_[role=alert]]:[overflow-wrap:anywhere] [&_[role=status]]:min-w-0 [&_[role=status]]:break-words [&_[role=status]]:[overflow-wrap:anywhere] [&_[role=alert]_svg]:shrink-0 [&_[role=status]_svg]:shrink-0">
            {isCompleted && featured ? (
              <GenerateOutputActions
                canDownload
                isRetrying={isRetrying}
                isDownloading={isDownloading}
                showRetry={false}
                actionError={feedback?.tone === "error" ? feedback.message : null}
                actionNotice={
                  feedback?.tone === "success" ? feedback.message : null
                }
                onDownload={() => void handleDownload(featured)}
                onRetry={() => void handleRetry()}
                onSaveToGallery={() => router.push(`/gallery?type=${job.type}`)}
                onUseInClone={job.type === "image" ? () => router.push(buildCloneHandoffHref(featured.id)) : undefined}
                onGenerateSimilar={() => router.push(buildGenerateSimilarHref(job))}
                onAddToAutomation={() =>
                  router.push(
                    `/automations/new?sourceFileId=${encodeURIComponent(featured.id)}`
                  )
                }
              />
            ) : (
              feedback && (
                <div
                  role={feedback.tone === "error" ? "alert" : "status"}
                  className={cn(
                    "flex min-w-0 items-start gap-2 rounded-lg px-3 py-2.5 text-[12px] leading-4",
                    feedback.tone === "error"
                      ? "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                      : "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                  )}
                >
                  {feedback.tone === "error" ? (
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  ) : (
                    <Check className="mt-0.5 size-3.5 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                    {feedback.message}
                  </span>
                </div>
              )
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              {featured && job.type === "image" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(buildCloneHandoffHref(featured.id))}
                  className="h-9 rounded-lg border-border bg-white text-[12px] xl:hidden"
                >
                  <Users className="size-3.5 shrink-0" /> Use in Clone
                </Button>
              )}
              {featured && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/automations/new?sourceFileId=${encodeURIComponent(featured.id)}`
                    )
                  }
                  className="h-9 rounded-lg border-border bg-white text-[12px] xl:hidden"
                >
                  <Workflow className="size-3.5 shrink-0" /> Automate
                </Button>
              )}
            </div>

            {canDiscard ? <AlertDialog>
              <AlertDialogTrigger
                disabled={isDiscarding}
                render={
                  <button
                    type="button"
                    className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--pf-danger)]/40 text-[12px] font-semibold text-[var(--pf-danger)] transition-colors hover:bg-[var(--pf-danger)]/10 disabled:opacity-50"
                  />
                }
              >
                {isDiscarding ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5 shrink-0" />
                )}
                Discard generation
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard this generation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the job and its generated files. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep generation</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => void handleDiscard()}
                  >
                    Discard
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog> : (
              <button
                type="button"
                onClick={() => router.push("/generate")}
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-[var(--pf-active)]"
              >
                <ArrowLeft className="size-3.5" /> Leave editor
              </button>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
