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
        <span className="min-w-0 truncate px-2 text-xs font-semibold">
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
      className="order-first min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-[0_5px_18px_rgba(31,32,29,0.07)] min-[1360px]:order-last min-[1360px]:sticky min-[1360px]:top-4"
    >
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          <i className="size-1.5 shrink-0 rounded-full bg-primary" />
          <span className="truncate">Previewing asset</span>
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
            <h2 className="truncate text-sm font-semibold tracking-[-0.01em]" title={title}>
              {title}
            </h2>
            <p className="mt-1 truncate text-[10px] text-muted-foreground" title={item.model}>
              {item.model}
            </p>
          </div>

          {item.prompt && (
            <p className="min-w-0 break-words text-[11px] leading-[1.05rem] text-muted-foreground [overflow-wrap:anywhere] line-clamp-3">
              {item.prompt}
            </p>
          )}

          <dl className="divide-y divide-border border-y border-border">
            <div className="flex items-center justify-between gap-3 py-2 text-[10px]">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="min-w-0 truncate font-medium" suppressHydrationWarning>
                {formatRelativeDate(item.createdAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2 text-[10px]">
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
              <span className="text-[10px] text-muted-foreground">Source</span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleCopySource()}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Copy className="size-3" /> Copy
                </button>
                <a
                  href={item.tiktokSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-primary"
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
        <div
          data-gallery-view={view}
          className={cn(
            "min-w-0",
            view === "grid"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-2"
          )}
        >
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <article
              key={item.id}
              className={cn(
                "group min-w-0 overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-[0_5px_16px_rgba(31,32,29,0.07)]",
                isSelected ? "border-primary ring-1 ring-primary/25" : "border-border",
                view === "list" &&
                  "grid grid-cols-[128px_minmax(0,1fr)] sm:grid-cols-[156px_minmax(0,1fr)]"
              )}
            >
              <div className="relative min-w-0">
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
                    className={cn(
                      "rounded-none border-0 bg-muted",
                      view === "grid" ? "aspect-[4/3]" : "h-full min-h-36"
                    )}
                    mediaClassName="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/25 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-black shadow-lg">
                      <Eye className="size-3.5" />
                      Preview
                    </span>
                  </span>
                </button>

                <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
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

              <div
                className={cn(
                  "flex min-w-0 flex-col gap-3 p-3",
                  view === "list" && "justify-between sm:p-4"
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setLightbox(item)}
                      className="min-w-0 truncate text-left text-xs font-semibold transition-colors hover:text-primary"
                    >
                      {item.model}
                    </button>
                    <span
                      className="shrink-0 text-[10px] text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {formatRelativeDate(item.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="truncate text-[10px] text-muted-foreground">
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
                    onStatusChange={(reviewStatus) =>
                      onReviewStatusChange?.(item.id, reviewStatus)
                    }
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
        <DialogContent className="!w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto rounded-xl p-3 sm:!max-w-6xl [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4">
          <DialogTitle className="sr-only">Output preview</DialogTitle>
          {lightbox && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="flex min-h-[420px] items-center justify-center rounded-xl bg-muted/60 p-3">
                <MediaPreviewFrame
                  type={lightbox.type}
                  src={lightbox.url}
                  width={lightbox.width}
                  height={lightbox.height}
                  alt="Generated Output"
                  variant="detail"
                  showMetadata
                  className="max-h-[calc(100dvh-5rem)] rounded-xl"
                />
              </div>
              <aside className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Previewing asset
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">
                    Generated Output
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Make the review call, then download, reuse, or hand off the asset.
                  </p>
                </div>

                <dl className="divide-y divide-border rounded-lg border border-border bg-background px-3">
                  <div className="flex items-center justify-between gap-3 py-3 text-xs">
                    <dt className="text-muted-foreground">Model</dt>
                    <dd className="min-w-0 truncate font-semibold">{lightbox.model}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-3 text-xs">
                    <dt className="text-muted-foreground">Output</dt>
                    <dd>
                      {lightbox.width && lightbox.height
                        ? `${lightbox.width} × ${lightbox.height}`
                        : lightbox.type}
                      {lightbox.durationSec != null ? ` · ${lightbox.durationSec}s` : ""}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-3 text-xs">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd suppressHydrationWarning>
                      {formatRelativeDate(lightbox.createdAt)}
                    </dd>
                  </div>
                  {lightbox.tiktokSourceUrl && (
                    <div className="flex items-center justify-between gap-3 py-3 text-xs">
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

                {lightbox.prompt && (
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Prompt
                    </p>
                    <p className="mt-2 min-w-0 break-words text-xs leading-5 text-foreground/80 [overflow-wrap:anywhere] line-clamp-4">
                      {lightbox.prompt}
                    </p>
                  </div>
                )}

                <GalleryReviewStatusControl
                  outputId={lightbox.id}
                  reviewStatus={lightbox.reviewStatus}
                  onStatusChange={(reviewStatus) => {
                    onReviewStatusChange?.(lightbox.id, reviewStatus);
                    setLightbox({ ...lightbox, reviewStatus });
                  }}
                  onFeedback={onFeedback}
                />

                <div className="mt-auto grid grid-cols-2 gap-2">
                  {lightbox.type === "image" && (
                    <Link
                      href={`/ugc-clone?referenceFileId=${encodeURIComponent(lightbox.id)}`}
                      className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Sparkles className="size-4" />
                      Use in Clone
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void downloadItem(lightbox)}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background text-xs font-semibold transition-colors hover:bg-muted"
                  >
                    <Download className="size-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void onHandoff?.(lightbox)}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background text-xs font-semibold transition-colors hover:bg-muted"
                  >
                    <Send className="size-4" />
                    Handoff
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      disabled={deletingId === lightbox.id}
                      render={
                        <button
                          type="button"
                          className="col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-destructive/10 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50"
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
