export type CloneHandoffQueryKey = "sourceId" | "referenceFileId";

export interface CloneHandoffQuery {
  sourceId: string | null;
  referenceFileId: string | null;
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
  };
}

/**
 * Consumes only the handoff that has been resolved. Other handoffs and any
 * campaign/debug query parameters are intentionally preserved.
 */
export function consumeCloneHandoffQuery(
  search: string,
  key: CloneHandoffQueryKey
): string {
  const nextParams = new URLSearchParams(search);
  nextParams.delete(key);
  return nextParams.toString();
}
