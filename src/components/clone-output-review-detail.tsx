"use client";

import { type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  Loader2,
  PlayCircle,
  RefreshCw,
  Send,
  Users,
  X,
} from "lucide-react";
import { MediaPreviewFrame } from "@/components/media-preview";
import { OutputReviewStatusControl } from "@/components/output-review-status-control";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import type { SerializedOutputReviewStatus } from "@/lib/output-review-status";

export interface CloneOutputReviewOutput {
  id: string;
  url: string;
  type: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  fileSizeBytes: number | null;
  reviewStatus: SerializedOutputReviewStatus;
  createdAt: string;
}

export interface CloneOutputReviewJob {
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
  outputs: CloneOutputReviewOutput[];
  tikTokSource: {
    id: string;
    label: string;
    originalUrl: string;
  } | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface SourceVideoInput {
  sourceId: string;
  label: string;
  originalUrl: string;
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
}

function parseSourceVideo(value: unknown): SourceVideoInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  if (
    typeof input.sourceId !== "string" ||
    typeof input.label !== "string" ||
    typeof input.originalUrl !== "string" ||
    typeof input.localPath !== "string" ||
    typeof input.filename !== "string" ||
    typeof input.durationSec !== "number" ||
    typeof input.width !== "number" ||
    typeof input.height !== "number"
  ) {
    return null;
  }

  return {
    sourceId: input.sourceId,
    label: input.label,
    originalUrl: input.originalUrl,
    localPath: input.localPath,
    filename: input.filename,
    durationSec: input.durationSec,
    width: input.width,
    height: input.height,
  };
}

