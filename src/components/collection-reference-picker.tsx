"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  isCollectionAssetRecord,
  isCollectionRecord,
  type CollectionFeatureRecord,
  type CollectionRecord,
} from "@/lib/collections";
import { fetchWorkspaceFeature } from "@/lib/workspace-features-client";
import { Button, Chip, EmptyState, Skeleton, buttonClass } from "@/components/workbench";
import { cn } from "@/lib/utils";
import {
  ReferencePickerPopover,
  ReferenceTile,
  type ReferenceRowSummary,
} from "./collection-reference-picker-popover";

interface CollectionReferencePickerProps {
  selectedAssetIds: string[];
  onChange: (assetIds: string[]) => void;
  maxSelection?: number;
  disabled?: boolean;
  disabledMessage?: string;
  refreshKey?: number;
  preferredAssetIds?: string[];
  /**
   * For a surface that is already a dialog, the picker draws in place instead of in a popover:
   * "inline" lays the collections out as chips over the image grid, "select" as one select over it.
   */
  layout?: "popover" | "inline" | "select";
}

type LoadStatus = { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };

export function CollectionReferencePicker(props: CollectionReferencePickerProps) {
  const { selectedAssetIds, onChange, maxSelection = 14, disabled = false } = props;
  const { records, status, retry, selectedCollectionId, setSelectedCollectionId } =
    useCollectionRecords(props.preferredAssetIds, props.refreshKey ?? 0);

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

  const count = `${selectedAssetIds.length} / ${maxSelection}`;
  const summary = rowSummary({
    status,
    disabledMessage: disabled ? props.disabledMessage : undefined,
    selectedAssetIds,
    collections,
    count,
  });

  const layout = props.layout ?? "popover";
  const inline = layout === "inline";
  const grid = GRID[layout];
  const body =
    status.kind === "loading" ? (
      <TileSkeletons layout={layout} />
    ) : status.kind === "error" ? (
      <EmptyState icon="alert" tone="error" title="Collections could not be loaded" detail={status.message} className="min-h-0 py-6">
        <Button variant="strong" onClick={retry}>Retry</Button>
      </EmptyState>
    ) : collections.length === 0 ? (
      <EmptyState icon="collections" title="Create a collection to reuse its images" className="min-h-0 py-6">
        <Link href="/collections" className={buttonClass("strong")}>Open collections</Link>
      </EmptyState>
    ) : (
      <>
        {inline ? (
          <div role="group" aria-label="Visual collection" className="flex min-w-0 flex-wrap items-center gap-1.5">
            {collections.map((collection) => (
              <Chip
                key={collection.id}
                check={false}
                chosen={collection.id === selectedCollectionId}
                onClick={() => setSelectedCollectionId(collection.id)}
                className="max-w-full px-3"
              >
                <span className="truncate">{collection.name}</span>
              </Chip>
            ))}
            <span className="ml-auto text-[13px] leading-4 text-fg-muted" aria-live="polite">
              {count} selected
            </span>
            {selectedAssetIds.length > 0 ? (
              <Button variant="link" size={32} onClick={() => onChange([])}>Clear</Button>
            ) : null}
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <select
              aria-label="Visual collection"
              value={selectedCollectionId}
              onChange={(event) => setSelectedCollectionId(event.target.value)}
              className={cn("wb-input min-w-0 flex-1", layout === "select" ? "font-medium" : "bg-raised-strong")}
              data-size={layout === "select" ? undefined : "36"}
            >
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}{layout === "select" ? "," : " ·"} {collection.assetIds.length} images
                </option>
              ))}
            </select>
            <span className={cn("wb-mono shrink-0", layout === "select" ? "text-fg-muted" : "text-fg")} aria-label={`${selectedAssetIds.length} of ${maxSelection} selected`}>
              {count}
            </span>
            {/* With one image to pick, the chosen tile is its own clear control. */}
            {selectedAssetIds.length > 0 && !(layout === "select" && maxSelection === 1) ? (
              <Button variant="link" size={32} onClick={() => onChange([])}>Clear</Button>
            ) : null}
          </div>
        )}
        {collectionAssets.length === 0 ? (
          <EmptyState icon="gallery" title="This collection has no images yet." className="min-h-0 py-6" />
        ) : (
          <div className={grid}>
            {collectionAssets.map((asset) => {
              const selected = selectedAssetIds.includes(asset.id);
              return (
                <ReferenceTile
                  key={asset.id}
                  selected={selected}
                  label={`${selected ? "Remove" : "Use"} ${asset.name}`}
                  onToggle={() => toggle(asset.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/files/${encodeURIComponent(asset.id)}`} alt={asset.name} />
                </ReferenceTile>
              );
            })}
          </div>
        )}
      </>
    );

  if (inline) return <div className="flex min-w-0 flex-col gap-3.5">{body}</div>;
  if (layout === "select") return <div className="flex min-w-0 flex-col gap-[18px]">{body}</div>;
  return (
    <ReferencePickerPopover summary={summary} label="Visual collection" disabled={disabled}>
      {() => body}
    </ReferencePickerPopover>
  );
}

const GRID = {
  popover: "grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2 p-1",
  inline:
    "wb-ring-room grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,128px)]",
  select: "grid grid-cols-3 gap-2 sm:grid-cols-6",
} as const;

const SKELETON_TILES = { popover: 8, inline: 4, select: 6 } as const;

function useCollectionRecords(preferredAssetIds: string[] | undefined, refreshKey: number) {
  const [records, setRecords] = useState<CollectionFeatureRecord[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceFeature<CollectionFeatureRecord>("collections")
      .then(({ records: next }) => {
        if (cancelled) return;
        setStatus({ kind: "ready" });
        setRecords(next);
        const collections = next.filter(isCollectionRecord);
        const preferred = collections.find((collection) =>
          collection.assetIds.some((id) => preferredAssetIds?.includes(id)),
        );
        const nextCollection = preferred ?? collections[0];
        if (nextCollection) setSelectedCollectionId(nextCollection.id);
      })
      .catch((cause) => {
        if (cancelled) return;
        setStatus({
          kind: "error",
          message: cause instanceof Error ? cause.message : "Collections could not be loaded.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [preferredAssetIds, refreshKey, attempt]);

  return {
    records,
    status,
    selectedCollectionId,
    setSelectedCollectionId,
    retry: () => {
      setStatus({ kind: "loading" });
      setAttempt((value) => value + 1);
    },
  };
}

function rowSummary({
  status,
  disabledMessage,
  selectedAssetIds,
  collections,
  count,
}: {
  status: LoadStatus;
  disabledMessage: string | undefined;
  selectedAssetIds: string[];
  collections: CollectionRecord[];
  count: string;
}): ReferenceRowSummary {
  if (disabledMessage) return { text: disabledMessage, placeholder: true };
  if (status.kind === "loading") return { text: "Loading collections…", placeholder: true };
  if (status.kind === "error") return { text: "Collections could not be loaded", tone: "bad" };
  const first = selectedAssetIds[0];
  if (!first) return { text: "No collection chosen", placeholder: true };
  const owner = collections.find((collection) =>
    selectedAssetIds.every((id) => collection.assetIds.includes(id)),
  );
  return {
    text: owner?.name ?? `${selectedAssetIds.length} images`,
    meta: count,
    thumb: (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/files/${encodeURIComponent(first)}`} alt="" />
    ),
  };
}

function TileSkeletons({ layout }: { layout: keyof typeof GRID }) {
  const inline = layout === "inline";
  return (
    <div
      role="status"
      aria-label="Loading collections…"
      className={cn("flex flex-col", layout === "select" ? "gap-[18px]" : "gap-3.5")}
    >
      {layout === "select" ? <Skeleton className="h-[42px] w-full rounded-lg" /> : null}
      {inline ? (
        <div className="flex gap-1.5">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      ) : null}
      <div className={GRID[layout]}>
        {Array.from({ length: SKELETON_TILES[layout] }, (_, index) => (
          <Skeleton key={index} shape="tile" className="aspect-[4/5]" />
        ))}
      </div>
    </div>
  );
}
