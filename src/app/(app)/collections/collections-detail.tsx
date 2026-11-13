"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button, CountBadge, EmptyState, Icon, IconButton, MediaTile } from "@/components/workbench";
import { assetUrl, assetsForCollection } from "./collections-helpers";
import { ConfirmDialog } from "./collections-dialogs";
import type { CollectionsDetailModel, ConfirmRequest } from "./types";

export function CollectionsDetail({ detail }: { detail: CollectionsDetailModel | null }) {
  return (
    <Sheet open={detail !== null} onOpenChange={(open) => !open && detail?.onClose()}>
      <SheetContent
        showCloseButton={false}
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:border-l-0 data-[side=right]:sm:max-w-[520px]"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          detail?.onDropFiles(event.dataTransfer.files);
        }}
      >
        {detail ? <DetailBody key={detail.collection.id} detail={detail} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({ detail }: { detail: CollectionsDetailModel }) {
  const { collection, assets, uploadProgress, onAddImages, onDelete, onToggleAsset } = detail;
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const included = assetsForCollection(collection, assets);
  const available = assets.filter((asset) => !collection.assetIds.includes(asset.id));

  return (
    <>
      <DetailHeader detail={detail} />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-[18px] max-sm:px-4">
        <section className="flex flex-col gap-2.5" aria-label="In this collection">
          <h3 className="wb-label">In this collection</h3>
          {included.length === 0 ? (
            <EmptyState icon="collections" title="No images in this collection" className="min-h-[156px]" />
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {included.map((asset) => (
                <MediaTile
                  key={asset.id}
                  className="aspect-[3/4]"
                  actions={
                    <button
                      type="button"
                      className="wb-tile-action"
                      aria-label={`Remove ${asset.name} from ${collection.name}`}
                      onClick={() => onToggleAsset(asset.id)}
                    >
                      Remove
                    </button>
                  }
                >
                  <img src={assetUrl(asset.id)} alt={asset.name} loading="lazy" decoding="async" />
                </MediaTile>
              ))}
            </div>
          )}
        </section>
        {available.length > 0 ? (
          <section className="flex flex-col gap-2.5" aria-label="Add from library">
            <div className="flex items-center justify-between gap-3">
              <h3 className="wb-label">Add from library</h3>
              <span className="wb-mono text-fg-secondary">{available.length} more</span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {available.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  aria-label={`Add ${asset.name} to ${collection.name}`}
                  onClick={() => onToggleAsset(asset.id)}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-media outline-none focus-visible:ring-2 focus-visible:ring-ember"
                >
                  <img
                    src={assetUrl(asset.id)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover opacity-70 transition-opacity duration-[var(--pf-dur-feedback)] ease-pf group-hover:opacity-100"
                  />
                  <span className="absolute right-1.5 top-1.5 grid size-[22px] place-items-center rounded-full bg-[var(--pf-scrim)] text-[var(--pf-on-media)] opacity-0 transition-opacity duration-[var(--pf-dur-feedback)] ease-pf group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
                    <Icon name="plus" size={12} strokeWidth={2.5} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 max-sm:px-4">
        <Button
          variant="danger"
          onClick={() =>
            setConfirm({
              title: `Delete ${collection.name}?`,
              description: "Its images will stay in the library.",
              actionLabel: "Delete collection",
              onConfirm: onDelete,
            })
          }
        >
          Delete collection
        </Button>
        <span className="flex-1" />
        <Button variant="primary" size={40} onClick={onAddImages} disabled={uploadProgress !== null}>
          <Icon name="upload" strokeWidth={2} />
          {uploadProgress
            ? `Uploading ${uploadProgress.done} / ${uploadProgress.total}`
            : "Upload to collection"}
        </Button>
      </div>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

function DetailHeader({ detail }: { detail: CollectionsDetailModel }) {
  const { collection, onClose, onRename } = detail;
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft !== null) onRename(draft);
    setDraft(null);
  }

  return (
    <div className="flex min-h-[70px] items-center gap-2.5 border-b border-hairline px-6 pb-4 pt-[max(20px,env(safe-area-inset-top))] max-sm:px-4">
      {draft === null ? (
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <SheetTitle className="truncate text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-fg">
            {collection.name}
          </SheetTitle>
          <CountBadge count={collection.assetIds.length} label={`${collection.assetIds.length} images`} />
          <IconButton
            icon="pencil"
            label="Rename collection"
            size={30}
            onClick={() => setDraft(collection.name)}
          />
        </div>
      ) : (
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            commit();
          }}
        >
          <SheetTitle className="sr-only">{collection.name}</SheetTitle>
          <input
            autoFocus
            aria-label="Collection name"
            className="wb-input min-w-0 flex-1"
            data-size="36"
            value={draft}
            maxLength={160}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setDraft(null);
              }
            }}
          />
          <Button type="submit" variant="strong" disabled={!draft.trim()}>
            Save
          </Button>
          <Button variant="link" onClick={() => setDraft(null)}>
            Cancel
          </Button>
        </form>
      )}
      <IconButton icon="x" label="Close collection" onClick={onClose} />
    </div>
  );
}
