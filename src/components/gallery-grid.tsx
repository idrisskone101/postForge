"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MediaPreviewFrame } from "@/components/media-preview";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { downloadFile } from "@/lib/utils/download";
import { cn } from "@/lib/utils";
import {
  OUTPUT_REVIEW_STATUSES,
  type OutputReviewStatus,
  type SerializedOutputReviewStatus,
} from "@/lib/output-review-status";
import {
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Images,
  Loader2,
  Maximize2,
  Send,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

export interface GalleryItem {
  id: string;
  jobId: string;
  type: "image" | "video";
  url: string;
  filename?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  model: string;
  prompt?: string;
  tiktokSourceUrl?: string;
  reviewStatus: SerializedOutputReviewStatus;
  createdAt: string | Date;
}

export type GalleryView = "grid" | "list";

export type GalleryFeedback = {
  tone: "success" | "error";
  message: string;
};

interface GalleryGridProps {
  items: GalleryItem[];
  view?: GalleryView;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
  onReviewStatusChange?: (
    id: string,
    reviewStatus: SerializedOutputReviewStatus
  ) => void;
  onHandoff?: (item: GalleryItem) => Promise<boolean>;
  onFeedback?: (feedback: GalleryFeedback) => void;
}

const reviewStatusIcons = {
  needs_review: CircleDashed,
  approved_output: CheckCircle2,
  rejected_output: XCircle,
} satisfies Record<OutputReviewStatus, typeof CircleDashed>;

function GalleryReviewStatusControl({
  outputId,
  reviewStatus,
  compact = false,
  onStatusChange,
  onFeedback,
}: {
  outputId: string;
  reviewStatus: SerializedOutputReviewStatus;
  compact?: boolean;
  onStatusChange?: (status: SerializedOutputReviewStatus) => void;
  onFeedback?: (feedback: GalleryFeedback) => void;
}) {
  const [current, setCurrent] = useState(reviewStatus);
  const [pendingStatus, setPendingStatus] = useState<OutputReviewStatus | null>(
    null
  );

  useEffect(() => setCurrent(reviewStatus), [reviewStatus]);

  const updateStatus = async (nextStatus: OutputReviewStatus) => {
    if (pendingStatus || nextStatus === current.value) return;
    setPendingStatus(nextStatus);
    try {
      const response = await fetch(`/api/files/${outputId}/review-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: nextStatus }),
      });
      if (!response.ok) throw new Error("Review update failed");
      const result = (await response.json()) as {
        reviewStatus: SerializedOutputReviewStatus;
      };
      setCurrent(result.reviewStatus);
      onStatusChange?.(result.reviewStatus);
      onFeedback?.({
        tone: "success",
        message: `Asset marked ${result.reviewStatus.label.toLowerCase()}.`,
      });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "The review status could not be updated. Try again.",
      });
    } finally {
      setPendingStatus(null);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-border bg-background p-1",
        compact ? "w-fit gap-1" : "justify-between gap-2"
      )}
      aria-label={`Output review status: ${current.label}`}
    >
      {!compact && (
        <span className="min-w-0 truncate px-2 text-[13px] font-semibold">
          {current.label}
        </span>
      )}
      <div className="flex items-center gap-1">
        {OUTPUT_REVIEW_STATUSES.map((status) => {
          const Icon = reviewStatusIcons[status.value];
          const isActive = current.value === status.value;
          const isPending = pendingStatus === status.value;
          return (
            <button
              key={status.value}
              type="button"
              aria-label={`Mark as ${status.label}`}
              aria-pressed={isActive}
              title={status.label}
              disabled={pendingStatus !== null}
              onClick={(event) => {
                event.stopPropagation();
                void updateStatus(status.value);
              }}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                isActive && status.value === "needs_review" && "bg-muted text-foreground",
                isActive &&
                  status.value === "approved_output" &&
                  "bg-accent-green/10 text-accent-green",
                isActive &&
                  status.value === "rejected_output" &&
                  "bg-destructive/10 text-destructive"
              )}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Icon className="size-3.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GallerySelectionInspector({
  item,
  onDeselect,
  onOpenPreview,
  onDelete,
  onReviewStatusChange,
  onHandoff,
  onFeedback,
}: {
  item: GalleryItem;
  onDeselect: () => void;
  onOpenPreview: () => void;
  onDelete: (id: string) => Promise<boolean>;
  onReviewStatusChange?: (
    id: string,
    reviewStatus: SerializedOutputReviewStatus
  ) => void;
  onHandoff?: (item: GalleryItem) => Promise<boolean>;
  onFeedback?: (feedback: GalleryFeedback) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadFile(`/api/files/${item.id}/download`, item.filename);
      onFeedback?.({ tone: "success", message: "Asset downloaded." });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "This asset could not be downloaded. Try again.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopySource = async () => {
    try {
      if (!navigator.clipboard || !item.tiktokSourceUrl) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(item.tiktokSourceUrl);
      onFeedback?.({ tone: "success", message: "Source URL copied." });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "The source URL could not be copied. Check browser permissions.",
      });
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    await onDelete(item.id);
    setIsDeleting(false);
  };

  const title = item.filename?.trim() || `Generated ${item.type}`;

  return (
    <aside
      data-gallery-selection-inspector
      aria-label="Selected asset preview"
      className="order-first min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--pf-shadow-sm)] min-[1360px]:order-last min-[1360px]:sticky min-[1360px]:top-4"
    >
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Previewing asset
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onOpenPreview}
            aria-label="Open selected asset preview"
            title="Open full preview"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Maximize2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDeselect}
            aria-label="Deselect previewed asset"
            title="Deselect asset"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid min-w-0 gap-0 sm:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] min-[1360px]:block">
        <button
          type="button"
          onClick={onOpenPreview}
          className="relative block min-h-0 min-w-0 bg-muted text-left"
          aria-label="Open full preview"
        >
          <MediaPreviewFrame
            type={item.type}
            src={item.url}
            width={item.width}
            height={item.height}
            alt="Selected generated asset"
            fill
            variant="card"
            className="aspect-[4/3] rounded-none border-0 bg-muted sm:h-full sm:min-h-[290px] sm:aspect-auto min-[1360px]:aspect-[4/5] min-[1360px]:h-auto min-[1360px]:min-h-0"
            mediaClassName="object-contain"
          />
        </button>

        <div className="flex min-w-0 flex-col gap-3 p-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em]" title={title}>
              {title}
            </h2>
            <p className="mt-1 truncate text-[12px] text-muted-foreground" title={item.model}>
              {item.model}
            </p>
          </div>

          {item.prompt && (
            <p className="min-w-0 break-words text-[12px] leading-[1.15rem] text-muted-foreground [overflow-wrap:anywhere] line-clamp-3">
              {item.prompt}
            </p>
          )}

          <dl className="divide-y divide-border border-y border-border">
            <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="min-w-0 truncate font-medium" suppressHydrationWarning>
                {formatRelativeDate(item.createdAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
              <dt className="text-muted-foreground">Output</dt>
              <dd className="min-w-0 truncate font-medium">
                {item.width && item.height
                  ? `${item.width} × ${item.height}`
                  : item.type}
                {item.durationSec != null ? ` · ${item.durationSec}s` : ""}
              </dd>
            </div>
          </dl>

          {item.tiktokSourceUrl && (
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-[12px] text-muted-foreground">Source</span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleCopySource()}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Copy className="size-3" /> Copy
                </button>
                <a
                  href={item.tiktokSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-primary"
                >
                  <ExternalLink className="size-3" /> Open
                </a>
              </span>
            </div>
          )}

          <GalleryReviewStatusControl
            outputId={item.id}
            reviewStatus={item.reviewStatus}
            onStatusChange={(reviewStatus) =>
              onReviewStatusChange?.(item.id, reviewStatus)
            }
            onFeedback={onFeedback}
          />

          <div className="mt-auto grid grid-cols-2 gap-2">
            {item.type === "image" && (
              <Link
                href={`/ugc-clone?referenceFileId=${encodeURIComponent(item.id)}`}
                className="col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Sparkles className="size-3.5" />
                Use in Clone
              </Link>
            )}
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
              className="flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-[11px] font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Download
            </button>
            <button
              type="button"
              onClick={() => void onHandoff?.(item)}
              className="flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-[11px] font-semibold transition-colors hover:bg-muted"
            >
              <Send className="size-3.5" />
              Handoff
            </button>
            <AlertDialog>
              <AlertDialogTrigger
                disabled={isDeleting}
                render={
                  <button
                    type="button"
                    className="col-span-2 flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-2 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                }
              >
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Delete asset
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the generated file and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleDelete()}>
                    Delete asset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ReviewStatePill({ status }: { status: SerializedOutputReviewStatus }) {
  const approved = status.value === "approved_output";
  const rejected = status.value === "rejected_output";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        approved && "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]",
        rejected && "border-[var(--pf-danger)]/30 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]",
        !approved && !rejected && "border-[var(--pf-border)] bg-[var(--pf-active)] text-[var(--pf-muted)]"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          approved && "bg-[#4ADE80]",
          rejected && "bg-[#F87171]",
          !approved && !rejected && "bg-[#FBBF24]"
        )}
      />
      {status.label}
    </span>
  );
}

function GalleryListTable({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  onDelete,
  onReviewStatusChange,
  onHandoff,
  onFeedback,
}: {
  items: GalleryItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (item: GalleryItem) => void;
  onDelete: (item: GalleryItem) => Promise<void>;
  onReviewStatusChange?: (id: string, reviewStatus: SerializedOutputReviewStatus) => void;
  onHandoff?: (item: GalleryItem) => Promise<boolean>;
  onFeedback?: (feedback: GalleryFeedback) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const downloadRow = async (item: GalleryItem) => {
    try {
      await downloadFile(`/api/files/${item.id}/download`, item.filename);
      onFeedback?.({ tone: "success", message: "Asset downloaded." });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "This asset could not be downloaded. Try again.",
      });
    }
  };

  const reviewRow = async (item: GalleryItem, nextStatus: OutputReviewStatus) => {
    if (nextStatus === item.reviewStatus.value) return;
    try {
      const response = await fetch(`/api/files/${item.id}/review-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: nextStatus }),
      });
      if (!response.ok) throw new Error("Review update failed");
      const result = (await response.json()) as {
        reviewStatus: SerializedOutputReviewStatus;
      };
      onReviewStatusChange?.(item.id, result.reviewStatus);
      onFeedback?.({
        tone: "success",
        message: `Asset marked ${result.reviewStatus.label.toLowerCase()}.`,
      });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "The review status could not be updated. Try again.",
      });
    }
  };

  return (
    <div data-gallery-view="list" className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--pf-shadow-2xs)]">
      <div className="hidden grid-cols-[2rem_3rem_minmax(0,1.6fr)_minmax(7.5rem,0.6fr)_minmax(6.5rem,0.5fr)_5.5rem_10rem] items-center gap-3 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground md:grid">
        <span />
        <span />
        <span>Output</span>
        <span>Status</span>
        <span>Details</span>
        <span>Created</span>
        <span />
      </div>
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        const isDeleting = deletingId === item.id;
        return (
          <div
            key={item.id}
            onClick={() => onOpen(item)}
            className={cn(
              "group grid min-w-0 cursor-pointer grid-cols-[2rem_3rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-3 py-2.5 transition-colors first:border-t-0 hover:bg-[var(--pf-active)] md:grid-cols-[2rem_3rem_minmax(0,1.6fr)_minmax(7.5rem,0.6fr)_minmax(6.5rem,0.5fr)_5.5rem_10rem]",
              isSelected && "bg-[var(--sidebar-accent)] hover:bg-[var(--sidebar-accent)]"
            )}
          >
            <span className="flex items-center" onClick={(event) => event.stopPropagation()}>
              <label
                className={cn(
                  "flex size-5 cursor-pointer items-center justify-center rounded-[5px] border transition-colors",
                  isSelected ? "border-primary bg-primary" : "border-[var(--pf-border-strong)] bg-[var(--pf-surface)]"
                )}
              >
                <span className="sr-only">Select Output {item.id}</span>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(item.id)}
                  className="sr-only"
                />
                {isSelected && <Check className="size-3 text-white" />}
              </label>
            </span>
            <span className="relative block size-10 overflow-hidden rounded-[6px] border border-border bg-[var(--pf-active)]">
              <MediaPreviewFrame
                type={item.type}
                src={item.url}
                width={item.width}
                height={item.height}
                alt="Generated Output"
                fill
                variant="card"
                className="rounded-none border-0 bg-[var(--pf-active)]"
                mediaClassName="object-cover"
              />
            </span>
            <span className="min-w-0">
              <button
                type="button"
                aria-label={`Preview output ${item.id}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(item);
                }}
                className="block max-w-full truncate text-left text-[13px] font-semibold text-foreground transition-colors hover:text-primary"
              >
                {item.model}
              </button>
              <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                {item.prompt ?? `Job ${item.jobId.slice(0, 8)}`}
              </span>
            </span>
            <span className="hidden md:block">
              <ReviewStatePill status={item.reviewStatus} />
            </span>
            <span className="hidden truncate text-[12px] text-muted-foreground md:block">
              {item.width && item.height ? `${item.width} × ${item.height}` : item.type}
              {item.durationSec != null ? ` · ${item.durationSec}s` : ""}
            </span>
            <span className="hidden truncate text-[12px] text-muted-foreground md:block" suppressHydrationWarning>
              {formatRelativeDate(item.createdAt)}
            </span>
            <span
              className="flex items-center justify-end gap-0.5"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label={`Mark as Approved Output`}
                title="Approve"
                onClick={() => void reviewRow(item, "approved_output")}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--pf-success)]/10 hover:text-[var(--pf-success)]",
                  item.reviewStatus.value === "approved_output" && "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                )}
              >
                <Check className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Mark as Rejected Output`}
                title="Reject"
                onClick={() => void reviewRow(item, "rejected_output")}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]",
                  item.reviewStatus.value === "rejected_output" && "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                )}
              >
                <X className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Download Output ${item.id}`}
                title="Download"
                onClick={() => void downloadRow(item)}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Download className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Handoff Output ${item.id}`}
                title="Handoff"
                onClick={() => void onHandoff?.(item)}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Send className="size-3.5" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger
                  disabled={isDeleting}
                  render={
                    <button
                      type="button"
                      aria-label={`Delete Output ${item.id}`}
                      title="Delete"
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)] disabled:opacity-50"
                    />
                  }
                >
                  {isDeleting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the generated file and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        setDeletingId(item.id);
                        await onDelete(item);
                        setDeletingId(null);
                      }}
                    >
                      Delete asset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LightboxReviewControl({
  outputId,
  reviewStatus,
  onStatusChange,
  onFeedback,
}: {
  outputId: string;
  reviewStatus: SerializedOutputReviewStatus;
  onStatusChange?: (status: SerializedOutputReviewStatus) => void;
  onFeedback?: (feedback: GalleryFeedback) => void;
}) {
  const [current, setCurrent] = useState(reviewStatus);
  const [pending, setPending] = useState<OutputReviewStatus | null>(null);

  useEffect(() => setCurrent(reviewStatus), [reviewStatus]);

  const update = async (status: OutputReviewStatus) => {
    if (pending) return;
    const next: OutputReviewStatus =
      current.value === status ? "needs_review" : status;
    setPending(status);
    try {
      const response = await fetch(`/api/files/${outputId}/review-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: next }),
      });
      if (!response.ok) throw new Error("Review update failed");
      const result = (await response.json()) as {
        reviewStatus: SerializedOutputReviewStatus;
      };
      setCurrent(result.reviewStatus);
      onStatusChange?.(result.reviewStatus);
      onFeedback?.({
        tone: "success",
        message:
          next === "needs_review"
            ? "Review cleared back to needs review."
            : `Asset marked ${result.reviewStatus.label.toLowerCase()}.`,
      });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "The review status could not be updated. Try again.",
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => void update("approved_output")}
        aria-pressed={current.value === "approved_output"}
        className={cn(
          "flex h-10 items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold transition-colors disabled:opacity-50",
          current.value === "approved_output"
            ? "border-[var(--pf-success)]/40 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
            : "border-border bg-background text-foreground hover:border-[var(--pf-success)]/40 hover:text-[var(--pf-success)]"
        )}
      >
        {pending === "approved_output" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Approve
      </button>
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => void update("rejected_output")}
        aria-pressed={current.value === "rejected_output"}
        className={cn(
          "flex h-10 items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold transition-colors disabled:opacity-50",
          current.value === "rejected_output"
            ? "border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
            : "border-border bg-background text-foreground hover:border-[var(--pf-danger)]/40 hover:text-[var(--pf-danger)]"
        )}
      >
        {pending === "rejected_output" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <X className="size-4" />
        )}
        Reject
      </button>
    </div>
  );
}

export function GalleryGrid({
  items,
  view = "grid",
  selectedIds,
  onToggleSelect,
  onDelete,
  onReviewStatusChange,
  onHandoff,
  onFeedback,
}: GalleryGridProps) {
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [stampedIds, setStampedIds] = useState<ReadonlySet<string>>(new Set());

  const markStamped = (id: string) => {
    setStampedIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setStampedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 600);
  };

  const selectedItem =
    items.find((item) => item.id === inspectedId && selectedIds.has(item.id)) ??
    items.find((item) => selectedIds.has(item.id)) ??
    null;

  useEffect(() => {
    if (selectedIds.size === 0) {
      setInspectedId(null);
      return;
    }
    if (!inspectedId || !selectedIds.has(inspectedId)) {
      setInspectedId(
        items.find((item) => selectedIds.has(item.id))?.id ?? null
      );
    }
  }, [inspectedId, items, selectedIds]);

  const toggleSelection = (id: string) => {
    if (selectedIds.has(id)) {
      if (inspectedId === id) {
        setInspectedId(
          items.find((item) => item.id !== id && selectedIds.has(item.id))?.id ??
            null
        );
      }
    } else {
      setInspectedId(id);
    }
    onToggleSelect(id);
  };

  const copySourceUrl = async (url: string) => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      onFeedback?.({ tone: "success", message: "Source URL copied." });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "The source URL could not be copied. Check browser permissions.",
      });
    }
  };

  const deleteItem = async (item: GalleryItem) => {
    setDeletingId(item.id);
    const deleted = await onDelete(item.id);
    if (deleted && lightbox?.id === item.id) setLightbox(null);
    setDeletingId(null);
  };

  const downloadItem = async (item: GalleryItem) => {
    try {
      await downloadFile(`/api/files/${item.id}/download`, item.filename);
      onFeedback?.({ tone: "success", message: "Asset downloaded." });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "This asset could not be downloaded. Try again.",
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 text-muted-foreground">
        <Images className="mb-3 size-10 opacity-40" />
        <p className="text-sm font-medium">No media yet</p>
        <p className="mt-1 text-xs">Generated images and videos will appear here</p>
      </div>
    );
  }

  return (
    <>
      <div
        data-gallery-selection-layout={selectedItem ? "inspecting" : "idle"}
        className={cn(
          "grid min-w-0 items-start gap-3",
          selectedItem &&
            "min-[1360px]:grid-cols-[minmax(0,1fr)_minmax(280px,304px)]"
        )}
      >
        {view === "list" ? (
          <GalleryListTable
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onOpen={setLightbox}
            onDelete={deleteItem}
            onReviewStatusChange={onReviewStatusChange}
            onHandoff={onHandoff}
            onFeedback={onFeedback}
          />
        ) : (
        <div
          data-gallery-view={view}
          className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <article
              key={item.id}
              className={cn(
                "group min-w-0 overflow-hidden rounded-lg border bg-card shadow-[var(--pf-shadow-2xs)] transition-[border-color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--pf-border-strong)] hover:shadow-[var(--pf-shadow-md)]",
                isSelected ? "border-primary ring-1 ring-primary/25" : "border-border"
              )}
            >
              <div className="relative min-w-0">
                {item.reviewStatus.value !== "needs_review" && (
                  <span
                    className={cn(
                      "pf-review-stamp",
                      item.reviewStatus.value === "approved_output"
                        ? "pf-review-stamp--approved"
                        : "pf-review-stamp--rejected",
                      stampedIds.has(item.id) && "pf-stamp-slam"
                    )}
                    aria-hidden="true"
                  >
                    {item.reviewStatus.value === "approved_output"
                      ? "Approved"
                      : "Rejected"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setLightbox(item)}
                  className="block h-full w-full cursor-pointer text-left"
                  aria-label={`Preview Output ${item.id}`}
                >
                  <MediaPreviewFrame
                    type={item.type}
                    src={item.url}
                    width={item.width}
                    height={item.height}
                    alt="Generated Output"
                    fill
                    variant="card"
                    className="aspect-[4/3] rounded-none border-0 bg-muted"
                    mediaClassName="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/25 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#fff] px-3 py-2 text-[12px] font-semibold text-black shadow-lg">
                      <Eye className="size-3.5" />
                      Preview
                    </span>
                  </span>
                </button>

                <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium capitalize text-white">
                  <span>{item.type}</span>
                  {item.durationSec != null && <span>· {item.durationSec}s</span>}
                </div>

                <label
                  className={cn(
                    "absolute right-2 top-2 z-10 flex size-6 cursor-pointer items-center justify-center rounded-md border transition-colors",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-white/80 bg-black/25 backdrop-blur-sm"
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="sr-only">Select Output {item.id}</span>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(item.id)}
                    className="sr-only"
                  />
                  {isSelected && <Check className="size-3.5 text-white" />}
                </label>
              </div>

              <div className="pf-tear" aria-hidden="true" />

              <div className="flex min-w-0 flex-col gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setLightbox(item)}
                      className="min-w-0 truncate text-left text-[13px] font-semibold transition-colors hover:text-primary"
                    >
                      {item.model}
                    </button>
                    <span
                      className="shrink-0 text-[11px] text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {formatRelativeDate(item.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="truncate text-[11px] text-muted-foreground">
                      {item.width && item.height
                        ? `${item.width} × ${item.height}`
                        : `Job ${item.jobId.slice(0, 8)}`}
                    </span>
                    {item.tiktokSourceUrl && (
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title="Copy Source URL"
                          aria-label="Copy Source URL"
                          onClick={(event) => {
                            event.stopPropagation();
                            void copySourceUrl(item.tiktokSourceUrl!);
                          }}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Copy className="size-3" />
                        </button>
                        <a
                          href={item.tiktokSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Source Selection"
                          aria-label="Open Source Selection"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <GalleryReviewStatusControl
                    outputId={item.id}
                    reviewStatus={item.reviewStatus}
                    compact
                    onStatusChange={(reviewStatus) => {
                      markStamped(item.id);
                      onReviewStatusChange?.(item.id, reviewStatus);
                    }}
                    onFeedback={onFeedback}
                  />
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void downloadItem(item)}
                      className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Download Output ${item.id}`}
                      title="Download"
                    >
                      <Download className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onHandoff?.(item)}
                      className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Handoff Output ${item.id}`}
                      title="Handoff"
                    >
                      <Send className="size-3.5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        disabled={deletingId === item.id}
                        render={
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50"
                            aria-label={`Delete Output ${item.id}`}
                            title="Delete"
                          />
                        }
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes the generated file and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void deleteItem(item)}>
                            Delete asset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <span className="sr-only">Download</span>
                <span className="sr-only">Handoff</span>
              </div>
            </article>
          );
        })}
        </div>
        )}

        {selectedItem && (
          <GallerySelectionInspector
            item={selectedItem}
            onDeselect={() => toggleSelection(selectedItem.id)}
            onOpenPreview={() => setLightbox(selectedItem)}
            onDelete={onDelete}
            onReviewStatusChange={onReviewStatusChange}
            onHandoff={onHandoff}
            onFeedback={onFeedback}
          />
        )}
      </div>

      <Dialog
        open={lightbox !== null}
        onOpenChange={(open) => {
          if (!open) setLightbox(null);
        }}
      >
        <DialogContent className="!w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto rounded-[12px] p-0 sm:!max-w-6xl lg:overflow-hidden [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:z-20">
          <DialogTitle className="sr-only">Output preview</DialogTitle>
          {lightbox && (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-h-[280px] items-center justify-center bg-[#09090B]">
                <MediaPreviewFrame
                  type={lightbox.type}
                  src={lightbox.url}
                  width={lightbox.width}
                  height={lightbox.height}
                  alt="Generated Output"
                  variant="detail"
                  className="max-h-[42dvh] w-full lg:max-h-[calc(100dvh-2rem)]"
                  mediaClassName="object-contain"
                />
              </div>
              <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-border bg-card p-5 lg:max-h-[calc(100dvh-2rem)] lg:border-l lg:border-t-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ReviewStatePill status={lightbox.reviewStatus} />
                  <span className="text-[12px] capitalize text-muted-foreground">
                    {lightbox.type}
                    {lightbox.durationSec != null ? ` · ${lightbox.durationSec}s` : ""}
                  </span>
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                    {lightbox.filename?.trim() || `Generated ${lightbox.type}`}
                  </h2>
                  <p className="mt-1 truncate text-[12px] text-muted-foreground">
                    {lightbox.model} · <span suppressHydrationWarning>{formatRelativeDate(lightbox.createdAt)}</span>
                  </p>
                </div>

                {lightbox.prompt && (
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Prompt
                    </p>
                    <p className="mt-1.5 min-w-0 break-words text-[13px] leading-5 text-foreground/80 [overflow-wrap:anywhere] line-clamp-5">
                      {lightbox.prompt}
                    </p>
                  </div>
                )}

                <dl className="divide-y divide-border border-y border-border">
                  <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                    <dt className="text-muted-foreground">Output</dt>
                    <dd>
                      {lightbox.width && lightbox.height
                        ? `${lightbox.width} × ${lightbox.height}`
                        : lightbox.type}
                    </dd>
                  </div>
                  {lightbox.tiktokSourceUrl && (
                    <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                      <dt className="text-muted-foreground">Source</dt>
                      <dd className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Copy Source URL"
                          aria-label="Copy Source URL"
                          onClick={() => void copySourceUrl(lightbox.tiktokSourceUrl!)}
                          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Copy className="size-3" /> Copy
                        </button>
                        <a
                          href={lightbox.tiktokSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Source Selection"
                          aria-label="Open Source Selection"
                          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-primary"
                        >
                          <ExternalLink className="size-3" /> Open
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>

                <LightboxReviewControl
                  outputId={lightbox.id}
                  reviewStatus={lightbox.reviewStatus}
                  onStatusChange={(reviewStatus) => {
                    onReviewStatusChange?.(lightbox.id, reviewStatus);
                    setLightbox({ ...lightbox, reviewStatus });
                  }}
                  onFeedback={onFeedback}
                />

                <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
                  {lightbox.type === "image" && (
                    <Link
                      href={`/ugc-clone?referenceFileId=${encodeURIComponent(lightbox.id)}`}
                      className="pf-button-primary h-10"
                    >
                      <Sparkles className="size-4" />
                      Use in Clone
                    </Link>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void downloadItem(lightbox)}
                      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background text-[13px] font-semibold transition-colors hover:bg-muted"
                    >
                      <Download className="size-4" />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => void onHandoff?.(lightbox)}
                      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background text-[13px] font-semibold transition-colors hover:bg-muted"
                    >
                      <Send className="size-4" />
                      Handoff
                    </button>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger
                      disabled={deletingId === lightbox.id}
                      render={
                        <button
                          type="button"
                          className="flex h-9 items-center justify-center gap-2 rounded-lg text-[12px] font-medium text-[var(--pf-danger)] transition-colors hover:bg-[var(--pf-danger)]/10 disabled:opacity-50"
                        />
                      }
                    >
                      {deletingId === lightbox.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Delete asset
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the generated file and cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void deleteItem(lightbox)}>
                          Delete asset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </aside>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
