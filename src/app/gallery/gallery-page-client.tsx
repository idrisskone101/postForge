"use client";

import { useCallback, useMemo, useState } from "react";
import { GalleryGrid } from "@/components/gallery-grid";
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
import { Images, Download, Trash2, X, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/utils/download";

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
  createdAt: string;
}

interface GalleryPageClientProps {
  items: GalleryItem[];
  models: Array<{ id: string; name: string }>;
}

const filterOptions = [
  { value: "all", label: "All Assets" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
] as const;

export function GalleryPageClient({ items, models }: GalleryPageClientProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = items.filter((item) => !deletedIds.has(item.id));
    if (typeFilter !== "all") {
      result = result.filter((item) => item.type === typeFilter);
    }
    if (sortOrder === "oldest") {
      result = [...result].reverse();
    }
    return result;
  }, [items, typeFilter, sortOrder, deletedIds]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDownload = () => {
    for (const id of selectedIds) {
      downloadFile(`/api/files/${id}/download`);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/files/${id}`, { method: "DELETE" }).catch(() => {})
      )
    );
    setDeletedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setSelectedIds(new Set());
    setIsDeleting(false);
  };

  const handleSingleDelete = async (id: string) => {
    await fetch(`/api/files/${id}`, { method: "DELETE" }).catch(() => {});
    setDeletedIds((prev) => new Set(prev).add(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectionCount = selectedIds.size;
  const totalCount = items.length - deletedIds.size;

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          {/* Floating badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-coral/10 text-accent-coral text-xs font-medium animate-fade-in-up"
            style={{ animationDelay: "0.1s", animationFillMode: "backwards" }}
          >
            <span className="size-2 rounded-full bg-accent-coral animate-pulse" />
            Curating Magic
          </div>
          <h1
            className="text-4xl sm:text-5xl font-semibold tracking-tight animate-fade-in-up"
            style={{ animationDelay: "0.2s", animationFillMode: "backwards" }}
          >
            Gallery Forge
          </h1>
          <p
            className="text-muted-foreground animate-fade-in-up"
            style={{ animationDelay: "0.3s", animationFillMode: "backwards" }}
          >
            Your creative collection, beautifully organized
          </p>
        </div>

        {/* Filter + Sort pills */}
        <div
          className="flex items-center gap-3 flex-wrap animate-fade-in-up"
          style={{ animationDelay: "0.4s", animationFillMode: "backwards" }}
        >
          {/* Type filter pills */}
          <div className="flex items-center gap-2">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTypeFilter(opt.value)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  typeFilter === opt.value
                    ? "bg-accent-coral text-white shadow-md"
                    : "bg-card border border-border text-foreground hover:border-accent-coral/40 hover:text-accent-coral"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort pill */}
          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
            }
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-card border border-border text-foreground hover:border-accent-coral/40 hover:text-accent-coral transition-all duration-200"
          >
            <ArrowUpDown className="size-3.5" />
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </button>
        </div>
      </div>

      {/* Gallery content */}
      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Images className="size-16 mb-4 opacity-40" />
          <p className="text-lg font-medium">No media yet</p>
          <p className="text-sm mt-2">
            Generated images and videos will appear here once you start
            creating.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {totalCount} items
          </p>
          <GalleryGrid
            items={filtered}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onDelete={handleSingleDelete}
          />
        </>
      )}

      {/* Bulk action bar */}
      {selectionCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1F2937] rounded-[32px] px-6 py-3 flex items-center gap-4 shadow-2xl">
          {/* Coral count circle */}
          <div className="flex items-center gap-3">
            <span className="size-8 rounded-full bg-accent-coral text-white text-sm font-bold flex items-center justify-center">
              {selectionCount}
            </span>
            <span className="text-sm font-medium text-white">
              asset{selectionCount !== 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="w-px h-6 bg-white/20" />

          {/* Download */}
          <button
            type="button"
            onClick={handleBulkDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <Download className="size-4" />
            Download
          </button>

          {/* Delete with confirm */}
          <AlertDialog>
            <AlertDialogTrigger
              disabled={isDeleting}
              render={
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                />
              }
            >
              <Trash2 className="size-4" />
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selectionCount} asset
                  {selectionCount !== 1 ? "s" : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected files. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Close */}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="size-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
