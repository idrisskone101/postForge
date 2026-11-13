"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CloneOutputReviewDetail,
  type CloneOutputReviewJob,
  type CloneOutputReviewOutput,
} from "@/components/clone-output-review-detail";
import {
  EmptyState,
  Skeleton,
  buttonClass,
} from "@/components/workbench";
import { CloneOutputHeader } from "./clone-output-header";
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

  const dismissFeedback = useCallback(() => setActionFeedback(null), []);

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

  if (isLoading && !job) return <CloneOutputLoading />;

  if (error && !job) {
    const notFound = error.message === "Job not found";
    return (
      <div className="pf-content-viewport flex min-w-0 flex-col gap-3">
        <CloneOutputHeader />
        <section className="wb-panel flex-1 justify-center">
          <EmptyState
            icon={notFound ? "clone" : "alert"}
            tone={notFound ? "empty" : "error"}
            title={notFound ? "Clone job not found" : "Clone job could not load"}
            detail={notFound ? undefined : error.message}
            className="min-w-0 [overflow-wrap:anywhere]"
          >
            <Link href="/jobs" className={buttonClass("strong")}>
              Open jobs
            </Link>
          </EmptyState>
        </section>
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
    <div className="pf-content-viewport flex min-w-0 flex-col gap-3">
      <CloneOutputHeader />
      <CloneOutputReviewDetail
        review={{
          job: displayedJob,
          isRetrying,
          pendingReviewStatus,
          handoffState,
          actionFeedback,
          onDismissFeedback: dismissFeedback,
          onRetry: handleRetry,
          onDownload: handleDownload,
          onReviewStatusChange: handleReviewStatusChange,
          onHandoff: handleHandoff,
          onNewClone: () => router.push("/ugc-clone"),
        }}
      />
    </div>
  );
}

function CloneOutputLoading() {
  return (
    <div className="pf-content-viewport flex min-w-0 flex-col gap-3" aria-busy="true">
      <CloneOutputHeader />
      <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row">
        <Skeleton shape="panel" className="block min-h-[420px] flex-1 xl:min-h-[682px]" />
        <div className="grid content-start gap-3 lg:grid-cols-2 xl:flex xl:w-[380px] xl:shrink-0 xl:flex-col">
          <Skeleton shape="panel" className="block h-[178px]" />
          <Skeleton shape="panel" className="block h-[188px]" />
          <Skeleton shape="panel" className="block h-[128px]" />
          <Skeleton shape="panel" className="block h-[120px]" />
        </div>
      </div>
    </div>
  );
}
