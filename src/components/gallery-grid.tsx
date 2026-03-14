"use client";

import { useState } from "react";
import { MediaPreview } from "@/components/media-preview";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { downloadFile } from "@/lib/utils/download";
import { cn } from "@/lib/utils";
import { Download, Images, Play, Trash2 } from "lucide-react";

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
  createdAt: string | Date;
}

interface GalleryGridProps {
  items: GalleryItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function GalleryGrid({
  items,
  selectedIds,
  onToggleSelect,
  onDelete,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {items.map((item, i) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              className="gallery-card group relative animate-fade-in-up"
              style={{
                animationDelay: `${Math.min(i * 0.05, 0.5)}s`,
                animationFillMode: "backwards",
              }}
            >
              {/* Card container */}
              <div
                className={cn(
                  "relative aspect-[4/5] rounded-[32px] overflow-hidden border border-border bg-card cursor-pointer transition-all duration-300",
                  isSelected && "ring-2 ring-accent-coral ring-offset-2 ring-offset-background"
                )}
                onClick={() => setLightbox(item)}
              >
                {/* Image/Video with hover zoom */}
                {item.type === "image" ? (
                  <img
                    src={item.url}
                    alt={item.prompt || ""}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <video
                    src={item.url}
                    muted
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                )}

                {/* Video badge — top-left */}
                {item.type === "video" && (
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-800">
                    <Play className="size-3 fill-current" />
                    {item.durationSec != null ? `${item.durationSec}s` : "Video"}
                  </div>
                )}

                {/* Checkbox — top-right */}
                <div
                  className={cn(
                    "absolute top-3 right-3 z-10 transition-opacity duration-200",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <label
                    className="flex items-center justify-center size-6 rounded-md border-2 border-white/70 bg-black/30 backdrop-blur-sm cursor-pointer transition-colors"
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
                        className="size-4 text-accent-coral"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                      </svg>
                    )}
                  </label>
                </div>

                {/* Glass overlay — slides up on hover */}
                <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
                  <div
                    className="glass-overlay p-4 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Prompt */}
                    {item.prompt && (
                      <p className="text-xs leading-relaxed line-clamp-2 text-foreground/80">
                        {item.prompt}
                      </p>
                    )}

                    {/* Model + Date */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          item.type === "video"
                            ? "bg-accent-blue/15 text-accent-blue"
                            : "bg-accent-green/15 text-accent-green"
                        )}
                      >
                        {item.model}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeDate(item.createdAt)}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium bg-accent-coral text-white hover:bg-accent-coral/90 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(`/api/files/${item.id}/download`);
                        }}
                      >
                        <Download className="size-3" />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                        className="flex items-center justify-center size-8 rounded-full text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
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
        <DialogContent className="sm:max-w-3xl p-2 rounded-[24px]">
          <DialogTitle className="sr-only">Media preview</DialogTitle>
          {lightbox && (
            <div className="flex flex-col gap-2">
              <MediaPreview
                type={lightbox.type}
                src={lightbox.url}
                width={lightbox.width}
                height={lightbox.height}
                className="w-full max-h-[80vh]"
              />
              <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
                <span>{lightbox.model}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => downloadFile(`/api/files/${lightbox.id}/download`)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent-coral text-white hover:bg-accent-coral/90 transition-colors"
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
