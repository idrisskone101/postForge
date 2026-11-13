"use client";

import { PinterestImportDialog } from "@/components/pinterest-import-dialog";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { Button, EmptyState, Icon, Toast } from "@/components/workbench";
import { CollectionsDetail } from "./collections-detail";
import { CollectionsEmpty } from "./collections-empty";
import { CollectionsLibrary } from "./collections-library";
import { UploadStatus } from "./upload-status";
import { useCollectionsWorkspace } from "./use-collections-workspace";
import type { CollectionsPageClientProps } from "./types";

export function CollectionsPageClient(props: CollectionsPageClientProps) {
  const workspace = useCollectionsWorkspace(props);
  const {
    inputRef,
    uploadProgress,
    error,
    active,
    toast,
    assets,
    isEmpty,
    dismissError,
    dismissToast,
    setActiveId,
    setPinterestOpen,
    upload,
    renameCollection,
    toggleAsset,
    deleteCollection,
    load,
    notify,
    openFilePicker,
  } = workspace;
  const loadFailed = isEmpty && error !== null;

  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void upload(event.dataTransfer.files);
      }}
    >
      <WorkspaceHeaderAccessory>
        <Button
          size={40}
          onClick={() => setPinterestOpen(true)}
          aria-label="Import from Pinterest"
          className="max-sm:flex-1 max-[359.98px]:flex-none"
        >
          <span className="max-[359.98px]:hidden">Import from Pinterest</span>
          <span className="min-[360px]:hidden">Pinterest</span>
        </Button>
        <Button
          variant="primary"
          size={40}
          onClick={openFilePicker}
          disabled={uploadProgress !== null}
          className="max-sm:flex-1"
        >
          <Icon name="upload" strokeWidth={2} />
          Upload images
        </Button>
      </WorkspaceHeaderAccessory>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => event.target.files && void upload(event.target.files)}
      />
      {loadFailed ? (
        <section className="wb-panel max-sm:px-4" data-pad="wide">
          <EmptyState icon="alert" tone="error" title="Collections could not load" detail={error}>
            <Button variant="strong" onClick={() => void load()}>
              Try again
            </Button>
          </EmptyState>
        </section>
      ) : null}
      {!loadFailed && isEmpty ? <CollectionsEmpty /> : null}
      {isEmpty ? null : <CollectionsLibrary workspace={workspace} />}
      <CollectionsDetail
        detail={
          active
            ? {
                collection: active,
                assets,
                uploadProgress,
                onClose: () => setActiveId(null),
                onAddImages: openFilePicker,
                onRename: (name) => void renameCollection(active, name),
                onDelete: () => void deleteCollection(active),
                onToggleAsset: (assetId) => void toggleAsset(active, assetId),
                onDropFiles: (files) => void upload(files),
              }
            : null
        }
      />
      <div className="wb-toast-region">
        {uploadProgress ? <UploadStatus progress={uploadProgress} /> : null}
        {toast ? <Toast key={toast.id} toast={toast} onDismiss={dismissToast} /> : null}
        {error && !loadFailed ? (
          <Toast
            key={error}
            toast={{ id: "error", tone: "bad", message: error }}
            onDismiss={dismissError}
          />
        ) : null}
      </div>
      <PinterestImportDialog
        open={workspace.pinterestOpen}
        onOpenChange={setPinterestOpen}
        onImported={(result) => {
          void load().then(() =>
            notify(
              `${result.imported} Pinterest image${result.imported === 1 ? "" : "s"} imported as a collection${result.skipped ? `, ${result.skipped} skipped` : ""}`
            )
          );
        }}
      />
    </div>
  );
}
