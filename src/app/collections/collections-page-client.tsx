"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  FolderOpen,
  Grid2X2,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

function assetUrl(id: string) {
  return `/api/collection-assets/${encodeURIComponent(id)}`;
}

export function CollectionsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const handledUploadQuery = useRef(false);
  const [records, setRecords] = useState<CollectionFeatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<CollectionRecord | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetchWorkspaceFeature<CollectionFeatureRecord>("collections");
      setRecords(response.records);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load collections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get("upload") !== "1") {
      handledUploadQuery.current = false;
      return;
    }
    if (handledUploadQuery.current) return;
    handledUploadQuery.current = true;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.click();
      const params = new URLSearchParams(searchParams.toString());
      params.delete("upload");
      const query = params.toString();
      router.replace(query ? `/collections?${query}` : "/collections", {
        scroll: false,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [router, searchParams]);

  const assets = useMemo(() => records.filter(isCollectionAssetRecord), [records]);
  const collections = useMemo(() => records.filter(isCollectionRecord), [records]);
  const filteredAssets = useMemo(() => assets.filter((asset) => asset.name.toLowerCase().includes(search.toLowerCase())), [assets, search]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1700);
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
        const current = await fetchWorkspaceFeature<CollectionFeatureRecord>(
          "collections"
        );
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
    const now = new Date().toISOString();
    const record: CollectionRecord = {
      id: `collection_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind: "collection",
      name: name.trim(),
      assetIds: selected ? [selected] : [],
      createdAt: now,
      updatedAt: now,
    };
    try {
      const response = await saveWorkspaceFeature("collections", record);
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
    if (!window.confirm(`Delete ${collection.name}? Its images will stay in the library.`)) return;
    const response = await removeWorkspaceFeature<CollectionFeatureRecord>("collections", collection.id);
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

  if (loading && records.length === 0) return <div className="grid min-h-[520px] place-items-center"><Loader2 className="size-6 animate-spin text-[#FF4A20]" /></div>;

  return (
    <div className="px-5 py-5 sm:px-7 lg:px-8" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); upload(event.dataTransfer.files); }}>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => event.target.files && upload(event.target.files)} />
      {error && <div role="alert" className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-[9px] border border-[#F0B5AA] bg-[#FFF6F4] px-3 py-2 text-[10px] text-[#B83F2D]"><span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span><button onClick={() => setError(null)} className="shrink-0" aria-label="Dismiss error"><X className="size-3.5" /></button></div>}
      {assets.length === 0 && collections.length === 0 ? <section className="pf-card flex min-h-[650px] flex-col items-center justify-center p-6 text-center"><div className="relative h-28 w-44"><span className="absolute left-1 top-4 h-24 w-20 -rotate-6 rounded-[10px] border-4 border-white bg-[linear-gradient(145deg,#F0D5B2,#AC6B55)] shadow-lg" /><span className="absolute left-1/2 top-0 h-24 w-20 -translate-x-1/2 rounded-[10px] border-4 border-white bg-[linear-gradient(145deg,#CAE0F4,#5488BC)] shadow-lg" /><span className="absolute right-1 top-4 h-24 w-20 rotate-6 rounded-[10px] border-4 border-white bg-[linear-gradient(145deg,#D3E9DB,#4F8A65)] shadow-lg" /><span className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full bg-[#FF4A20] text-white shadow-lg"><Plus className="size-4" /></span></div><p className="pf-eyebrow mt-5">Start a visual system</p><h2 className="mt-2 text-[23px] font-semibold tracking-[-0.04em]">Your reusable image library lives here</h2><p className="mt-2 max-w-[480px] text-[10px] leading-5 text-[#7F807B]">Upload owned product shots, portraits, locations, and textures. Group them into collections that other PostForge workflows can reuse.</p><button onClick={() => inputRef.current?.click()} disabled={uploading} className="pf-button-primary mt-5">{uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Upload your first images</button><small className="mt-3 text-[7px] text-[#AAA]">JPG, PNG, WEBP · up to 25 MB each</small></section> : <>
        <section className="grid min-h-[72px] min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 rounded-[11px] border border-dashed border-[#C7C8C0] bg-[#FAFBF7] px-4 py-3 sm:grid-cols-[36px_minmax(0,1fr)_auto]"><span className="grid size-9 place-items-center rounded-[8px] bg-[#FFF0EC] text-[#FF4A20]"><Upload className="size-4" /></span><div className="min-w-0"><b className="block text-[9px]">Drop images anywhere to upload</b><span className="mt-1 block break-words text-[7px] text-[#92938E]">JPG, PNG, WEBP · up to 25 MB each · {assets.length} stored</span></div><button onClick={() => inputRef.current?.click()} disabled={uploading} className="pf-button-secondary col-span-2 w-full sm:col-span-1 sm:w-auto">{uploading ? <Loader2 className="size-3.5 animate-spin" /> : null}Choose files</button></section>
        <section className="mt-5"><div className="flex flex-col items-start justify-between gap-3 sm:flex-row"><div><p className="pf-eyebrow">Collections</p><h2 className="pf-section-title mt-1">Your visual systems</h2></div><button onClick={createCollection} className="pf-button-secondary"><Plus className="size-3.5" /> New collection</button></div>{collections.length === 0 ? <button onClick={createCollection} className="mt-3 flex min-h-32 w-full flex-col items-center justify-center rounded-[11px] border border-dashed border-[#CFCFC7] bg-[var(--pf-surface)] text-[#777873]"><FolderOpen className="size-6" /><span className="mt-2 text-[9px] font-semibold">Group selected images into a collection</span></button> : <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">{collections.map((collection) => { const collectionAssets = collection.assetIds.map((id) => assets.find((asset) => asset.id === id)).filter(isCollectionAssetRecord); return <article key={collection.id} className="pf-card min-w-0 overflow-hidden"><button onClick={() => setActive(collection)} className="block min-w-0 w-full text-left"><div className="relative grid h-28 grid-cols-2 grid-rows-2 gap-0.5 bg-[#ECECE6] p-0.5">{Array.from({ length: 4 }, (_, index) => { const asset = collectionAssets[index]; return asset ? <span key={asset.id} className="relative overflow-hidden"><Image src={assetUrl(asset.id)} alt="" fill sizes="160px" className="object-cover" unoptimized /></span> : <span key={index} className="bg-[#E2E3DC]" />; })}<span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[6px] text-white">{collection.assetIds.length}</span></div><div className="flex min-w-0 items-center justify-between gap-2 p-3"><div className="min-w-0"><h3 className="truncate text-[9px] font-semibold">{collection.name}</h3><p className="mt-1 truncate text-[6.5px] text-[#949590]">{collection.assetIds.length} images · updated {new Date(collection.updatedAt).toLocaleDateString()}</p></div><MoreHorizontal className="size-4 shrink-0 text-[#8D8E89]" /></div></button></article>; })}</div>}</section>
        <section className="mt-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="pf-eyebrow">Recently added</p><h2 className="pf-section-title mt-1">Loose assets</h2></div><label className="flex h-9 min-w-[220px] items-center gap-2 rounded-[9px] border border-[#DADBD2] bg-white px-3"><Search className="size-3.5 text-[#92938E]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[9px] outline-none" placeholder="Search assets" /><Grid2X2 className="size-3.5 text-[#92938E]" /></label></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-8">{filteredAssets.map((asset) => <article key={asset.id} className="group min-w-0"><button onClick={() => setSelected(selected === asset.id ? null : asset.id)} className={cn("relative aspect-[4/5] w-full overflow-hidden rounded-[8px] border-2 bg-[#ECECE6]",selected === asset.id ? "border-[#FF4A20]" : "border-transparent")}><Image src={assetUrl(asset.id)} alt={asset.name} fill sizes="(max-width: 640px) 50vw, 180px" className="object-cover" unoptimized /><span className={cn("absolute left-1.5 top-1.5 grid size-4 place-items-center rounded-[5px] border border-white/80 bg-black/25 text-[7px] text-white",selected === asset.id && "bg-[#FF4A20]")}>{selected === asset.id && <Check className="size-2.5" />}</span></button><div className="px-0.5 py-2"><b className="block truncate text-[7px]">{asset.name}</b><span className="mt-1 block text-[6px] text-[#999]">{(asset.fileSizeBytes / 1_000_000).toFixed(1)} MB · {new Date(asset.createdAt).toLocaleDateString()}</span>{selected === asset.id && <div className="mt-2 flex gap-1"><a href={assetUrl(asset.id)} download={asset.name} className="grid size-7 place-items-center rounded-[6px] border border-[#DADBD2] bg-white"><Download className="size-3" /></a><button onClick={() => deleteAsset(asset)} className="grid size-7 place-items-center rounded-[6px] border border-[#F0B5AA] bg-[#FFF6F4] text-[#D94A34]"><Trash2 className="size-3" /></button><button onClick={createCollection} className="flex h-7 flex-1 items-center justify-center gap-1 rounded-[6px] bg-[#232323] px-1 text-[6px] text-white"><Plus className="size-2.5" />Collection</button></div>}</div></article>)}</div></section>
      </>}

      {active && <div className="fixed inset-0 z-[70] bg-black/35" onClick={() => setActive(null)}><aside className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col bg-[#F8F8F5] shadow-2xl" onClick={(event) => event.stopPropagation()}><header className="flex min-h-24 min-w-0 items-center justify-between gap-3 border-b border-[#DEDFD8] bg-white px-5 pt-[env(safe-area-inset-top)]"><div className="min-w-0"><p className="pf-eyebrow">Collection</p><h2 className="mt-1 break-words text-[19px] font-semibold tracking-[-.03em]">{active.name}</h2><p className="mt-1 text-[7px] text-[#888]">{active.assetIds.length} images · database-backed</p></div><button onClick={() => setActive(null)} className="grid size-8 shrink-0 place-items-center rounded-full border border-[#DADBD2]"><X className="size-3.5" /></button></header><div className="flex flex-col gap-2 p-3 min-[420px]:flex-row"><button onClick={() => inputRef.current?.click()} className="pf-button-primary flex-1"><Plus className="size-3.5" /> Add new images</button><button onClick={() => deleteCollection(active)} className="pf-button-secondary text-[#D94A34]"><Trash2 className="size-3.5" /> Delete</button></div><div className="grid flex-1 auto-rows-[150px] grid-cols-2 gap-2 overflow-y-auto px-3 pb-4 min-[420px]:grid-cols-3">{assets.map((asset) => <button key={asset.id} onClick={() => toggleAsset(active, asset.id)} className={cn("relative overflow-hidden rounded-[8px] border-2",active.assetIds.includes(asset.id) ? "border-[#FF4A20]" : "border-transparent opacity-55 hover:opacity-100")}><Image src={assetUrl(asset.id)} alt={asset.name} fill sizes="140px" className="object-cover" unoptimized />{active.assetIds.includes(asset.id) && <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-[#FF4A20] text-white"><Check className="size-3" /></span>}</button>)}</div><footer className="border-t border-[#DEDFD8] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-[8px] leading-4 text-[#777873]">Select any image to add or remove it. Removing an image from a collection does not delete the original asset.</footer></aside></div>}
      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-[9px] bg-[#232323] px-3 py-2.5 text-[10px] font-medium text-white shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[#69D583]" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
    </div>
  );
}
