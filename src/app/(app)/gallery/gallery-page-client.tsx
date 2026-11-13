"use client";

import { useLayoutEffect } from "react";
import Link from "next/link";
import { GalleryGrid, type GalleryGridSession } from "@/components/gallery-grid";
import { GalleryTileSkeletons } from "@/components/gallery/skeletons";
import { Button, buttonClass } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Toast } from "@/components/workbench/toast";
import { GalleryBulkBar } from "./gallery-bulk-bar";
import { GalleryLoadErrorState } from "./gallery-load-error-state";
import type { GalleryPageClientProps } from "./gallery-models";
import { GalleryToolbar } from "./gallery-toolbar";
import { useGalleryWorkspace, type GalleryWorkspace } from "./use-gallery-workspace";

export function GalleryPageClient(props: GalleryPageClientProps) {
  const workspace = useGalleryWorkspace(props);
  const {
    filtered,
    view,
    selectedIds,
    isLoadingMore,
    loadError,
    hasMore,
    toast,
    dismissToast,
    setFeedback,
    toggleSelection,
    handleSingleDelete,
    handleReviewStatusChange,
    handleHandoff,
    handleLoadMore,
    handleRetryLoad,
  } = workspace;

  useLayoutEffect(() => {
    document.querySelector("[data-gallery-first-body]")?.setAttribute("hidden", "");
  }, []);

  const gridSession: GalleryGridSession = {
    items: filtered,
    view,
    selectedIds,
    onToggleSelect: toggleSelection,
    onDelete: handleSingleDelete,
    onReviewStatusChange: handleReviewStatusChange,
    onHandoff: handleHandoff,
    onFeedback: setFeedback,
  };

  const fallback = galleryFallback(workspace);

  const footer = fallback ? null : (
    <>
      {loadError && (
        <div className="wb-notice" data-tone="bad" role="alert">
          <strong>Could not load more.</strong>
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{loadError}</span>
          <Button size={32} onClick={() => void handleRetryLoad()}>
            Retry
          </Button>
        </div>
      )}
      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button disabled={isLoadingMore} onClick={() => void handleLoadMore()}>
            {isLoadingMore ? "Loading more" : "Load more"}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <>
      <GalleryGrid
        session={gridSession}
        renderHeader={({ openDetails }) => (
          <>
            <GalleryToolbar workspace={workspace} />
            <GalleryBulkBar workspace={workspace} onOpenDetails={openDetails} />
          </>
        )}
        fallback={fallback}
        footer={footer}
      />
      <div className="wb-toast-region" aria-live="polite">
        {toast && (
          <Toast
            key={toast.id}
            toast={{ id: toast.id, tone: toast.tone === "error" ? "bad" : "ok", message: toast.message }}
            onDismiss={dismissToast}
          />
        )}
      </div>
    </>
  );
}

function galleryFallback(workspace: GalleryWorkspace) {
  const { isReloading, loadError, activeItems, filtered, handleRetryLoad } = workspace;
  if (isReloading) return <GalleryTileSkeletons />;
  if (loadError && activeItems.length === 0) {
    return <GalleryLoadErrorState message={loadError} onRetry={() => void handleRetryLoad()} />;
  }
  if (filtered.length === 0) return <GalleryEmptyState workspace={workspace} />;
  return null;
}

function GalleryEmptyState({
  workspace,
}: {
  workspace: GalleryWorkspace;
}) {
  const { isGalleryEmpty, query, setQuery, setReviewFilter, replaceRouteFilters } = workspace;

  if (isGalleryEmpty) {
    return (
      <EmptyState icon="gallery" title="No outputs yet" className="min-h-[340px]">
        <Link href="/generate" className={buttonClass("strong")}>
          Open Generate
        </Link>
      </EmptyState>
    );
  }

  return (
    <EmptyState icon="search" title="No outputs match these filters" className="min-h-[340px]">
      <Button
        variant="strong"
        onClick={() => {
          setQuery("");
          if (!query) {
            setReviewFilter("all");
            replaceRouteFilters({ reviewStatus: "all" });
          }
        }}
      >
        {query ? "Clear search" : "Show all review states"}
      </Button>
    </EmptyState>
  );
}