function getStringInput(input: Record<string, unknown>, key: string) {
  return typeof input[key] === "string" ? input[key] : null;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return minutes > 0
    ? `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    : `${remainingSeconds}s`;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  const megabytes = bytes / 1_000_000;
  return `${megabytes.toFixed(megabytes >= 10 ? 1 : 2)}MB`;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-white/[0.02] px-5 py-4">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CloneOutputReviewDetail({
  job,
  isRetrying,
  onBack,
  onRetry,
  onDownload,
  onNewClone,
}: {
  job: CloneOutputReviewJob;
  isRetrying: boolean;
  onBack: () => void;
  onRetry: () => void;
  onDownload: (output: CloneOutputReviewOutput) => void;
  onNewClone: () => void;
}) {
  const isActive = job.status === "queued" || job.status === "processing";
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const featured = job.outputs[0];
  const sourceVideo = parseSourceVideo(job.input.sourceVideo);
  const avatarId = getStringInput(job.input, "avatarId");
  const avatarPreviewUrl = avatarId
    ? `/api/avatars/${encodeURIComponent(avatarId)}`
    : null;
  const identityName =
    getStringInput(job.input, "avatarName") ??
    getStringInput(job.input, "identityName") ??
    "AI avatar profile";
  const referenceImageFileId = getStringInput(job.input, "referenceImageFileId");
  const savedReferenceId = getStringInput(job.input, "savedReferenceId");
  const referencePreviewUrl = savedReferenceId
    ? `/api/ugc-clone/references/${savedReferenceId}`
    : referenceImageFileId
      ? `/api/files/${referenceImageFileId}`
      : null;
  const sourceTitle =
    sourceVideo?.label ?? job.tikTokSource?.label ?? "Source clip unavailable";
  const sourceUrl = sourceVideo?.originalUrl ?? job.tikTokSource?.originalUrl;
  const sourcePreviewUrl = sourceVideo
    ? `/api/ugc-clone/preview?path=${encodeURIComponent(sourceVideo.localPath)}`
    : null;
  const featuredSize = featured
    ? [featured.width && featured.height ? `${featured.width}x${featured.height}` : null, formatBytes(featured.fileSizeBytes)]
        .filter(Boolean)
        .join(" | ")
    : null;
  const previewWidth = featured?.width ?? sourceVideo?.width;
  const previewHeight = featured?.height ?? sourceVideo?.height;

  return (
    <div className="min-h-screen animate-fade-in-up">
      <div className="border-b border-border bg-background/60 px-5 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
              aria-label="Back to previous page"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Users className="size-4 text-accent-green" />
                <h1 className="text-xl font-semibold tracking-tight">
                  Clone Output
                </h1>
                <span className="rounded-md bg-muted px-2.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                  {job.id.slice(0, 8)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Review and approve your generated media asset.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {isRetrying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
            {featured && (
              <button
                type="button"
                onClick={() => onDownload(featured)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Download className="size-4" />
                Download
              </button>
            )}
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-coral px-4 text-sm font-semibold text-white transition-colors hover:bg-[#ff6540]"
            >
              <Send className="size-4" />
              Handoff
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1280px] gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-border bg-black p-3">
            <div className="relative">
              {isActive && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-card/80 text-center backdrop-blur-sm">
                  <Loader2 className="mb-4 size-10 animate-spin text-accent-blue" />
                  <p className="text-sm font-semibold">
                    {job.status === "queued"
                      ? "Waiting in queue..."
                      : "Cloning motion..."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This may take a few minutes
                  </p>
                </div>
              )}

              {isFailed && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-lg bg-card/90 p-6 text-center">
                  <AlertCircle className="size-8 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">
                      Clone Failed
                    </p>
                    {job.error && (
                      <p className="mt-1 max-w-sm text-xs text-destructive/80">
                        {job.error}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isCompleted && featured ? (
                <MediaPreviewFrame
                  type={featured.type === "image" ? "image" : "video"}
                  src={`/api/files/${featured.id}`}
                  width={previewWidth}
                  height={previewHeight}
                  alt={job.prompt}
                  variant="detail"
                  showMetadata
                  className="w-full rounded-lg"
                  actions={
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDownload(featured)}
                        className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
                      >
                        <Download className="size-3.5" />
                        Download
                      </button>
                      <OutputReviewStatusControl
                        outputId={featured.id}
                        reviewStatus={featured.reviewStatus}
                        compact
                      />
                    </div>
                  }
                />
              ) : (
                <div className="flex min-h-[min(720px,calc(100dvh-20rem))] items-center justify-center rounded-lg bg-zinc-950 text-sm text-muted-foreground">
                  Output preview will appear here.
                </div>
              )}
            </div>

            {featured && (
              <div className="mt-3 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {featured.filename}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {[featuredSize, job.model].filter(Boolean).join(" | ")}
                  </p>
                </div>
                <OutputReviewStatusControl
                  outputId={featured.id}
                  reviewStatus={featured.reviewStatus}
                />
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
            >
              <span>
                <span className="block text-sm font-semibold">
                  Approve Output
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Ready for handoff
                </span>
              </span>
              <Check className="size-5 text-accent-green" />
            </button>
            <button
              type="button"
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
            >
              <span>
                <span className="block text-sm font-semibold">
                  Reject Output
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Not usable
                </span>
              </span>
              <X className="size-5 text-red-400" />
            </button>
            <button
              type="button"
              onClick={onNewClone}
              className="flex items-center justify-between rounded-xl border border-dashed border-accent-coral/40 bg-card p-4 text-left text-accent-coral transition-colors hover:border-accent-coral hover:bg-accent-coral/5"
            >
              <span>
                <span className="block text-sm font-semibold">New Clone</span>
                <span className="mt-1 block text-[11px] text-accent-coral/70">
                  Return to Clone
                </span>
              </span>
              <Users className="size-5" />
            </button>
          </div>
        </div>

        <aside className="space-y-5">
          <DetailSection title="Source Selection">
            <div className="space-y-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{sourceTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sourceVideo
                    ? `${sourceVideo.width}x${sourceVideo.height} | ${formatDuration(sourceVideo.durationSec)}`
                    : "Original source context"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-blue hover:underline"
                    >
                      View original
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
              {sourcePreviewUrl && sourceVideo && (
                <details className="rounded-xl border border-border bg-black/40 p-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <PlayCircle className="size-3.5 text-accent-green" />
                      View source video
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {formatDuration(sourceVideo.durationSec)}
                    </span>
                  </summary>
                  <div className="mt-2 overflow-hidden rounded-lg bg-black">
                    <video
                      src={sourcePreviewUrl}
                      width={sourceVideo.width}
                      height={sourceVideo.height}
                      controls
                      preload="metadata"
                      className="max-h-80 w-full object-contain"
                    />
                  </div>
                </details>
              )}
            </div>
          </DetailSection>

          <DetailSection title="Identity Used">
            <div className="flex items-center gap-4">
              {avatarPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreviewUrl}
                  alt={`${identityName} avatar`}
                  className="size-12 shrink-0 rounded-full border border-border bg-white/[0.05] object-cover"
                />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-white/[0.05]">
                  <Users className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{identityName}</p>
                <p className="mt-1 text-[11px] uppercase tracking-tight text-muted-foreground">
                  Identity preserved for clone
                </p>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Production State">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                  Spend
                </p>
                <p className="text-lg font-semibold tracking-tight">
                  {formatCost(job.actualCost ?? job.estimatedCost)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                  Generation Time
                </p>
                <p className="text-lg font-semibold tracking-tight">
                  {job.durationMs !== null
                    ? `${(job.durationMs / 1000).toFixed(0)}s`
                    : "Pending"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Job Status</span>
                <span className="capitalize">{job.status}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Model</span>
                <span className="text-right">{job.model}</span>
              </div>
              {featured?.width && featured.height && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Resolution</span>
                  <span>{featured.width}x{featured.height}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Created</span>
                <span>{formatRelativeDate(job.createdAt)}</span>
              </div>
            </div>
          </DetailSection>

          {referencePreviewUrl && (
            <DetailSection title="Reference">
              <a
                href={referencePreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-border bg-black"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referencePreviewUrl}
                  alt="Reference image used for this clone"
                  className="max-h-56 w-full object-contain transition-opacity hover:opacity-90"
                />
              </a>
            </DetailSection>
          )}
        </aside>
      </div>
    </div>
  );
}
