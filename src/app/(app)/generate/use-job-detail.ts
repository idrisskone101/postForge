"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { userErrorMessage } from "@/lib/user-error-message";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { usePolling } from "@/lib/hooks/use-polling";
import { downloadFile } from "@/lib/utils/download";
import {
  buildContinueVideoHref,
  buildEnhancementRequest,
  buildGenerateSimilarHref,
  type JobDetail,
  type JobOutput,
} from "@/lib/generation-editor";
import {
  ENHANCEMENT_TOOLS,
  getEditorTitle,
  type EnhancementTool,
  type JobFeedback,
} from "./job-enhancements";

export function useJobDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const previewStageRef = useRef<HTMLDivElement>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [featuredIdx, setFeaturedIdx] = useState(0);
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
  const [feedback, setFeedback] = useState<JobFeedback>(null);

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

  return {
    router,
    previewStageRef,
    job,
    isLoading,
    error,
    isRetrying,
    isDownloading,
    isDiscarding,
    isApplying,
    featuredIdx,
    setFeaturedIdx,
    previewZoom,
    setPreviewZoom,
    cropMode,
    setCropMode,
    isFullscreen,
    selectedEnhancement,
    setSelectedEnhancement,
    enhancementInstruction,
    setEnhancementInstruction,
    editStrength,
    setEditStrength,
    preserveSubject,
    setPreserveSubject,
    feedback,
    showSuccess,
    handleRetry,
    handleDownload,
    handleShare,
    handleFullscreen,
    handleApplyEnhancement,
    handleDiscard,
    handleCopyPrompt,
  };
}
