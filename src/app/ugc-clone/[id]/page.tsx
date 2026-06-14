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

export type { CloneOutputReviewJob } from "@/components/clone-output-review-detail";

export default function UGCCloneJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

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
    } catch {
      setIsRetrying(false);
    }
  };

  const handleDownload = (output: CloneOutputReviewOutput) => {
    downloadFile(`/api/files/${output.id}/download`, output.filename);
  };

  if (isLoading && !job) {
    return (
      <div className="min-h-screen p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="min-h-[520px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-4">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-destructive">
            Failed to load job: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <CloneOutputReviewDetail
      job={job}
      isRetrying={isRetrying}
      onBack={() => router.back()}
      onRetry={handleRetry}
      onDownload={handleDownload}
      onNewClone={() => router.push("/ugc-clone")}
    />
  );
}
