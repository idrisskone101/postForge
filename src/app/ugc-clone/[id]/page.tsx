"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import {
  CloneOutputReviewDetail,
  type CloneOutputReviewJob,
  type CloneOutputReviewOutput,
} from "@/components/clone-output-review-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolling } from "@/lib/hooks/use-polling";
import { apiGet, apiPost } from "@/lib/api/client";
import { downloadFile } from "@/lib/utils/download";
import type {
  OutputReviewStatus,
  SerializedOutputReviewStatus,
} from "@/lib/output-review-status";
import {
  handoffCloneOutput,
  updateCloneOutputReviewStatus,
  writeCloneHandoffText,
} from "@/lib/clone-output-actions";

export default function UGCCloneJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [reviewOverrides, setReviewOverrides] = useState<
    Record<string, SerializedOutputReviewStatus>
  >({});
  const [pendingReviewStatus, setPendingReviewStatus] =
    useState<OutputReviewStatus | null>(null);
  const [handoffState, setHandoffState] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const fetchJob = useCallback(
    () => apiGet<CloneOutputReviewJob>(`/api/jobs/${id}`),
    [id]
  );

  const shouldStop = useCallback(
    (data: CloneOutputReviewJob) =>
      data.status === "completed" || data.status === "failed",
    []
  );

  const { data: job, isLoading, error } = usePolling<CloneOutputReviewJob>(
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
      router.push(`/ugc-clone/${result.id}`);
    } catch (error) {
      setIsRetrying(false);
      setActionFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to retry clone.",
      });
    }
  };

  const handleDownload = (output: CloneOutputReviewOutput) => {
    downloadFile(`/api/files/${output.id}/download`, output.filename);
  };

  const handleReviewStatusChange = async (
    output: CloneOutputReviewOutput,
    reviewStatus: OutputReviewStatus
  ) => {
    if (pendingReviewStatus) return;
    setPendingReviewStatus(reviewStatus);
    setActionFeedback(null);

    try {
      const updatedStatus = await updateCloneOutputReviewStatus({
        outputId: output.id,
        reviewStatus,
      });
      setReviewOverrides((current) => ({
        ...current,
        [output.id]: updatedStatus,
      }));
      setActionFeedback({
        tone: "success",
        message:
          reviewStatus === "approved_output"
            ? "Output approved and ready for handoff."
            : "Output rejected. Retry when you are ready to create another version.",
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update output review status.",
      });
    } finally {
      setPendingReviewStatus(null);
    }
  };

  const handleHandoff = async (output: CloneOutputReviewOutput) => {
    if (handoffState === "pending") return;
    setHandoffState("pending");
    setActionFeedback(null);

    try {
      await handoffCloneOutput({
        outputId: output.id,
        origin: window.location.origin,
        writeText: writeCloneHandoffText,
      });
      setHandoffState("success");
      setActionFeedback({
        tone: "success",
        message: "Handoff link copied. Share it with your editor or publishing team.",
      });
    } catch (error) {
      setHandoffState("error");
      setActionFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Failed to copy the handoff link.",
      });
    }
  };

  if (isLoading && !job) {
    return (
      <div className="pf-content-viewport p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="size-9 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <Skeleton className="min-h-[520px] rounded-lg" />
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="pf-content-viewport flex min-w-0 items-center justify-center p-6">
        <div className="flex w-full min-w-0 max-w-xl items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-4">
          <AlertCircle className="size-5 shrink-0 text-destructive" />
          <p className="min-w-0 flex-1 break-words text-sm text-destructive [overflow-wrap:anywhere]">
            Failed to load job: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const displayedJob: CloneOutputReviewJob = {
    ...job,
    outputs: job.outputs.map((output) => ({
      ...output,
      reviewStatus: reviewOverrides[output.id] ?? output.reviewStatus,
    })),
  };

  return (
    <CloneOutputReviewDetail
      review={{
        job: displayedJob,
        isRetrying,
        pendingReviewStatus,
        handoffState,
        actionFeedback,
        onBack: () => router.back(),
        onRetry: handleRetry,
        onDownload: handleDownload,
        onReviewStatusChange: handleReviewStatusChange,
        onHandoff: handleHandoff,
        onNewClone: () => router.push("/ugc-clone"),
      }}
    />
  );
}
