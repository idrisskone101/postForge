"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  isCollectionAssetRecord,
  isCollectionRecord,
  type CollectionAssetRecord,
  type CollectionFeatureRecord,
  type CollectionRecord,
} from "@/lib/collections";
import {
  fetchWorkspaceFeature,
  removeWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import { assetUrl, createCollectionRecord } from "./collections-helpers";
import type { CollectionsPageClientProps, CollectionsWorkspace } from "./types";

export function useCollectionsWorkspace({
  initialRecords,
  openUploader = false,
}: CollectionsPageClientProps): CollectionsWorkspace {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const handledUploadQuery = useRef(false);
  const [records, setRecords] = useState<CollectionFeatureRecord[]>(initialRecords);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<CollectionRecord | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pinterestOpen, setPinterestOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetchWorkspaceFeature<CollectionFeatureRecord>("collections");
      setRecords(response.records);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load collections");
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!openUploader) {
      handledUploadQuery.current = false;
      return;
    }
    if (handledUploadQuery.current) return;
    handledUploadQuery.current = true;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.click();
      router.replace("/collections", { scroll: false });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [openUploader, router]);

  const assets = useMemo(() => records.filter(isCollectionAssetRecord), [records]);
  const collections = useMemo(() => records.filter(isCollectionRecord), [records]);
  const filteredAssets = useMemo(
    () => assets.filter((asset) => asset.name.toLowerCase().includes(search.toLowerCase())),
    [assets, search]
  );
  const selectedAsset = assets.find((asset) => asset.id === selected) ?? null;
  const isEmpty = assets.length === 0 && collections.length === 0;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1700);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function toggleSelectedAsset(assetId: string) {
    setSelected((current) => (current === assetId ? null : assetId));
  }

  async function upload(files: FileList | File[]) {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      setError("Choose at least one image file.");
      return;
    }
    setUploading(true);
    setError(null);
    const targetCollection = active;
    const uploadedAssetIds: string[] = [];
    try {
      for (const file of images) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/collection-assets", { method: "POST", body: formData });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? `Failed to upload ${file.name}`);
        }
        const body = (await response.json()) as {
          record?: CollectionAssetRecord;
        };
        if (body.record && isCollectionAssetRecord(body.record)) {
          uploadedAssetIds.push(body.record.id);
        }
      }
      if (targetCollection && uploadedAssetIds.length > 0) {
        const current = await fetchWorkspaceFeature<CollectionFeatureRecord>("collections");
        const latest = current.records.find(
          (record): record is CollectionRecord =>
            record.id === targetCollection.id && isCollectionRecord(record)
        );
        if (!latest) {
          throw new Error("The active collection no longer exists.");
        }
        const next: CollectionRecord = {
          ...latest,
          assetIds: [...new Set([...latest.assetIds, ...uploadedAssetIds])],
          updatedAt: new Date().toISOString(),
        };
        const saved = await saveWorkspaceFeature("collections", next);
        setRecords(saved.records);
        setActive(next);
      } else {
        await load();
      }
      notify(
        `${images.length} image${images.length === 1 ? "" : "s"} uploaded${
          targetCollection ? ` to ${targetCollection.name}` : ""
        }`
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload images");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function createCollection() {
    const name = window.prompt("Collection name");
    if (!name?.trim()) return;
    try {
      const response = await saveWorkspaceFeature(
        "collections",
        createCollectionRecord(name, selected)
      );
      setRecords(response.records);
      notify("Collection created");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create collection");
    }
  }

  async function toggleAsset(collection: CollectionRecord, assetId: string) {
    const next: CollectionRecord = {
      ...collection,
      assetIds: collection.assetIds.includes(assetId)
        ? collection.assetIds.filter((id) => id !== assetId)
        : [...collection.assetIds, assetId],
      updatedAt: new Date().toISOString(),
    };
    const response = await saveWorkspaceFeature("collections", next);
    setRecords(response.records);
    setActive(next);
    notify(next.assetIds.includes(assetId) ? "Image added" : "Image removed");
  }

  async function deleteCollection(collection: CollectionRecord) {
    if (!window.confirm(`Delete ${collection.name}? Its images will stay in the library.`)) {
      return;
    }
    const response = await removeWorkspaceFeature<CollectionFeatureRecord>(
      "collections",
      collection.id
    );
    setRecords(response.records);
    setActive(null);
    notify("Collection deleted");
  }

  async function deleteAsset(asset: CollectionAssetRecord) {
    if (!window.confirm(`Delete ${asset.name}? This cannot be undone.`)) return;
    const response = await fetch(assetUrl(asset.id), { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Unable to delete image");
      return;
    }
    await load();
    setSelected(null);
    notify("Image deleted");
  }

  return {
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
  };
}
