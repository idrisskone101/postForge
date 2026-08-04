"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, FolderOpen, ImageIcon, Loader2 } from "lucide-react";
import {
  isCollectionAssetRecord,
  isCollectionRecord,
  type CollectionFeatureRecord,
} from "@/lib/collections";
import { fetchWorkspaceFeature } from "@/lib/workspace-features-client";
import { cn } from "@/lib/utils";

interface CollectionReferencePickerProps {
  selectedAssetIds: string[];
  onChange: (assetIds: string[]) => void;
  maxSelection?: number;
  disabled?: boolean;
  disabledMessage?: string;
}

export function CollectionReferencePicker({
  selectedAssetIds,
  onChange,
  maxSelection = 14,
  disabled = false,
  disabledMessage,
}: CollectionReferencePickerProps) {
  const [records, setRecords] = useState<CollectionFeatureRecord[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceFeature<CollectionFeatureRecord>("collections")
      .then(({ records: next }) => {
        if (cancelled) return;
        setRecords(next);
        const firstCollection = next.find(isCollectionRecord);
        if (firstCollection) setSelectedCollectionId(firstCollection.id);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Collections could not be loaded."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const assets = useMemo(() => records.filter(isCollectionAssetRecord), [records]);
  const collections = useMemo(() => records.filter(isCollectionRecord), [records]);
  const selectedCollection =
    collections.find((collection) => collection.id === selectedCollectionId) ?? null;
  const collectionAssets = (selectedCollection?.assetIds ?? [])
    .map((id) => assets.find((asset) => asset.id === id))
    .filter(isCollectionAssetRecord);

  function toggle(assetId: string) {
    if (disabled) return;
    if (selectedAssetIds.includes(assetId)) {
      onChange(selectedAssetIds.filter((id) => id !== assetId));
      return;
    }
    if (maxSelection === 1) {
      onChange([assetId]);
      return;
    }
    onChange([...selectedAssetIds, assetId].slice(-maxSelection));
  }

  if (loading) {
    return (
      <div className="flex min-h-24 items-center justify-center rounded-lg border border-[#E1E2DC] bg-[#FAFBF7] text-[#858681]">
        <Loader2 className="mr-2 size-3.5 animate-spin" />
        <span className="text-[9px]">Loading collections…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="min-w-0 break-words rounded-lg bg-[#FEF0EF] px-3 py-2 text-[9px] text-[#C53A32] [overflow-wrap:anywhere]">
        {error}
      </p>
    );
  }

  if (collections.length === 0) {
    return (
      <a
        href="/collections"
        className="flex min-h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-[#CFD0C8] bg-[#FAFBF7] px-3 text-[9px] font-semibold text-[#686965]"
      >
        <FolderOpen className="size-4" /> Create a collection to reuse its images
      </a>
    );
  }

  return (
    <div className={cn("space-y-3", disabled && "opacity-60")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Visual collection</span>
          <select
            aria-label="Visual collection"
            value={selectedCollectionId}
            onChange={(event) => setSelectedCollectionId(event.target.value)}
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-[#D7D8D0] bg-[#FCFCFA] px-3 text-[10px] font-medium outline-none focus:border-[#FF4A20]"
          >
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name} · {collection.assetIds.length} images
              </option>
            ))}
          </select>
        </label>
        <span className="shrink-0 text-[8px] text-[#858681]">
          {selectedAssetIds.length}/{maxSelection} selected
        </span>
      </div>

      {disabledMessage && disabled ? (
        <p className="rounded-lg bg-[#F1F2EC] px-3 py-2 text-[9px] leading-4 text-[#777873]">
          {disabledMessage}
        </p>
      ) : collectionAssets.length === 0 ? (
        <p className="flex min-h-20 items-center justify-center gap-2 rounded-lg border border-dashed border-[#CFD0C8] text-[9px] text-[#858681]">
          <ImageIcon className="size-4" /> This collection has no images yet.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {collectionAssets.map((asset) => {
            const selected = selectedAssetIds.includes(asset.id);
            return (
              <button
                type="button"
                key={asset.id}
                disabled={disabled}
                aria-label={`${selected ? "Remove" : "Use"} ${asset.name}`}
                aria-pressed={selected}
                onClick={() => toggle(asset.id)}
                className={cn(
                  "relative aspect-[4/5] min-w-0 overflow-hidden rounded-lg border-2 bg-[#ECEDE7] transition",
                  selected ? "border-[#FF4A20]" : "border-transparent hover:border-[#C7C8C0]"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${encodeURIComponent(asset.id)}`}
                  alt={asset.name}
                  className="size-full object-cover"
                />
                {selected && (
                  <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-[#FF4A20] text-white shadow-sm">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
