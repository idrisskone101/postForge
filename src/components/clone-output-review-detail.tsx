"use client";

import { useState, type ReactNode } from "react";
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
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import type {
  OutputReviewStatus,
  SerializedOutputReviewStatus,
} from "@/lib/output-review-status";

export interface CloneOutputActionFeedback {
  tone: "success" | "error";
  message: string;
}

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
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function CloneOutputReviewDetail({
  job,
  isRetrying,
  pendingReviewStatus = null,
  handoffState = "idle",
  actionFeedback = null,
  onBack,
  onRetry,
  onDownload,
  onReviewStatusChange,
  onHandoff,
  onNewClone,
}: {
  job: CloneOutputReviewJob;
  isRetrying: boolean;
  pendingReviewStatus?: OutputReviewStatus | null;
  handoffState?: "idle" | "pending" | "success" | "error";
  actionFeedback?: CloneOutputActionFeedback | null;
  onBack: () => void;
  onRetry: () => void;
  onDownload: (output: CloneOutputReviewOutput) => void;
  onReviewStatusChange?: (
    output: CloneOutputReviewOutput,
    status: OutputReviewStatus
  ) => void;
  onHandoff?: (output: CloneOutputReviewOutput) => void;
  onNewClone: () => void;
}) {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const isActive = job.status === "queued" || job.status === "processing";
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const featured = job.outputs[featuredIndex] ?? job.outputs[0];
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
  const collectionAssetId = getStringInput(job.input, "collectionAssetId");
  const reference = savedReferenceId
    ? {
        id: savedReferenceId,
        label: "Saved clone reference",
        previewUrl: `/api/ugc-clone/references/${encodeURIComponent(savedReferenceId)}`,
      }
    : collectionAssetId
      ? {
          id: collectionAssetId,
          label: "Collection reference",
          previewUrl: `/api/files/${encodeURIComponent(collectionAssetId)}`,
        }
      : referenceImageFileId
        ? {
            id: referenceImageFileId,
            label: "Generated output reference",
            previewUrl: `/api/files/${encodeURIComponent(referenceImageFileId)}`,
          }
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
    <div className="pf-content-viewport min-w-0 animate-fade-in-up bg-background">
      <div className="min-w-0 border-b border-border bg-background px-5 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-w-0 max-w-[1280px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
              aria-label="Back to previous page"
            >
              <ArrowLeft className="size-4 shrink-0" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-[-0.02em]">
                  Clone Output
                </h1>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 pf-data text-[12px] font-medium text-muted-foreground">
                  {job.id.slice(0, 8)}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Review and approve your generated media asset.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
            {(isCompleted || isFailed) && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {isRetrying ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <RefreshCw className="size-4 shrink-0" />
                )}
                {isRetrying ? "Retrying..." : "Retry"}
              </button>
            )}
            {featured && (
              <button
                type="button"
                onClick={() => onDownload(featured)}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Download className="size-4 shrink-0" />
                Download
              </button>
            )}
            <button
              type="button"
              onClick={() => featured && onHandoff?.(featured)}
              disabled={!featured || handoffState === "pending"}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-accent-coral px-4 text-sm font-semibold text-white transition-colors hover:brightness-[0.93] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {handoffState === "pending" ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : handoffState === "success" ? (
                <Check className="size-4 shrink-0" />
              ) : (
                <Send className="size-4 shrink-0" />
              )}
              {handoffState === "pending"
                ? "Copying..."
                : handoffState === "success"
                  ? "Copied"
                  : "Handoff"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid min-w-0 max-w-[1280px] gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,64fr)_minmax(340px,36fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <div className={cn("grid items-center justify-center gap-4", job.outputs.length > 1 && "sm:grid-cols-[minmax(0,1fr)_78px]")}>
            <div className="relative min-w-0">
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
                <div className="absolute inset-0 z-10 flex min-w-0 flex-col items-center justify-center gap-4 rounded-lg bg-card/90 p-6 text-center">
                  <AlertCircle className="size-8 shrink-0 text-destructive" />
                  <div className="w-full min-w-0">
                    <p className="text-sm font-semibold text-destructive">
                      Clone Failed
                    </p>
                    {job.error && (
                      <p className="mx-auto mt-1 min-w-0 max-w-sm break-words text-xs text-destructive/80 [overflow-wrap:anywhere]">
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
                    <button
                      type="button"
                      onClick={() => onDownload(featured)}
                      className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
                    >
                      <Download className="size-3.5 shrink-0" />
                      Download
                    </button>
                  }
                />
              ) : (
                <div className="flex min-h-[min(720px,calc(100dvh-20rem))] items-center justify-center rounded-lg bg-zinc-950 text-sm text-muted-foreground">
                  Output preview will appear here.
                </div>
              )}
            </div>

            {job.outputs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
                <p className="hidden text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:block">
                  Variants
                </p>
                {job.outputs.map((output, index) => (
                  <button
                    key={output.id}
                    type="button"
                    onClick={() => setFeaturedIndex(index)}
                    aria-label={`View variant ${index + 1}`}
                    aria-pressed={featured?.id === output.id}
                    className={cn(
                      "relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-black p-0.5 transition-colors",
                      featured?.id === output.id
                        ? "border-accent-coral"
                        : "border-white hover:border-accent-coral/50"
                    )}
                  >
                    {output.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/files/${output.id}`}
                        alt=""
                        className="size-full rounded-md object-cover"
                      />
                    ) : (
                      <video
                        src={`/api/files/${output.id}`}
                        muted
                        preload="metadata"
                        className="size-full rounded-md object-cover"
                      />
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 py-0.5 text-[13px] font-semibold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </button>
                ))}
              </div>
            )}
            </div>

            {featured && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {featured.filename}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[featuredSize, job.model].filter(Boolean).join(" | ")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {actionFeedback && (
            <div
              role={actionFeedback.tone === "error" ? "alert" : "status"}
              className={cn(
                "flex min-w-0 items-start gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium",
                actionFeedback.tone === "success"
                  ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              )}
            >
              {actionFeedback.tone === "success" ? (
                <Check className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                {actionFeedback.message}
              </span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => featured && onReviewStatusChange?.(featured, "approved_output")}
              disabled={!featured || pendingReviewStatus !== null}
              aria-pressed={featured?.reviewStatus.value === "approved_output"}
              className={cn(
                "flex items-center justify-between rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60",
                featured?.reviewStatus.value === "approved_output"
                  ? "border-accent-green bg-accent-green/10"
                  : "border-border"
              )}
            >
              <span>
                <span className="block text-sm font-semibold">
                  Approve Output
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Ready for handoff
                </span>
              </span>
              {pendingReviewStatus === "approved_output" ? (
                  <Loader2 className="size-5 shrink-0 animate-spin text-accent-green" />
                ) : (
                  <Check className="size-5 shrink-0 text-accent-green" />
              )}
            </button>
            <button
              type="button"
              onClick={() => featured && onReviewStatusChange?.(featured, "rejected_output")}
              disabled={!featured || pendingReviewStatus !== null}
              aria-pressed={featured?.reviewStatus.value === "rejected_output"}
              className={cn(
                "flex items-center justify-between rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60",
                featured?.reviewStatus.value === "rejected_output"
                  ? "border-destructive bg-destructive/10"
                  : "border-border"
              )}
            >
              <span>
                <span className="block text-sm font-semibold">
                  Reject Output
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Not usable
                </span>
              </span>
              {pendingReviewStatus === "rejected_output" ? (
                  <Loader2 className="size-5 shrink-0 animate-spin text-destructive" />
                ) : (
                  <X className="size-5 shrink-0 text-destructive" />
              )}
            </button>
            <button
              type="button"
              onClick={onNewClone}
              className="flex items-center justify-between rounded-lg border border-dashed border-accent-coral/40 bg-card p-4 text-left text-accent-coral transition-colors hover:border-accent-coral hover:bg-accent-coral/5"
            >
              <span>
                <span className="block text-sm font-semibold">New Clone</span>
                <span className="mt-1 block text-[11px] text-accent-coral/70">
                  Return to Clone
                </span>
              </span>
              <Users className="size-5 shrink-0" />
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
                      className="inline-flex min-w-0 items-center gap-1 text-[13px] font-semibold text-accent-blue hover:underline"
                    >
                      View original
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  )}
                </div>
              </div>
              {sourcePreviewUrl && sourceVideo && (
                <details className="rounded-lg border border-border bg-black/40 p-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-2 py-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <PlayCircle className="size-3.5 text-accent-green" />
                      View source video
                    </span>
                    <span className="text-[12px] uppercase tracking-wider text-muted-foreground">
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
                  <Users className="size-5 shrink-0 text-muted-foreground" />
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
                <p className="mb-1 text-[12px] font-bold uppercase text-muted-foreground">
                  Spend
                </p>
                <p className="text-lg font-semibold tracking-tight">
                  {formatCost(job.actualCost ?? job.estimatedCost)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[12px] font-bold uppercase text-muted-foreground">
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

          <DetailSection title="Input Checks">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Identity", ready: Boolean(avatarId) },
                { label: "Source", ready: Boolean(sourceVideo || job.tikTokSource) },
                { label: "Output", ready: Boolean(featured) },
              ].map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-lg border border-border bg-muted/25 px-2 py-3 text-center"
                >
                  {signal.ready ? (
                    <Check className="mx-auto size-4 shrink-0 text-accent-green" />
                  ) : (
                    <AlertCircle className="mx-auto size-4 shrink-0 text-muted-foreground" />
                  )}
                  <p className="mt-1.5 text-[12px] font-semibold">{signal.label}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {signal.ready ? "Ready" : "Unavailable"}
                  </p>
                </div>
              ))}
            </div>
          </DetailSection>

          {reference && (
            <DetailSection title="Reference">
              <div className="mb-3 min-w-0">
                <p className="min-w-0 break-words text-sm font-medium [overflow-wrap:anywhere]">{reference.label}</p>
                <p className="mt-1 break-all font-mono text-[12px] text-muted-foreground">
                  {reference.id}
                </p>
              </div>
              <a
                href={reference.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-border bg-black"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={reference.previewUrl}
                  alt={`${reference.label} used for this clone`}
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
