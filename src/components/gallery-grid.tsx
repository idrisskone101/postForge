"use client";

import { useState } from "react";
import { Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/utils/download";
import { GalleryGridCards } from "@/components/gallery/grid-cards";
import { GalleryLightbox } from "@/components/gallery/lightbox";
import { GalleryListTable } from "@/components/gallery/list-table";
import type { GalleryMediaSession } from "@/components/gallery/media-session";
import {
  GallerySelectionInspector,
  type GallerySelection,
} from "@/components/gallery/selection-inspector";
import type {
  GalleryFeedback,
  GalleryItem,
  GalleryView,
} from "@/components/gallery/types";

export type GalleryGridSession = {
  items: GalleryItem[];
  view: GalleryView;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
  onReviewStatusChange?: (
    id: string,
    reviewStatus: GalleryItem["reviewStatus"]
  ) => void;
  onHandoff?: (item: GalleryItem) => Promise<boolean>;
  onFeedback?: (feedback: GalleryFeedback) => void;
};

export function GalleryGrid({ session }: { session: GalleryGridSession }) {
  const {
    items,
    view,
    selectedIds,
    onToggleSelect,
    onDelete,
    onReviewStatusChange,
    onHandoff,
    onFeedback,
  } = session;
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preferredInspectedId, setPreferredInspectedId] = useState<string | null>(
    null
  );
  const [stampedIds, setStampedIds] = useState<ReadonlySet<string>>(new Set());

  const inspectedId =
    selectedIds.size === 0
      ? null
      : preferredInspectedId && selectedIds.has(preferredInspectedId)
        ? preferredInspectedId
        : items.find((item) => selectedIds.has(item.id))?.id ?? null;

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

  const toggleSelection = (id: string) => {
    if (selectedIds.has(id)) {
      if (preferredInspectedId === id) {
        setPreferredInspectedId(
          items.find((item) => item.id !== id && selectedIds.has(item.id))?.id ??
            null
        );
      }
    } else {
      setPreferredInspectedId(id);
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

  const mediaSession: GalleryMediaSession = {
    selectedIds,
    deletingId,
    stampedIds,
    toggleSelection,
    openPreview: setLightbox,
    copySourceUrl,
    downloadItem,
    deleteItem,
    markStamped,
    onReviewStatusChange,
    onHandoff,
    onFeedback,
  };

  const selection: GallerySelection | null = selectedItem
    ? {
        item: selectedItem,
        onDeselect: () => toggleSelection(selectedItem.id),
        onOpenPreview: () => setLightbox(selectedItem),
        onDelete,
        onReviewStatusChange,
        onHandoff,
        onFeedback,
      }
    : null;

  if (items.length === 0) {
    return (
      <div className="pf-card flex min-h-64 flex-col items-center justify-center text-[var(--pf-muted)]">
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
          <GalleryListTable items={items} session={mediaSession} />
        ) : (
          <GalleryGridCards items={items} view={view} session={mediaSession} />
        )}

        {selection && (
          <GallerySelectionInspector selection={selection}>
            <ItemPrompt item={selection.item} />
          </GallerySelectionInspector>
        )}
      </div>

      <GalleryLightbox
        item={lightbox}
        session={mediaSession}
        prompt={lightbox ? <LightboxPrompt lightbox={lightbox} /> : null}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}


function ItemPrompt({ item }: { item: GalleryItem }) {
  if (!item.prompt) return null;
  return (
    <p className="min-w-0 break-words text-[12px] leading-[1.15rem] text-muted-foreground [overflow-wrap:anywhere] line-clamp-3">
      {item.prompt}
    </p>
  );
}

function LightboxPrompt({ lightbox }: { lightbox: GalleryItem }) {
  if (!lightbox.prompt) return null;
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Prompt
      </p>
      <p className="mt-1.5 min-w-0 break-words text-[13px] leading-5 text-foreground/80 [overflow-wrap:anywhere] line-clamp-5">
        {lightbox.prompt}
      </p>
    </div>
  );
}