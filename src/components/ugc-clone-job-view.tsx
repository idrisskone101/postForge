"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";

import { apiGet, apiPost } from "@/lib/api/client";
import { MediaPreview } from "@/components/media-preview";
import { Button } from "@/components/ui/button";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { downloadFile } from "@/lib/utils/download";
import { cn } from "@/lib/utils";

export interface UGCCloneJobOutput {
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

export interface UGCCloneJobDetail {
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
  outputs: UGCCloneJobOutput[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface UseUGCCloneJobResult {
  job: UGCCloneJobDetail | null;
  isLoading: boolean;
  error: Error | null;
  isRetrying: boolean;
  retryJob: () => Promise<string | null>;
}

export function useUGCCloneJob(jobId?: string | null): UseUGCCloneJobResult {
  const [job, setJob] = useState<UGCCloneJobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(jobId));
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    setIsLoading(true);
    setError(null);

    const poll = async () => {
      try {
        const result = await apiGet<UGCCloneJobDetail>(`/api/jobs/${jobId}`);
        if (!active) return;

        setJob(result);
        setError(null);
        setIsLoading(false);

        if (result.status === "queued" || result.status === "processing") {
          timeoutId = setTimeout(poll, 5000);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };

    poll();

    return () => {
      active = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [jobId]);

  const retryJob = useCallback(async () => {
    if (!job) return null;

    setIsRetrying(true);
    try {
      const result = await apiPost<{ id: string }>(`/api/jobs/${job.id}/retry`, {});
      return result.id;
    } finally {
      setIsRetrying(false);
    }
  }, [job]);

  return { job, isLoading, error, isRetrying, retryJob };
}

interface UGCCloneJobStageProps {
  job: UGCCloneJobDetail | null;
  isLoading: boolean;
  error: Error | null;
  isRetrying?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function UGCCloneJobStage({
  job,
  isLoading,
  error,
  isRetrying = false,
  onRetry,
  className,
}: UGCCloneJobStageProps) {
  const featured = job?.outputs[0];
  const isActive = job?.status === "queued" || job?.status === "processing";
  const isFailed = job?.status === "failed";
  const isCompleted = job?.status === "completed" && featured;

  return (
    <div
      className={cn(
        "relative flex h-[52vh] min-h-[300px] max-h-[580px] w-full items-center justify-center overflow-hidden rounded-[28px] border border-border/70 bg-card/80 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl lg:h-[44vh]",
        className
      )}
    >
      {isLoading && !job ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-accent-green" />
          <div>
            <p className="text-sm font-semibold">Loading clone</p>
            <p className="text-xs text-muted-foreground">Fetching the latest job state.</p>
          </div>
        </div>
      ) : null}

      {error && !job ? (
        <div className="max-w-sm rounded-[24px] border border-destructive/30 bg-destructive/10 px-6 py-5 text-center">
          <AlertCircle className="mx-auto mb-3 size-5 text-destructive" />
          <p className="text-sm font-semibold text-destructive">Failed to load clone</p>
          <p className="mt-1 text-xs text-destructive/80">{error.message}</p>
        </div>
      ) : null}

      {job ? (
        <>
          {isCompleted ? (
            <div className="flex h-full w-full items-center justify-center rounded-[24px] border border-border/60 bg-background/50 p-3 sm:p-5">
              <div className="flex h-full w-full max-w-[420px] items-center justify-center">
                <MediaPreview
                  type="video"
                  src={`/api/files/${featured.id}`}
                  width={featured.width ?? undefined}
                  height={featured.height ?? undefined}
                  alt={job.prompt}
                  className="h-full w-full"
                />
              </div>
            </div>
          ) : null}

          {!isCompleted ? (
            <div className="flex h-full w-full items-center justify-center rounded-[24px] border border-border/60 bg-background/40 px-6 py-10 text-center">
              {isActive ? (
                <div className="max-w-sm">
                  <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-muted border-t-accent-coral" />
                  <p className="text-base font-semibold">
                    {job.status === "queued" ? "Clone queued" : "Cloning motion"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your latest job is running. This view will update automatically.
                  </p>
                </div>
              ) : null}

              {isFailed ? (
                <div className="max-w-sm">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertCircle className="size-5" />
                  </div>
                  <p className="text-base font-semibold text-destructive">Clone failed</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {job.error ?? "The clone could not be generated. Retry from here or open the permalink."}
                  </p>
                  {onRetry ? (
                    <Button
                      size="lg"
                      onClick={onRetry}
                      disabled={isRetrying}
                      className="mt-5 h-auto rounded-full bg-accent-coral px-5 py-2.5 text-white hover:bg-[#ff6540]"
                    >
                      {isRetrying ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="size-4" />
                          Retry Clone
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

interface UGCCloneJobInfoProps {
  job: UGCCloneJobDetail;
  isRetrying?: boolean;
  onRetry?: () => void;
  onClear?: () => void;
  clearLabel?: string;
  permalinkHref?: string;
}

export function UGCCloneJobInfo({
  job,
  isRetrying = false,
  onRetry,
  onClear,
  clearLabel = "Back to Editor",
  permalinkHref,
}: UGCCloneJobInfoProps) {
  const featured = job.outputs[0];
  const isCompleted = job.status === "completed" && featured;
  const isFailed = job.status === "failed";
  const statusTone =
    job.status === "completed"
      ? "text-accent-green bg-accent-green/10 border-accent-green/20"
      : job.status === "failed"
        ? "text-destructive bg-destructive/10 border-destructive/20"
        : "text-accent-blue bg-accent-blue/10 border-accent-blue/20";
  const referenceImageFileId =
    typeof job.input.referenceImageFileId === "string" ? job.input.referenceImageFileId : null;

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-border bg-card/90 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              Current Clone
            </p>
            <h3 className="mt-2 text-lg font-semibold">Job {job.id.slice(0, 8)}</h3>
          </div>
          <span className={cn("rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", statusTone)}>
            {job.status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Metric label="Model" value={job.model} />
          <Metric label="Est. Cost" value={formatCost(job.estimatedCost)} />
          {job.actualCost !== null ? <Metric label="Actual Cost" value={formatCost(job.actualCost)} /> : null}
          {job.durationMs !== null ? (
            <Metric label="Gen Time" value={`${(job.durationMs / 1000).toFixed(1)}s`} />
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-border/70 bg-background/40 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Created {formatRelativeDate(job.createdAt)}</span>
            {job.completedAt ? <span>Completed {formatRelativeDate(job.completedAt)}</span> : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {isCompleted ? (
            <Button
              onClick={() => downloadFile(`/api/files/${featured.id}/download`, featured.filename)}
              className="h-auto rounded-full bg-accent-coral px-4 py-2 text-white hover:bg-[#ff6540]"
            >
              <Download className="size-4" />
              Download
            </Button>
          ) : null}

          {isFailed && onRetry ? (
            <Button
              variant="outline"
              onClick={onRetry}
              disabled={isRetrying}
              className="h-auto rounded-full px-4 py-2"
            >
              {isRetrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {isRetrying ? "Retrying..." : "Retry"}
            </Button>
          ) : null}

          {onClear ? (
            <Button variant="outline" onClick={onClear} className="h-auto rounded-full px-4 py-2">
              {clearLabel}
            </Button>
          ) : null}

          {permalinkHref ? (
            <Button
              variant="ghost"
              render={<Link href={permalinkHref} />}
              className="h-auto rounded-full px-3 py-2 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-4" />
              Permalink
            </Button>
          ) : null}
        </div>
      </div>

      {referenceImageFileId ? (
        <div className="rounded-[28px] border border-border bg-card/90 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Reference Image
          </p>
          <a
            href={`/api/files/${referenceImageFileId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block overflow-hidden rounded-[22px] border border-border/60 bg-background/40 p-2"
          >
            <img
              src={`/api/files/${referenceImageFileId}`}
              alt="Reference image used for this clone"
              className="h-44 w-full rounded-[18px] object-cover transition-transform duration-200 hover:scale-[1.02]"
            />
          </a>
          <p className="mt-2 text-xs text-muted-foreground">
            The approved composite used as the visual anchor for the motion transfer.
          </p>
        </div>
      ) : null}

      {job.prompt ? (
        <div className="rounded-[28px] border border-border bg-card/90 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Prompt
          </p>
          <div className="mt-3 rounded-[22px] border border-border/60 bg-background/40 p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{job.prompt}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
