"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { MediaPreviewFrame } from "@/components/media-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { downloadFile } from "@/lib/utils/download";
import { Copy, Download, ExternalLink, Loader2, Maximize2, Send, Sparkles, Trash2, X } from "lucide-react";
import { GalleryDeleteDialog } from "./delete-dialog";
import { GalleryReviewStatusControl } from "./review-status-control";
import type { GalleryFeedback, GalleryItem } from "./types";
import type { SerializedOutputReviewStatus } from "@/lib/output-review-status";

export type GallerySelection = {
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
};

export function GallerySelectionInspector({
  selection,
  children,
}: {
  selection: GallerySelection;
  children?: ReactNode;
}) {
  const {
    item,
    onDeselect,
    onOpenPreview,
    onDelete,
    onReviewStatusChange,
    onHandoff,
    onFeedback,
  } = selection;
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
    <Card
      data-gallery-selection-inspector
      role="complementary"
      aria-label="Selected asset preview"
      className="order-first min-w-0 gap-0 overflow-hidden rounded-lg border border-border bg-card py-0 text-card-foreground shadow-none ring-0 min-[1360px]:order-last min-[1360px]:sticky min-[1360px]:top-4"
    >
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Previewing asset
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onOpenPreview}
            aria-label="Open selected asset preview"
            title="Open full preview"
            className="size-7"
          >
            <Maximize2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onDeselect}
            aria-label="Deselect previewed asset"
            title="Deselect asset"
            className="size-7"
          >
            <X className="size-3.5" />
          </Button>
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
            cover
            variant="card"
            className="aspect-[4/3] rounded-none border-0 bg-muted sm:h-full sm:min-h-[290px] sm:aspect-auto min-[1360px]:aspect-[4/5] min-[1360px]:h-auto min-[1360px]:min-h-0"
            mediaClassName="object-contain"
          />
        </button>

        <div className="flex min-w-0 flex-col gap-3 p-3.5">
          <div className="min-w-0">
            <h2
              className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground"
              title={title}
            >
              {title}
            </h2>
            <p
              className="mt-1 truncate text-[12px] text-muted-foreground"
              title={item.model}
            >
              {item.model}
            </p>
          </div>

          {children ??
            (item.prompt ? (
              <p className="min-w-0 break-words text-[12px] leading-[1.15rem] text-muted-foreground [overflow-wrap:anywhere] line-clamp-3">
                {item.prompt}
              </p>
            ) : null)}

          <dl className="divide-y divide-border border-y border-border">
            <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="pf-data min-w-0 truncate font-medium" suppressHydrationWarning>
                {formatRelativeDate(item.createdAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
              <dt className="text-muted-foreground">Output</dt>
              <dd className="pf-data min-w-0 truncate font-medium">
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopySource()}
                  className="h-7 gap-1 px-2 text-[11px]"
                >
                  <Copy className="size-3" /> Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[11px] hover:text-primary"
                  render={
                    <a
                      href={item.tiktokSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <ExternalLink className="size-3" /> Open
                </Button>
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
                className="pf-button-primary col-span-2 h-10"
              >
                <Sparkles className="size-3.5" />
                Use in Clone
              </Link>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
              className="h-9 min-w-0 px-2 text-[11px]"
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onHandoff?.(item)}
              className="h-9 min-w-0 px-2 text-[11px]"
            >
              <Send className="size-3.5" />
              Handoff
            </Button>
            <GalleryDeleteDialog
              disabled={isDeleting}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  className="col-span-2 h-9 min-w-0 gap-1.5 px-2 text-[11px] text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
                />
              }
              title="Delete this asset?"
              description="This permanently removes the generated file and cannot be undone."
              actionLabel="Delete asset"
              onConfirm={() => void handleDelete()}
            >
              {isDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete asset
            </GalleryDeleteDialog>
          </div>
        </div>
      </div>
    </Card>
  );
}
