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
      <div className="pf-content-viewport grid min-w-0 place-items-center px-5">
        <div className="w-full min-w-0 max-w-md text-center">
          <h1 className="text-[15px] font-semibold">Loading clone job</h1>
          <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
            Fetching outputs and review status.
          </p>
          <Skeleton className="mx-auto mt-5 h-10 w-40 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="pf-content-viewport grid min-w-0 place-items-center px-5">
        <div className="w-full min-w-0 max-w-md rounded-lg border border-destructive/40 bg-white p-6 text-center">
          <AlertCircle className="mx-auto size-5 text-destructive" />
          <h1 className="mt-4 text-[15px] font-semibold">Clone job could not load</h1>
          <p className="mt-2 min-w-0 break-words text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            {error.message}
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
