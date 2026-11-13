"use client";

import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Panel } from "@/components/workbench/panel";
import { downloadFile } from "@/lib/utils/download";
import { GalleryGridCards } from "@/components/gallery/grid-cards";
import {
  GALLERY_INSPECTOR_CLASS,
  GalleryInspectorEmpty,
} from "@/components/gallery/inspector-empty";
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

export function GalleryGrid({
  session,
  renderHeader,
  fallback,
  footer,
}: {
  session: GalleryGridSession;
  renderHeader: (controls: { openDetails: () => void }) => ReactNode;
  fallback?: ReactNode;
  footer?: ReactNode;
}) {
  const { items, view, selectedIds, onToggleSelect, onDelete, onReviewStatusChange, onHandoff, onFeedback } =
    session;
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preferredInspectedId, setPreferredInspectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const inspectedId =
    preferredInspectedId && selectedIds.has(preferredInspectedId)
      ? preferredInspectedId
      : selectedItems[0]?.id ?? null;
  const inspectedIndex = selectedItems.findIndex((item) => item.id === inspectedId);
  const selectedItem = inspectedIndex >= 0 ? selectedItems[inspectedIndex] : null;

  const toggleSelection = (id: string) => {
    if (!selectedIds.has(id)) setPreferredInspectedId(id);
    else if (preferredInspectedId === id) setPreferredInspectedId(null);
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
    toggleSelection,
    openPreview: setLightbox,
    copySourceUrl,
    downloadItem,
    deleteItem,
    onReviewStatusChange,
    onHandoff,
    onFeedback,
  };

  const selection: GallerySelection | null = selectedItem
    ? {
        item: selectedItem,
        position: { index: inspectedIndex, total: selectedItems.length },
        onStep: (direction) => {
          const total = selectedItems.length;
          const next = selectedItems[(inspectedIndex + direction + total) % total];
          if (next) setPreferredInspectedId(next.id);
        },
        onOpenPreview: () => setLightbox(selectedItem),
        onDownload: downloadItem,
        onCopySource: copySourceUrl,
        onHandoff,
      }
    : null;

  return (
    <>
      <div
        data-gallery-page="true"
        data-gallery-selection-layout={selection ? "inspecting" : "idle"}
        className="flex min-h-0 min-w-0 flex-1 items-start gap-3"
      >
        <Panel className="min-w-0 flex-1 gap-3 self-stretch">
          {renderHeader({ openDetails: () => setDetailsOpen(true) })}
          {fallback ??
            (view === "list" ? (
              <GalleryListTable items={items} session={mediaSession} />
            ) : (
              <GalleryGridCards items={items} session={mediaSession} />
            ))}
          {footer}
        </Panel>

        <aside aria-label="Selected output" className={GALLERY_INSPECTOR_CLASS}>
          {selection ? (
            <div key={selection.item.id} className="wb-fade-in flex min-w-0 flex-col">
              <GallerySelectionInspector selection={selection} />
            </div>
          ) : (
            <GalleryInspectorEmpty />
          )}
        </aside>
      </div>

      <Sheet open={detailsOpen && selection !== null} onOpenChange={setDetailsOpen}>
        <SheetContent
          side="right"
          className="gap-0 overflow-y-auto p-5 pt-14 data-[side=right]:w-full data-[side=right]:sm:max-w-[360px] xl:hidden"
        >
          <SheetTitle className="sr-only">Selected output</SheetTitle>
          {selection && (
            <GallerySelectionInspector key={selection.item.id} selection={selection} />
          )}
        </SheetContent>
      </Sheet>

      <GalleryLightbox
        item={lightbox}
        session={mediaSession}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
