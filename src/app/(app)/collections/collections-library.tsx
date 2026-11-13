"use client";

import { useState } from "react";
import {
  Button,
  CountBadge,
  EmptyState,
  Icon,
  buttonClass,
} from "@/components/workbench";
import { AssetTile } from "./asset-tile";
import { CollectionTile } from "./collection-tile";
import { assetUrl } from "./collections-helpers";
import { ConfirmDialog, NewCollectionDialog } from "./collections-dialogs";
import type { CollectionsWorkspace, ConfirmRequest } from "./types";

export function CollectionsLibrary({ workspace }: { workspace: CollectionsWorkspace }) {
  const {
    collections,
    usage,
    assets,
    filteredAssets,
    search,
    selectedAsset,
    uploadProgress,
    setSearch,
    setSelected,
    setActiveId,
    createCollection,
    deleteAsset,
    openFilePicker,
    toggleSelectedAsset,
  } = workspace;
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  return (
    <>
      <section className="wb-panel max-sm:px-4" data-pad="wide" aria-labelledby="visual-systems-title">
        <div className="wb-panel-head">
          <h2 id="visual-systems-title" className="wb-panel-title flex items-center gap-2.5">
            Visual systems
            <CountBadge className="tracking-normal" count={collections.length} label={`${collections.length} collections`} />
          </h2>
          <Button size={32} className="pl-2.5" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            New collection
          </Button>
        </div>
        {collections.length === 0 ? (
          <EmptyState icon="collections" title="No collections yet" className="min-h-[196px]" />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 max-sm:-mx-4 max-sm:flex max-sm:snap-x max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-1">
            {collections.map((collection, index) => (
              <CollectionTile
                key={collection.id}
                view={{ collection, assets, automationCount: usage[collection.id] }}
                priority={index === 0}
                onOpen={setActiveId}
              />
            ))}
          </div>
        )}
      </section>

      <section
        className="wb-panel min-h-0 flex-1 max-sm:px-4"
        data-pad="wide"
        aria-labelledby="loose-assets-title"
      >
        <div className="wb-panel-head min-h-9 flex-wrap gap-y-3">
          <h2 id="loose-assets-title" className="wb-panel-title flex items-center gap-2.5">
            Loose assets
            <CountBadge className="tracking-normal" count={assets.length} label={`${assets.length} images`} />
          </h2>
          <label
            className="wb-input-wrap w-[260px] px-3 max-sm:w-full [&>input]:text-[14px] [&>input]:leading-[18px] [&>svg]:size-4"
            data-size="36"
          >
            <Icon name="search" size={16} />
            <input
              type="search"
              value={search}
              aria-label="Search assets"
              placeholder="Search assets"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {selectedAsset ? (
          <div className="wb-dock" role="toolbar" aria-label="Selected image">
            <span className="wb-dock-count">1 selected</span>
            <Button variant="link" onClick={() => setSelected(null)}>
              Clear
            </Button>
            <span className="flex-1" />
            <a
              href={assetUrl(selectedAsset.id)}
              download={selectedAsset.name}
              className={buttonClass("outline")}
            >
              <Icon name="download" size={16} />
              Download
            </a>
            <Button variant="outline" onClick={() => setCreating(true)}>
              New collection
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                setConfirm({
                  title: `Delete ${selectedAsset.name}?`,
                  description: "This cannot be undone.",
                  actionLabel: "Delete image",
                  onConfirm: () => void deleteAsset(selectedAsset),
                })
              }
            >
              Delete
            </Button>
          </div>
        ) : null}

        {assets.length === 0 ? (
          <EmptyState icon="upload" title="No loose images yet">
            <Button variant="strong" onClick={openFilePicker} disabled={uploadProgress !== null}>
              Upload images
            </Button>
          </EmptyState>
        ) : (
          <div className="flex min-h-0 gap-4">
            <div className="grid min-w-0 flex-1 grid-cols-2 content-start gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 min-[87.5rem]:grid-cols-6">
              {filteredAssets.map((asset) => (
                <AssetTile
                  key={asset.id}
                  asset={asset}
                  selected={selectedAsset?.id === asset.id}
                  onToggle={toggleSelectedAsset}
                />
              ))}
              {filteredAssets.length === 0 ? (
                <p className="wb-meta col-span-full py-6">No images match “{search.trim()}”.</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={openFilePicker}
              disabled={uploadProgress !== null}
              className="group hidden max-h-[374px] w-[168px] shrink-0 flex-col items-center justify-center gap-3 self-stretch rounded-lg border-[1.5px] border-dashed border-edge p-5 text-center transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember disabled:opacity-60 lg:flex"
            >
              <span className="grid size-11 place-items-center rounded-full bg-raised text-fg">
                <Icon name="upload" size={20} />
              </span>
              <span className="text-[13px] font-medium leading-[18px] text-fg-secondary">
                Drop images to upload
              </span>
            </button>
          </div>
        )}
      </section>

      <NewCollectionDialog
        open={creating}
        withSelection={selectedAsset !== null}
        onOpenChange={setCreating}
        onCreate={(name) => void createCollection(name)}
      />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
