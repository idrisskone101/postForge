"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaPreviewFrame } from "@/components/media-preview";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { downloadFile } from "@/lib/utils/download";
import { cn } from "@/lib/utils";
import { OutputReviewStatusControl } from "@/components/output-review-status-control";
import type { SerializedOutputReviewStatus } from "@/lib/output-review-status";
import { Copy, Download, ExternalLink, Eye, Images, Send } from "lucide-react";

interface GalleryItem {
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

interface GalleryGridProps {
  items: GalleryItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReviewStatusChange?: (
    id: string,
    reviewStatus: SerializedOutputReviewStatus
  ) => void;
  onHandoff?: (item: GalleryItem) => void;
}

export function GalleryGrid({
  items,
  selectedIds,
  onToggleSelect,
  onReviewStatusChange,
  onHandoff,
}: GalleryGridProps) {
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const copySourceUrl = async (url: string) => {
    await navigator.clipboard?.writeText(url).catch(() => {});
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Images className="size-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">No media yet</p>
        <p className="text-xs mt-1">
          Generated images and videos will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {items.map((item, i) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              className={cn(
                "group flex flex-col gap-3 rounded-xl border bg-card p-3 transition-all duration-150 animate-fade-in-up",
                isSelected
                  ? "border-accent-coral"
                  : "border-border hover:border-accent-coral/50"
              )}
              style={{
                animationDelay: `${Math.min(i * 0.04, 0.4)}s`,
                animationFillMode: "backwards",
              }}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLightbox(item)}
                  className="block w-full cursor-pointer text-left"
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
                    className="aspect-[9/16] rounded-lg ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-[1.01]"
                    mediaClassName="transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-lg bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-black shadow-lg">
                      <Eye className="size-3.5" />
                      Preview
                    </span>
                  </span>
                </button>

                <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/80">
                  <span>{item.type}</span>
                  {item.durationSec != null && <span>{item.durationSec}s</span>}
                </div>

                <div className="absolute right-2 top-2 z-10">
                  <label
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md border cursor-pointer transition-colors",
                      isSelected
                        ? "bg-accent-coral border-accent-coral"
                        : "border-white/70 bg-black/30 backdrop-blur-sm"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(item.id)}
                      className="sr-only"
                    />
                    {isSelected && (
                      <svg
                        className="size-3 text-white"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                      </svg>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-tight font-semibold">
                    <button
                      type="button"
                      onClick={() => setLightbox(item)}
                      className={cn(
                        "cursor-pointer truncate text-left uppercase transition-colors hover:text-foreground",
                        item.type === "video" ? "text-accent-blue" : "text-accent-green"
                      )}
                    >
                      {item.model}
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.tiktokSourceUrl && (
                        <>
                          <button
                            type="button"
                            title="Copy Source URL"
                            aria-label="Copy Source URL"
                            onClick={(event) => {
                              event.stopPropagation();
                              void copySourceUrl(item.tiktokSourceUrl!);
                            }}
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-accent-coral"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        </>
                      )}
                      <span
                        className="text-muted-foreground/50"
                        suppressHydrationWarning
                      >
                        {formatRelativeDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <OutputReviewStatusControl
                    outputId={item.id}
                    reviewStatus={item.reviewStatus}
                    compact
                    onStatusChange={(reviewStatus) =>
                      onReviewStatusChange?.(item.id, reviewStatus)
                    }
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => downloadFile(`/api/files/${item.id}/download`)}
                      className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Download Output ${item.id}`}
                      title="Download"
                    >
                      <Download className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onHandoff?.(item)}
                      className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-coral text-white transition-colors hover:bg-accent-coral/90"
                      aria-label={`Handoff Output ${item.id}`}
                      title="Handoff"
                    >
                      <Send className="size-3.5" />
                    </button>
                  </div>
                </div>
                <span className="sr-only">Download</span>
                <span className="sr-only">Handoff</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      <Dialog
        open={lightbox !== null}
        onOpenChange={(open) => {
          if (!open) setLightbox(null);
        }}
      >
        <DialogContent className="!w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto rounded-xl p-3 sm:!max-w-6xl [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4">
          <DialogTitle className="sr-only">Output preview</DialogTitle>
          {lightbox && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <MediaPreviewFrame
                type={lightbox.type}
                src={lightbox.url}
                width={lightbox.width}
                height={lightbox.height}
                alt="Generated Output"
                variant="detail"
                showMetadata
                className="rounded-xl"
              />
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent-coral">
                    Output Review
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Generated Output</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Make the review call, then download or hand off the asset.
                  </p>
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">Model</span>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold text-accent-blue">
                        {lightbox.model}
                      </span>
                      {lightbox.tiktokSourceUrl && (
                        <>
                          <button
                            type="button"
                            title="Copy Source URL"
                            aria-label="Copy Source URL"
                            onClick={() => void copySourceUrl(lightbox.tiktokSourceUrl!)}
                            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Copy className="size-3" />
                          </button>
                          <a
                            href={lightbox.tiktokSourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Open Source Selection"
                            aria-label="Open Source Selection"
                            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-accent-coral"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">Created</span>
                    <span suppressHydrationWarning>
                      {formatRelativeDate(lightbox.createdAt)}
                    </span>
                  </div>
                </div>

                <OutputReviewStatusControl
                  outputId={lightbox.id}
                  reviewStatus={lightbox.reviewStatus}
                  onStatusChange={(reviewStatus) => {
                    onReviewStatusChange?.(lightbox.id, reviewStatus);
                    setLightbox({ ...lightbox, reviewStatus });
                  }}
                />

                <div className="mt-auto grid gap-2">
                  <button
                    type="button"
                    onClick={() => downloadFile(`/api/files/${lightbox.id}/download`)}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-muted text-sm font-semibold text-foreground transition-colors hover:bg-muted/80"
                  >
                    <Download className="size-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => onHandoff?.(lightbox)}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-accent-coral text-sm font-semibold text-white transition-colors hover:bg-accent-coral/90"
                  >
                    <Send className="size-4" />
                    Handoff
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
