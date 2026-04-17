"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePolling } from "@/lib/hooks/use-polling";
import { apiGet, apiPost } from "@/lib/api/client";
import { MediaPreview } from "@/components/media-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
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
  tikTokSource: {
    id: string;
    label: string;
    originalUrl: string;
  } | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export default function UGCCloneJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

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
      router.push(`/ugc-clone/${result.id}`);
    } catch {
      setIsRetrying(false);
    }
  };

  if (isLoading && !job) {
    return (
      <div className="min-h-screen md:ml-24 p-6 lg:p-8 flex flex-col animate-fade-in-up">
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="flex-1 min-h-[400px] rounded-lg" />
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen md:ml-24 p-6 lg:p-8 flex items-center justify-center">
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

  const isActive = job.status === "queued" || job.status === "processing";
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const featured = job.outputs[0];
  const referenceImageFileId =
    typeof job.input.referenceImageFileId === "string"
      ? job.input.referenceImageFileId
      : null;
  const savedReferenceId =
    typeof job.input.savedReferenceId === "string"
      ? job.input.savedReferenceId
      : null;
  const referencePreviewUrl = savedReferenceId
    ? `/api/ugc-clone/references/${savedReferenceId}`
    : referenceImageFileId
      ? `/api/files/${referenceImageFileId}`
      : null;

  return (
    <div className="min-h-screen md:ml-24 p-6 lg:p-8 flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex size-9 items-center justify-center rounded-lg bg-card border border-border hover:bg-muted transition-colors duration-150"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-3">
          <Users className="size-4 text-accent-coral" />
          <h1 className="text-lg font-bold">UGC Clone Result</h1>
          <span className="rounded-md bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground font-mono">
            {job.model}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {job.id.slice(0, 8)}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {isCompleted && featured && (
            <button
              type="button"
              onClick={() => downloadFile(`/api/files/${featured.id}/download`, featured.filename)}
              className="flex items-center gap-2 rounded-md bg-accent-coral px-5 py-2 text-sm font-bold text-white transition-all duration-150 hover:bg-[#ff6540] uppercase tracking-wider"
            >
              <Download className="size-4" />
              Download
            </button>
          )}
        </div>
      </div>

      {/* Main preview */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative flex-1 launch-card bg-card border border-border overflow-hidden flex items-center justify-center min-h-[400px]">
            {/* Processing overlay */}
            {isActive && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm">
                <div className="relative mb-4">
                  <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-accent-coral" />
                </div>
                <p className="text-sm font-medium">
                  {job.status === "queued"
                    ? "Waiting in queue..."
                    : "Cloning motion..."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This may take a few minutes
                </p>
              </div>
            )}

            {/* Failed overlay */}
            {isFailed && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-center">
                  <AlertCircle className="mx-auto mb-2 size-5 text-destructive" />
                  <p className="text-sm font-medium text-destructive">Clone Failed</p>
                  {job.error && (
                    <p className="mt-1 max-w-sm text-xs text-destructive/80">{job.error}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex items-center gap-2 rounded-md bg-accent-coral px-5 py-2 text-sm font-bold text-white transition-all duration-150 hover:bg-[#ff6540] disabled:opacity-50 uppercase tracking-wider"
                >
                  {isRetrying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  {isRetrying ? "Retrying..." : "Retry Clone"}
                </button>
              </div>
            )}

            {/* Completed preview */}
            {isCompleted && featured && (
              <div className="w-full h-full flex items-center justify-center p-6">
                <MediaPreview
                  type="video"
                  src={`/api/files/${featured.id}`}
                  width={featured.width ?? undefined}
                  height={featured.height ?? undefined}
                  alt={job.prompt}
                  className="max-w-full max-h-full rounded-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Details panel */}
        <div className="w-full lg:w-[360px] shrink-0 space-y-6">
          <div className="launch-card bg-card border border-border p-6">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Details
            </p>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Est. Cost</p>
                  <p className="font-medium font-mono">{formatCost(job.estimatedCost)}</p>
                </div>
                {job.actualCost !== null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Actual Cost</p>
                    <p className="font-medium font-mono">{formatCost(job.actualCost)}</p>
                  </div>
                )}
                {job.durationMs !== null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Gen Time</p>
                    <p className="font-medium font-mono">{(job.durationMs / 1000).toFixed(1)}s</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                  <p className="font-medium capitalize">{job.status}</p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground font-mono">
                  <span>Created {formatRelativeDate(job.createdAt)}</span>
                  {job.completedAt && <span>Done {formatRelativeDate(job.completedAt)}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Reference Image card */}
          {referencePreviewUrl && (
            <div className="launch-card bg-card border border-border p-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Reference Image
              </p>
              <a href={referencePreviewUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referencePreviewUrl}
                  alt="Reference image used for this clone"
                  className="w-full rounded-lg object-cover hover:opacity-90 transition-opacity duration-150"
                />
              </a>
              <p className="mt-2 text-[10px] text-muted-foreground">
                AI-generated composite used as scene basis
              </p>
            </div>
          )}

          {/* Prompt card */}
          {job.prompt && (
            <div className="launch-card bg-card border border-border p-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Prompt
              </p>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm italic leading-relaxed text-muted-foreground">
                  {job.prompt}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-md bg-accent-coral/10 px-2.5 py-1 text-[10px] font-bold text-accent-coral">
                  UGC Clone
                </span>
                <span className="rounded-md bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground font-mono">
                  {job.model}
                </span>
              </div>
            </div>
          )}

          {job.tikTokSource && (
            <div className="launch-card bg-card border border-border p-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                TikTok Source
              </p>
              <p className="text-sm font-medium">{job.tikTokSource.label}</p>
              <a
                href={job.tikTokSource.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-xs text-accent-blue hover:underline"
              >
                Open Original TikTok
              </a>
            </div>
          )}

          {/* New clone button */}
          <button
            type="button"
            onClick={() => router.push("/ugc-clone")}
            className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-accent-coral/40 px-4 py-3 text-sm font-bold text-accent-coral transition-colors duration-150 hover:border-accent-coral hover:bg-accent-coral/5 uppercase tracking-wider"
          >
            <Users className="size-4" />
            New Clone
          </button>
        </div>
      </div>
    </div>
  );
}
