"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check,
  Download,
  FolderOpen,
  Link2,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  assetUrl,
  formatAssetSizeMb,
  formatImageCount,
  formatShortDate,
  previewAssetsForCollection,
} from "./collections-helpers";
import { CollectionsPanel } from "./collections-panel";
import type { CollectionAssetRecord, CollectionRecord } from "@/lib/collections";
import type { CollectionsLibraryModel } from "./types";

export function CollectionsLibrary({ library }: { library: CollectionsLibraryModel }) {
  const {
    collections,
    assets,
    filteredAssets,
    search,
    selectedId,
    selectedAsset,
    uploading,
    onSearchChange,
    onSelect,
    onOpenCollection,
    onCreateCollection,
    onDeleteAsset,
    onChooseFiles,
    onPinterest,
  } = library;

  return (
    <>
      <CollectionsPanel
        data-collections-dropzone="true"
        className="grid min-h-[72px] min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 border-dashed border-[var(--pf-border-strong)] px-4 py-3 sm:grid-cols-[36px_minmax(0,1fr)_auto_auto]"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Upload className="size-4" />
        </span>
        <div className="min-w-0">
          <b className="block text-[13px] font-medium text-foreground">
            Drop images anywhere to upload
          </b>
          <span className="mt-1 block break-words text-[12px] text-muted-foreground">
            JPG, PNG, WEBP · up to 25 MB each · {assets.length} stored
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onPinterest}
          className="col-span-2 w-full sm:col-span-1 sm:w-auto"
        >
          <Link2 className="size-3.5" /> Import from Pinterest
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onChooseFiles}
          disabled={uploading}
          className="col-span-2 w-full sm:col-span-1 sm:w-auto"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Choose files
        </Button>
      </CollectionsPanel>

      <section className="mt-5">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
          <h2 className="pf-section-title">Your visual systems</h2>
          <Button type="button" variant="outline" onClick={onCreateCollection}>
            <Plus className="size-3.5" /> New collection
          </Button>
        </div>
        {collections.length === 0 ? (
          <button
            type="button"
            onClick={onCreateCollection}
            className="mt-3 flex min-h-32 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground"
          >
            <FolderOpen className="size-6" />
            <span className="mt-2 text-[12px] font-semibold">
              Group selected images into a collection
            </span>
          </button>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                assets={assets}
                onOpen={onOpenCollection}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="pf-section-title">Loose assets</h2>
          <label className="flex h-9 min-w-[220px] items-center gap-2 rounded-[8px] border border-border bg-card px-3 text-muted-foreground">
            <Search className="size-3.5 shrink-0" />
            <span className="sr-only">Search assets</span>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Search assets"
            />
          </label>
        </div>

        {selectedAsset ? (
          <CollectionsPanel
            data-collections-selection-bar="true"
            className="mt-3 px-3 py-2"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[8px] bg-primary text-[11px] font-bold text-primary-foreground">
                1
              </span>
              <strong className="shrink-0 text-[13px] font-medium text-foreground">
                1 selected
              </strong>
              <a
                href={assetUrl(selectedAsset.id)}
                download={selectedAsset.name}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Download className="size-3.5" />
                Download
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCreateCollection}
                className="h-auto px-0 text-[12px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                New collection
              </Button>
              <span
                aria-hidden="true"
                className="hidden h-4 w-px bg-border sm:block"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDeleteAsset(selectedAsset)}
                className="ml-auto h-8 gap-1.5 px-2.5 text-[12px] text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </div>
          </CollectionsPanel>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-8">
          {filteredAssets.map((asset) => (
            <AssetTile
              key={asset.id}
              asset={asset}
              selected={selectedId === asset.id}
              onToggle={onSelect}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function CollectionCard({
  collection,
  assets,
  onOpen,
}: {
  collection: CollectionRecord;
  assets: CollectionAssetRecord[];
  onOpen: (collection: CollectionRecord) => void;
}) {
  const thumbs = previewAssetsForCollection(collection, assets);

  return (
    <Card className="pf-card-hover group min-w-0 gap-0 overflow-hidden rounded-lg border border-border bg-card py-0 text-card-foreground shadow-none ring-0 transition-[border-color,box-shadow] duration-[180ms] ease-[var(--pf-ease)] hover:border-[var(--pf-border-strong)]">
      <button
        type="button"
        onClick={() => onOpen(collection)}
        className="block min-w-0 w-full text-left"
      >
        <div className="relative grid h-28 grid-cols-2 grid-rows-2 gap-0.5 bg-muted p-0.5">
          {Array.from({ length: 4 }, (_, index) => {
            const asset = thumbs[index];
            if (!asset) {
              return <span key={index} className="bg-muted" />;
            }
            return (
              <span key={asset.id} className="relative overflow-hidden">
                <Image
                  src={assetUrl(asset.id)}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover"
                  unoptimized
                />
              </span>
            );
          })}
          <span className="pf-data absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
            {collection.assetIds.length}
          </span>
        </div>
        <div className="min-w-0 p-3">
          <h3 className="truncate text-[13px] font-semibold text-foreground">
            {collection.name}
          </h3>
          <p className="mt-1 truncate text-[12px] text-muted-foreground">
            {formatImageCount(collection.assetIds.length)} · updated {formatShortDate(collection.updatedAt)}
          </p>
        </div>
      </button>
    </Card>
  );
}

function AssetTile({
  asset,
  selected,
  onToggle,
}: {
  asset: CollectionAssetRecord;
  selected: boolean;
  onToggle: (assetId: string) => void;
}) {
  return (
    <article className="group min-w-0">
      <button
        type="button"
        onClick={() => onToggle(asset.id)}
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-lg border bg-muted transition-[border-color,box-shadow] duration-[180ms] ease-[var(--pf-ease)]",
          selected
            ? "border-primary ring-1 ring-primary/25"
            : "border-border hover:border-[var(--pf-border-strong)] hover:shadow-[var(--pf-shadow-md)]"
        )}
      >
        <Image
          src={assetUrl(asset.id)}
          alt={asset.name}
          fill
          sizes="(max-width: 640px) 50vw, 180px"
          className="object-cover"
          unoptimized
        />
        <span
          className={cn(
            "absolute left-1.5 top-1.5 grid size-4 place-items-center rounded-full border border-white/80 bg-black/25 text-white",
            selected && "border-primary bg-primary"
          )}
        >
          {selected ? <Check className="size-2.5" /> : null}
        </span>
      </button>
      <div className="px-0.5 py-2">
        <b className="block truncate text-[13px] font-medium text-foreground">{asset.name}</b>
        <span className="pf-data mt-1 block text-[11px] text-muted-foreground">
          {formatAssetSizeMb(asset.fileSizeBytes)} MB · {formatShortDate(asset.createdAt)}
        </span>
      </div>
    </article>
  );
}
