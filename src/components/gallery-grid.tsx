"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { downloadFile } from "@/lib/utils/download";
import { cn } from "@/lib/utils";
import { OutputReviewStatusControl } from "@/components/output-review-status-control";
import type { SerializedOutputReviewStatus } from "@/lib/output-review-status";
import { Download, ExternalLink, Images, Play } from "lucide-react";

interface GalleryItem {
  id: string;
  jobId: string;
  type: "image" | "video";
  url: string;
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
}

export function GalleryGrid({
  items,
  selectedIds,
  onToggleSelect,
  onDelete,
  onReviewStatusChange,
}: GalleryGridProps) {
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {items.map((item, i) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              className={cn(
                "group p-2 rounded-lg transition-all duration-150 border animate-fade-in-up",
                isSelected
                  ? "border-accent-coral bg-card"
                  : "border-transparent hover:border-accent-coral/50 hover:bg-card"
              )}
              style={{
                animationDelay: `${Math.min(i * 0.04, 0.4)}s`,
                animationFillMode: "backwards",
              }}
            >
              {/* Card container */}
              <div
                className="relative aspect-square rounded-md overflow-hidden cursor-pointer"
                onClick={() => setLightbox(item)}
              >
                {/* Image/Video with hover zoom */}
                {item.type === "image" ? (
                  <img
                    src={item.url}
                    alt={item.prompt || ""}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}

                {/* Video badge — top-left */}
                {item.type === "video" && (
                  <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur text-[8px] font-bold text-white">
                    <Play className="size-2 fill-current" />
                    {item.durationSec != null ? `${item.durationSec}s` : "Video"}
                  </div>
                )}

                {/* Checkbox — top-right */}
                <div
                  className={cn(
                    "absolute top-1.5 right-1.5 z-10 transition-opacity duration-150",
                    isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                  )}
                >
                  <label
                    className={cn(
                      "flex items-center justify-center size-5 rounded border cursor-pointer transition-colors",
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

              {/* Metadata below thumbnail — always visible */}
              <div className="space-y-0.5 px-0.5 mt-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-tight font-semibold">
                  <span className={item.type === "video" ? "text-accent-blue" : "text-accent-green"}>
                    {item.model}
                  </span>
                  <span className="text-muted-foreground/50">{formatRelativeDate(item.createdAt)}</span>
                </div>
                {item.prompt && (
                  <p className="text-[11px] text-muted-foreground/70 line-clamp-1 leading-tight">{item.prompt}</p>
                )}
                {item.tiktokSourceUrl && (
                  <a
                    href={item.tiktokSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={item.tiktokSourceUrl}
                    onClick={(event) => event.stopPropagation()}
                    className="flex min-w-0 items-center gap-1 text-[10px] font-medium leading-tight text-accent-coral hover:text-accent-coral/80"
                  >
                    <ExternalLink className="size-2.5 shrink-0" />
                    <span className="truncate">{item.tiktokSourceUrl}</span>
                  </a>
                )}
                <OutputReviewStatusControl
                  outputId={item.id}
                  reviewStatus={item.reviewStatus}
                  compact
                  onStatusChange={(reviewStatus) =>
                    onReviewStatusChange?.(item.id, reviewStatus)
                  }
                />
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
        <DialogContent className="!w-auto max-w-[90vw] sm:!max-w-[90vw] p-2 rounded-lg">
          <DialogTitle className="sr-only">Media preview</DialogTitle>
          {lightbox && (
            <div className="flex flex-col gap-2 w-fit">
              {lightbox.type === "image" ? (
                <img
                  src={lightbox.url}
                  alt={lightbox.prompt || ""}
                  className="max-h-[80vh] max-w-[85vw] rounded-lg object-contain"
                />
              ) : (
                <video
                  src={lightbox.url}
                  controls
                  className="max-h-[80vh] max-w-[85vw] rounded-lg object-contain"
                />
              )}
              <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
                <div className="min-w-0">
                  <span>{lightbox.model}</span>
                  {lightbox.tiktokSourceUrl && (
                    <a
                      href={lightbox.tiktokSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={lightbox.tiktokSourceUrl}
                      className="mt-1 flex min-w-0 items-center gap-1 text-accent-coral hover:text-accent-coral/80"
                    >
                      <ExternalLink className="size-3 shrink-0" />
                      <span className="truncate">{lightbox.tiktokSourceUrl}</span>
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <OutputReviewStatusControl
                    outputId={lightbox.id}
                    reviewStatus={lightbox.reviewStatus}
                    onStatusChange={(reviewStatus) => {
                      onReviewStatusChange?.(lightbox.id, reviewStatus);
                      setLightbox({ ...lightbox, reviewStatus });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => downloadFile(`/api/files/${lightbox.id}/download`)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-accent-coral text-white hover:bg-accent-coral/90 transition-colors"
                  >
                    <Download className="size-3" />
                    Download
                  </button>
                  <span>{formatRelativeDate(lightbox.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
