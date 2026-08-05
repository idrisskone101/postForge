"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
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

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;
}

function getEditorTitle(prompt: string) {
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (!clean) return "Untitled generation";
  return clean.length > 52 ? `${clean.slice(0, 52).trim()}…` : clean;
}

function StatusBadge({ status }: { status: JobDetail["status"] }) {
  const copy = getGenerationStatusCopy(status);
  const completed = status === "completed";
  const failed = status === "failed";

  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold",
        completed && "bg-[#E9F7EC] text-[#238A40]",
        failed && "bg-[#FEF0EF] text-[#C53A32]",
        status === "processing" && "bg-[#EEF5FF] text-[#2A71C7]",
        status === "queued" && "bg-[#F1F2EC] text-[#686965]"
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
      <div className="flex min-h-[92px] flex-col gap-4 border-b border-[#DEDFD8] px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="size-9 rounded-[9px]" />
          <div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-72 max-w-[60vw]" />
          </div>
        </div>
        <Skeleton className="h-9 w-64 rounded-[9px]" />
      </div>
      <div className="grid gap-4 p-3 sm:p-5 lg:p-6 xl:grid-cols-[minmax(0,1fr)_392px]">
        <div className="overflow-hidden rounded-[14px] border border-[#DADBD2] bg-white">
          <Skeleton className="h-12 w-full rounded-none" />
          <div className="grid min-h-[620px] place-items-center bg-[#EFEFE9] p-8">
            <Skeleton className="h-[560px] w-[315px] max-w-full rounded-[13px]" />
          </div>
          <Skeleton className="h-24 w-full rounded-none" />
        </div>
        <Skeleton className="h-[760px] w-full rounded-[14px]" />
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
      showError(errorMessage(retryError, "The generation could not be retried."));
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
      showError(errorMessage(downloadError, "The output could not be downloaded."));
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
        errorMessage(fullscreenError, "Fullscreen is unavailable in this browser.")
      );
    }
  };

  const handleApplyEnhancement = async (output: JobOutput) => {
    if (!job || isApplying || !enhancementInstruction.trim()) return;
    if (job.type === "video") {
      router.push(buildContinueVideoHref(job, output.id));
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
        errorMessage(enhanceError, "The enhancement could not be started.")
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
      showError(errorMessage(discardError, "The generation could not be discarded."));
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
        <div className="w-full min-w-0 max-w-md rounded-[13px] border border-[#F2C5C1] bg-white p-6 text-center">
          <span className="mx-auto grid size-10 shrink-0 place-items-center rounded-full bg-[#FEF0EF] text-[#C53A32]">
            <AlertCircle className="size-5 shrink-0" />
          </span>
          <h1 className="mt-4 text-[16px] font-semibold">Generation could not load</h1>
          <p className="mt-2 min-w-0 break-words text-[11px] leading-5 text-[#777873] [overflow-wrap:anywhere]">
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
  const statusCopy = getGenerationStatusCopy(job.status);
  const input = job.input ?? {};
  const negativePrompt = asString(input.negativePrompt);
  const selectedTool =
    ENHANCEMENT_TOOLS.find((tool) => tool.id === selectedEnhancement) ??
    ENHANCEMENT_TOOLS[0];

  return (
    <div
      data-magicpath-frame="generation-editor-435054353376751616"
      className="pf-content-viewport min-w-0 animate-fade-in-up"
    >
      <header className="border-b border-[#DEDFD8] bg-[#F3F4EF] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <button
              type="button"
              aria-label="Back"
              onClick={() => router.back()}
              className="grid size-9 shrink-0 place-items-center rounded-[9px] border border-[#D6D7CF] bg-white text-[#62635F] transition-colors hover:bg-[#F8F9F5] hover:text-[#232323]"
            >
              <ArrowLeft className="size-3.5" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#92938F]">
                Generate / {job.id.slice(0, 8)}
              </p>
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2.5">
                <h1 className="max-w-2xl truncate text-[20px] font-semibold tracking-[-0.03em] text-[#232323] sm:text-[24px]">
                  {getEditorTitle(job.prompt)}
                </h1>
                <StatusBadge status={job.status} />
              </div>
            </div>
          </div>

          <div className="flex min-w-0 w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleShare(featured)}
              className="h-9 shrink-0 rounded-[9px] border-[#D6D7CF] bg-white px-3 text-[10px]"
            >
              <Share2 className="size-3.5 shrink-0" /> Share
            </Button>
            {featured && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/gallery?type=${job.type}`)}
                className="h-9 shrink-0 rounded-[9px] border-[#D6D7CF] bg-white px-3 text-[10px]"
              >
                <GalleryHorizontal className="size-3.5 shrink-0" /> Gallery
              </Button>
            )}
            {isCompleted && featured && (
              <Button
                type="button"
                disabled={isDownloading}
                onClick={() => void handleDownload(featured)}
                className="h-9 shrink-0 rounded-[9px] bg-[#FF4A20] px-3.5 text-[10px] text-white hover:bg-[#E9421C]"
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
            className="mt-3 flex min-w-0 items-start gap-2 rounded-lg bg-[#FEF0EF] px-3 py-2.5 text-[10px] leading-4 text-[#C53A32]"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
              Live status could not refresh: {error.message}. Showing the last known state.
            </span>
          </div>
        )}
      </header>

      <section className="grid items-start gap-4 p-3 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-5 lg:p-6 xl:grid-cols-[minmax(0,1fr)_392px]">
        <div className="min-w-0 overflow-hidden rounded-[14px] border border-[#DADBD2] bg-white">
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-[#E1E2DC] px-3 py-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setPreviewZoom((zoom) => clampPreviewZoom(zoom - 10))}
                disabled={previewZoom <= 50}
                className="grid size-7 place-items-center rounded-lg border border-[#DADBD2] bg-white text-[#686965] hover:bg-[#F8F9F5] disabled:opacity-35"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="w-12 text-center text-[10px] font-semibold text-[#777873]">
                {previewZoom}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setPreviewZoom((zoom) => clampPreviewZoom(zoom + 10))}
                disabled={previewZoom >= 150}
                className="grid size-7 place-items-center rounded-lg border border-[#DADBD2] bg-white text-[#686965] hover:bg-[#F8F9F5] disabled:opacity-35"
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
                    "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[10px] font-semibold transition-colors",
                    cropMode
                      ? "border-[#232323] bg-[#F3F4EF] text-[#232323]"
                      : "border-[#DADBD2] bg-white text-[#686965] hover:bg-[#F8F9F5]"
                  )}
                >
                  <Crop className="size-3.5" /> {cropMode ? "Fit" : "Crop"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleFullscreen()}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#DADBD2] bg-white px-2 text-[10px] font-semibold text-[#686965] hover:bg-[#F8F9F5]"
              >
                <Maximize2 className="size-3.5" />
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </button>
            </div>
          </div>

          <div
            ref={previewStageRef}
            className="relative grid min-h-[460px] place-items-center overflow-auto bg-[#EFEFE9] bg-[linear-gradient(#E7E8E1_1px,transparent_1px),linear-gradient(90deg,#E7E8E1_1px,transparent_1px)] bg-[size:24px_24px] p-4 dark:bg-[linear-gradient(#343531_1px,transparent_1px),linear-gradient(90deg,#343531_1px,transparent_1px)] sm:min-h-[620px] sm:p-8 fullscreen:min-h-dvh"
          >
            {isActive && (
              <div className="flex max-w-sm flex-col items-center px-5 text-center">
                {job.status === "processing" ? (
                  <Loader2 className="size-8 animate-spin text-[#FF4A20]" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-full bg-white text-[11px] font-bold text-[#62635F] shadow-sm">
                    02
                  </span>
                )}
                <h2 className="mt-4 text-[14px] font-semibold text-[#30312E]">
                  {statusCopy.title}
                </h2>
                <p className="mt-1.5 text-[10px] leading-5 text-[#777873]">
                  {statusCopy.description}
                </p>
                <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-[#DADBD2]">
                  <span
                    className={cn(
                      "block h-full rounded-full bg-[#FF4A20]",
                      job.status === "queued" ? "w-[18%]" : "w-[64%] animate-pulse"
                    )}
                  />
                </div>
              </div>
            )}

            {isFailed && (
              <div className="flex w-full min-w-0 max-w-sm flex-col items-center px-5 text-center">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#FEF0EF] text-[#C53A32]">
                  <AlertCircle className="size-5 shrink-0" />
                </span>
                <h2 className="mt-4 text-[14px] font-semibold text-[#30312E]">
                  {statusCopy.title}
                </h2>
                <p className="mt-1.5 min-w-0 break-words text-[10px] leading-5 text-[#777873] [overflow-wrap:anywhere]">
                  {job.error ?? statusCopy.description}
                </p>
                <Button
                  type="button"
                  onClick={() => void handleRetry()}
                  disabled={isRetrying}
                  className="mt-4 h-9 shrink-0 rounded-[9px] bg-[#FF4A20] px-4 text-[10px] text-white hover:bg-[#E9421C]"
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
                  className="w-full rounded-[13px] border-[6px] border-white shadow-[0_20px_50px_rgba(37,38,33,0.18)]"
                />
              </div>
            )}

            {isCompleted && !featured && (
              <div className="flex max-w-sm flex-col items-center text-center">
                <AlertCircle className="size-7 text-[#C53A32]" />
                <h2 className="mt-3 text-[13px] font-semibold">No output was returned</h2>
                <p className="mt-1 text-[10px] leading-5 text-[#777873]">
                  The job completed without a media file. Recreate it from the saved prompt.
                </p>
                <Button
                  type="button"
                  onClick={() => router.push(buildGenerateSimilarHref(job))}
                  className="mt-4 h-9 rounded-[9px]"
                >
                  <Redo2 className="size-3.5" /> Generate similar
                </Button>
              </div>
            )}
          </div>

          {isCompleted && (
            <div className="flex min-h-[92px] items-center gap-2 overflow-x-auto border-t border-[#E1E2DC] px-3 py-2.5">
              <div className="mr-1 w-20 shrink-0">
                <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#92938F]">
                  Variations
                </span>
                <strong className="mt-1 block text-[10px] font-semibold text-[#3F403C]">
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
                    "relative h-[68px] w-[54px] shrink-0 overflow-hidden rounded-[7px] border-2 bg-[#E8E9E2] transition-colors",
                    featured?.id === output.id
                      ? "border-[#FF4A20]"
                      : "border-transparent hover:border-[#BFC0B9]"
                  )}
                >
                  <MediaPreview
                    type={job.type}
                    src={`/api/files/${output.id}`}
                    width={output.width ?? undefined}
                    height={output.height ?? undefined}
                    fill
                    className="size-full rounded-[5px]"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-[#232323]/80 px-1 py-0.5 text-[10px] font-semibold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => router.push(buildGenerateSimilarHref(job))}
                className="flex h-[68px] w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-[7px] border border-dashed border-[#C7C8C1] text-[11px] font-semibold text-[#777873] hover:border-[#FF4A20] hover:text-[#FF4A20]"
              >
                <Plus className="size-4" /> New variation
              </button>
            </div>
          )}
        </div>

        <aside className="min-w-0 overflow-hidden rounded-[14px] border border-[#DADBD2] bg-white xl:sticky xl:top-4">
          <div
            role="tablist"
            aria-label="Generation editor panels"
            className="grid grid-cols-3 border-b border-[#E1E2DC] px-3 pt-2"
          >
            {(["enhance", "details", "prompts"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative h-10 text-[10px] font-semibold capitalize text-[#777873] transition-colors hover:text-[#232323]",
                  activeTab === tab &&
                    "text-[#232323] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[#FF4A20]"
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
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#92938F]">
                    Quick actions
                  </p>
                  <h2 className="mt-1 text-[14px] font-semibold tracking-[-0.02em] text-[#30312E]">
                    Refine this output
                  </h2>
                </div>
                <span className="rounded-full bg-[#EEF5FF] px-2 py-1 text-[11px] font-bold text-[#2A71C7]">
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
                        "min-w-0 rounded-[9px] border p-2.5 text-left transition-colors",
                        active
                          ? "border-[#FF4A20] bg-[#FFF8F5]"
                          : "border-[#DEDFD8] bg-white hover:bg-[#FAFBF7]"
                      )}
                    >
                      <span className="flex items-start gap-2">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#F1F2EC] text-[#62635F]">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-[10px] font-semibold text-[#30312E]">
                            {tool.title}
                          </strong>
                          <small className="mt-1 block text-[11px] leading-3.5 text-[#858681]">
                            {tool.detail}
                          </small>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-[#ECECE7] pt-4">
                <label
                  htmlFor="enhancement-instruction"
                  className="mb-1.5 block text-[10px] font-semibold text-[#686965]"
                >
                  Instruction · {selectedTool.title}
                </label>
                <Textarea
                  id="enhancement-instruction"
                  value={enhancementInstruction}
                  onChange={(event) => setEnhancementInstruction(event.target.value)}
                  className="min-h-[104px] resize-none rounded-[9px] border-[#D7D8D0] bg-[#FCFCFA] text-[10px] leading-4 shadow-none"
                />
              </div>

              <label className="block">
                <span className="mb-2 flex items-center justify-between text-[10px] font-semibold text-[#686965]">
                  Edit strength <strong className="text-[#232323]">{editStrength}%</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={editStrength}
                  onChange={(event) => setEditStrength(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-[#FF4A20]"
                />
              </label>

              <div className="flex items-center justify-between gap-3 rounded-[9px] border border-[#E1E2DC] bg-[#FAFBF7] px-3 py-2.5">
                <span>
                  <strong className="block text-[10px] font-semibold text-[#363733]">
                    Preserve subject
                  </strong>
                  <small className="mt-0.5 block text-[11px] text-[#92938E]">
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
                className="h-11 w-full rounded-[9px] bg-[#FF4A20] text-[10px] font-semibold text-white hover:bg-[#E9421C]"
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
                    ? "Continue this video"
                    : "Apply enhancement"}
                {isCompleted && job.type === "image" && (
                  <span className="ml-auto opacity-75">{formatCost(job.estimatedCost)}</span>
                )}
              </Button>
            </div>
          )}

          {activeTab === "details" && (
            <div className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#92938F]">
                Output details
              </p>
              <h2 className="mt-1 text-[14px] font-semibold tracking-[-0.02em] text-[#30312E]">
                Generation record
              </h2>
              <dl className="mt-4 divide-y divide-[#ECECE7] rounded-[9px] border border-[#E1E2DC] px-3">
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
                    className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-2.5 text-[10px]"
                  >
                    <dt className="text-[#858681]">{label}</dt>
                    <dd className="truncate text-right font-semibold capitalize text-[#3F403C]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 rounded-[9px] bg-[#F3F4EF] p-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#92938F]">
                  Source
                </span>
                <strong className="mt-1 block text-[10px] font-semibold text-[#30312E]">
                  Generate Studio
                </strong>
                <small className="mt-1 block min-w-0 break-words text-[11px] text-[#858681] [overflow-wrap:anywhere]">
                  Job {job.id}
                </small>
              </div>
            </div>
          )}

          {activeTab === "prompts" && (
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#92938F]">
                    Prompt record
                  </p>
                  <h2 className="mt-1 text-[14px] font-semibold tracking-[-0.02em] text-[#30312E]">
                    Recreate or remix
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopyPrompt()}
                  className="h-7 rounded-lg border-[#DADBD2] bg-white px-2 text-[10px]"
                >
                  <Copy className="size-3" /> Copy
                </Button>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold text-[#686965]">Main prompt</p>
                <div className="min-w-0 break-words rounded-[9px] border border-[#E1E2DC] bg-[#FAFBF7] p-3 text-[10px] leading-5 text-[#4F504C] [overflow-wrap:anywhere]">
                  {job.prompt}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold text-[#686965]">
                  Negative prompt
                </p>
                <div className="min-w-0 break-words rounded-[9px] border border-[#E1E2DC] bg-[#F3F4EF] p-3 text-[10px] leading-5 text-[#777873] [overflow-wrap:anywhere]">
                  {negativePrompt ?? "No negative prompt was used."}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    job.type === "video"
                      ? buildContinueVideoHref(job, featured?.id)
                      : buildGenerateSimilarHref(job)
                  )
                }
                className="h-10 w-full rounded-[9px] border-[#DADBD2] bg-white text-[10px]"
              >
                <Redo2 className="size-3.5" />{" "}
                {job.type === "video"
                  ? "Continue this video"
                  : "Remix in Generate Studio"}
              </Button>
            </div>
          )}

          <div className="min-w-0 border-t border-[#E1E2DC] p-4 pb-[max(16px,env(safe-area-inset-bottom))] [&_[role=alert]]:min-w-0 [&_[role=alert]]:break-words [&_[role=alert]]:[overflow-wrap:anywhere] [&_[role=status]]:min-w-0 [&_[role=status]]:break-words [&_[role=status]]:[overflow-wrap:anywhere] [&_[role=alert]_svg]:shrink-0 [&_[role=status]_svg]:shrink-0">
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
                    "flex min-w-0 items-start gap-2 rounded-lg px-3 py-2.5 text-[10px] leading-4",
                    feedback.tone === "error"
                      ? "bg-[#FEF0EF] text-[#C53A32]"
                      : "bg-[#EAF8ED] text-[#238A40]"
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
                  className="h-9 rounded-[9px] border-[#DADBD2] bg-white text-[10px] xl:hidden"
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
                  className="h-9 rounded-[9px] border-[#DADBD2] bg-white text-[10px] xl:hidden"
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
                    className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[9px] border border-dashed border-[#E5AAA3] text-[10px] font-semibold text-[#C53A32] transition-colors hover:bg-[#FEF0EF] disabled:opacity-50"
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
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[9px] border border-[#DADBD2] text-[10px] font-semibold text-[#686965] transition-colors hover:bg-[#F3F4EF]"
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
