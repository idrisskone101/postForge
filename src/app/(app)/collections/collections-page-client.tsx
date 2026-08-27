"use client";

import { Check, X } from "lucide-react";
import { PinterestImportDialog } from "@/components/pinterest-import-dialog";
import { CollectionsDetail } from "./collections-detail";
import { CollectionsEmpty } from "./collections-empty";
import { CollectionsLibrary } from "./collections-library";
import { useCollectionsWorkspace } from "./use-collections-workspace";
import type { CollectionsPageClientProps } from "./types";

export function CollectionsPageClient(props: CollectionsPageClientProps) {
  const workspace = useCollectionsWorkspace(props);
  const {
    inputRef,
    uploading,
    error,
    search,
    active,
    selected,
    selectedAsset,
    pinterestOpen,
    toast,
    assets,
    collections,
    filteredAssets,
    isEmpty,
    setError,
    setSearch,
    setActive,
    setPinterestOpen,
    upload,
    createCollection,
    toggleAsset,
    deleteCollection,
    deleteAsset,
    load,
    notify,
    openFilePicker,
    toggleSelectedAsset,
  } = workspace;

  return (
    <div
      data-page-inset="true"
      className="mx-auto min-w-0 max-w-[1280px] px-5 py-5 sm:px-7 lg:px-8"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void upload(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => event.target.files && void upload(event.target.files)}
      />
      {error ? (
        <div
          role="alert"
          className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)]"
        >
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
      {isEmpty ? (
        <CollectionsEmpty
          uploading={uploading}
          onUpload={openFilePicker}
          onPinterest={() => setPinterestOpen(true)}
        />
      ) : (
        <CollectionsLibrary
          library={{
            collections,
            assets,
            filteredAssets,
            search,
            selectedId: selected,
            selectedAsset,
            uploading,
            onSearchChange: setSearch,
            onSelect: toggleSelectedAsset,
            onOpenCollection: setActive,
            onCreateCollection: () => void createCollection(),
            onDeleteAsset: (asset) => void deleteAsset(asset),
            onChooseFiles: openFilePicker,
            onPinterest: () => setPinterestOpen(true),
          }}
        />
      )}
      {active ? (
        <CollectionsDetail
          detail={{
            collection: active,
            assets,
            onClose: () => setActive(null),
            onAddImages: openFilePicker,
            onDelete: () => void deleteCollection(active),
            onToggleAsset: (assetId) => void toggleAsset(active, assetId),
          }}
        />
      ) : null}
      {toast ? (
        <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-background shadow-xl sm:left-auto sm:max-w-[420px]">
          <Check className="size-3.5 shrink-0 text-[var(--pf-success)]" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span>
        </div>
      ) : null}
      <PinterestImportDialog
        open={pinterestOpen}
        onOpenChange={setPinterestOpen}
        onImported={(result) => {
          void load().then(() =>
            notify(
              `${result.imported} Pinterest image${result.imported === 1 ? "" : "s"} imported as a collection${result.skipped ? ` · ${result.skipped} skipped` : ""}`
            )
          );
        }}
      />
    </div>
  );
}
