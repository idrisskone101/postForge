"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ToastMessage } from "@/components/workbench";
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
import { assetUrl, createCollectionRecord, errorMessage } from "./collections-helpers";
import type {
  CollectionsPageClientProps,
  CollectionsWorkspace,
  UploadProgress,
} from "./types";

export function useCollectionsWorkspace({
  initialRecords,
  openUploader = false,
}: CollectionsPageClientProps): CollectionsWorkspace {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const handledUploadQuery = useRef(false);
  const [records, setRecords] = useState<CollectionFeatureRecord[]>(initialRecords);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pinterestOpen, setPinterestOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  async function load() {
    try {
      const response = await fetchWorkspaceFeature<CollectionFeatureRecord>("collections");
      setRecords(response.records);
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load collections"));
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
  const active = collections.find((collection) => collection.id === activeId) ?? null;
  const isEmpty = assets.length === 0 && collections.length === 0;

  const notify = useCallback((message: string) => {
    setToast({ id: `${Date.now()}`, tone: "ok", message });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const dismissError = useCallback(() => setError(null), []);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function toggleSelectedAsset(assetId: string) {
    setSelected((current) => (current === assetId ? null : assetId));
  }

  async function saveCollection(next: CollectionRecord, message: string) {
    try {
      const response = await saveWorkspaceFeature("collections", next);
      setRecords(response.records);
      notify(message);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to save collection"));
    }
  }

  async function upload(files: FileList | File[]) {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      setError("Choose at least one image file.");
      return;
    }
    setUploadProgress({ done: 0, total: images.length });
    setError(null);
    const targetCollection = active;
    const uploadedAssetIds: string[] = [];
    try {
      for (const [index, file] of images.entries()) {
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
        setUploadProgress({ done: index + 1, total: images.length });
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
      } else {
        await load();
      }
      notify(
        `${images.length} image${images.length === 1 ? "" : "s"} uploaded${
          targetCollection ? ` to ${targetCollection.name}` : ""
        }`
      );
    } catch (cause) {
      setError(errorMessage(cause, "Unable to upload images"));
    } finally {
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function createCollection(name: string) {
    if (!name.trim()) return;
    await saveCollection(createCollectionRecord(name, selected), "Collection created");
  }

  async function renameCollection(collection: CollectionRecord, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === collection.name) return;
    await saveCollection(
      { ...collection, name: trimmed, updatedAt: new Date().toISOString() },
      "Collection renamed"
    );
  }

  async function toggleAsset(collection: CollectionRecord, assetId: string) {
    const included = collection.assetIds.includes(assetId);
    const next: CollectionRecord = {
      ...collection,
      assetIds: included
        ? collection.assetIds.filter((id) => id !== assetId)
        : [...collection.assetIds, assetId],
      updatedAt: new Date().toISOString(),
    };
    await saveCollection(next, included ? "Image removed" : "Image added");
  }

  async function deleteCollection(collection: CollectionRecord) {
    try {
      const response = await removeWorkspaceFeature<CollectionFeatureRecord>(
        "collections",
        collection.id
      );
      setRecords(response.records);
      setActiveId(null);
      notify("Collection deleted");
    } catch (cause) {
      setError(errorMessage(cause, "Unable to delete collection"));
    }
  }

  async function deleteAsset(asset: CollectionAssetRecord) {
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
    uploadProgress,
    error,
    search,
    active,
    selectedAsset,
    pinterestOpen,
    toast,
    assets,
    collections,
    filteredAssets,
    isEmpty,
    dismissError,
    dismissToast,
    setSearch,
    setActiveId,
    setSelected,
    setPinterestOpen,
    upload,
    createCollection,
    renameCollection,
    toggleAsset,
    deleteCollection,
    deleteAsset,
    load,
    notify,
    openFilePicker,
    toggleSelectedAsset,
  };
}
