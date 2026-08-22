export type CloneHandoffQueryKey = "sourceId" | "referenceFileId" | "sourceUrl";

export interface CloneHandoffQuery {
  sourceId: string | null;
  referenceFileId: string | null;
  sourceUrl: string | null;
}

export interface CloneReferenceFileMetadata {
  id: string;
  type: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  filename: string;
}

export function isSupportedCloneReferenceFile(
  file: CloneReferenceFileMetadata
) {
  return file.type === "image" && file.mimeType.startsWith("image/");
}

function normalizeQueryValue(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function readCloneHandoffQuery(
  searchParams: Pick<URLSearchParams, "get">
): CloneHandoffQuery {
  return {
    sourceId: normalizeQueryValue(searchParams.get("sourceId")),
    referenceFileId: normalizeQueryValue(searchParams.get("referenceFileId")),
    sourceUrl: normalizeQueryValue(searchParams.get("sourceUrl")),
  };
}

export function buildCloneSourceUrlHandoffHref(originalUrl: string) {
  const params = new URLSearchParams();
  params.set("sourceUrl", originalUrl);
  return `/ugc-clone?${params.toString()}`;
}

export function tikTokVideoIdFromUrl(url: string) {
  return url.match(/\/video\/(\d+)/)?.[1] ?? null;
}

export function savedSourceMatchesHandoffUrl(originalUrl: string, handoffUrl: string) {
  if (originalUrl === handoffUrl) return true;
  const handoffVideoId = tikTokVideoIdFromUrl(handoffUrl);
  return (
    handoffVideoId !== null && tikTokVideoIdFromUrl(originalUrl) === handoffVideoId
  );
}

export function consumeCloneHandoffQuery(
  search: string,
  key: CloneHandoffQueryKey
): string {
  const nextParams = new URLSearchParams(search);
  nextParams.delete(key);
  return nextParams.toString();
}

export function clonePathAfterHandoffConsume(
  search: string,
  key: CloneHandoffQueryKey
) {
  const nextQuery = consumeCloneHandoffQuery(search, key);
  return nextQuery ? `/ugc-clone?${nextQuery}` : "/ugc-clone";
}
