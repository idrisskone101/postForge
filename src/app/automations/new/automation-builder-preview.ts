import type { CollectionAssetRecord, CollectionRecord } from "@/lib/collections";

export type AutomationSourceFile = {
  id: string;
  filename: string;
  type: string;
  mimeType: string;
  previewUrl: string;
};

export type AutomationPreviewAsset = {
  id: string;
  name: string;
  kind: "image" | "video";
  previewUrl: string;
  origin: "Attached generated asset" | "Visual collection";
};

export const PREVIEW_ZOOM_MIN = 40;
export const PREVIEW_ZOOM_MAX = 100;
export const PREVIEW_ZOOM_STEP = 6;

export function clampPreviewZoom(value: number) {
  return Math.max(PREVIEW_ZOOM_MIN, Math.min(PREVIEW_ZOOM_MAX, value));
}

export function clampPreviewSlide(slideIndex: number, slideCount: number) {
  return Math.max(0, Math.min(slideIndex, Math.max(0, slideCount - 1)));
}

export function nextPreviewSlide(
  current: number,
  next: number | ((current: number) => number),
  slideCount: number
) {
  const resolved =
    typeof next === "function" ? next(clampPreviewSlide(current, slideCount)) : next;
  return clampPreviewSlide(resolved, slideCount);
}

export function selectAutomationPreviewAsset({
  sourceFileId,
  sourceFile,
  collectionId,
  collections,
  collectionAssets,
}: {
  sourceFileId: string | null;
  sourceFile: AutomationSourceFile | null;
  collectionId: string | null;
  collections: readonly CollectionRecord[];
  collectionAssets: readonly CollectionAssetRecord[];
}): AutomationPreviewAsset | null {
  if (sourceFileId) {
    if (!sourceFile || sourceFile.id !== sourceFileId) return null;
    return {
      id: sourceFile.id,
      name: sourceFile.filename,
      kind:
        sourceFile.type === "video" || sourceFile.mimeType.startsWith("video/")
          ? "video"
          : "image",
      previewUrl: sourceFile.previewUrl,
      origin: "Attached generated asset",
    };
  }

  if (!collectionId) return null;
  const collection = collections.find((candidate) => candidate.id === collectionId);
  const assetsById = new Map(
    collectionAssets.map((candidate) => [candidate.id, candidate])
  );
  const asset = collection?.assetIds
    .map((assetId) => assetsById.get(assetId))
    .find((candidate): candidate is CollectionAssetRecord => Boolean(candidate));
  if (!asset) return null;

  return {
    id: asset.id,
    name: asset.name || asset.filename,
    kind: "image",
    previewUrl: `/api/files/${encodeURIComponent(asset.id)}`,
    origin: "Visual collection",
  };
}
