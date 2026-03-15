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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* Header — inline with filters */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
          <div className="h-4 w-px bg-border" />
          {/* Filter controls */}
          <div className="flex items-center gap-1.5">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTypeFilter(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                  typeFilter === opt.value
                    ? "bg-accent-coral text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort button */}
        <button
          type="button"
          onClick={() =>
            setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
          }
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 border border-border text-foreground/80 hover:bg-muted transition-all duration-150"
        >
          <ArrowUpDown className="size-3" />
          {sortOrder === "newest" ? "Newest" : "Oldest"}
        </button>
      </div>

      {/* Gallery content */}
      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Images className="size-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">No media yet</p>
          <p className="text-sm mt-2">
            Generated images and videos will appear here once you start
            creating.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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

      {/* Bulk action bar — floating, right-aligned */}
      {selectionCount > 0 && (
        <TooltipProvider>
          <div className="fixed bottom-8 right-8 md:right-12 z-50 flex items-center gap-4 bg-card border border-border rounded-xl p-2 px-4 shadow-2xl animate-fade-in-up">
            {/* Left section: count + label */}
            <div className="flex items-center gap-2.5 pr-4 border-r border-border">
              <span className="size-6 rounded-md bg-accent-blue text-white text-[10px] font-extrabold flex items-center justify-center">
                {selectionCount}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                asset{selectionCount !== 1 ? "s" : ""} selected
              </span>
            </div>

            {/* Right section: icon-only action buttons */}
            <div className="flex items-center gap-1">
              {/* Download */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={handleBulkDownload}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    />
                  }
                >
                  <Download className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>

              <div className="h-4 w-px bg-border mx-1" />

              {/* Delete with confirm */}
              <AlertDialog>
                <Tooltip>
                  <AlertDialogTrigger
                    disabled={isDeleting}
                    render={
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className="p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                          />
                        }
                      />
                    }
                  >
                    <Trash2 className="size-4" />
                  </AlertDialogTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
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

              <div className="h-4 w-px bg-border mx-1" />

              {/* Close */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="p-2 text-muted-foreground/40 hover:text-foreground transition-colors"
                    />
                  }
                >
                  <X className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Clear selection</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
