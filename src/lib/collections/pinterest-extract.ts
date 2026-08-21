import {
  MAX_CANDIDATES,
  MAX_CURSOR_LENGTH,
  type PinterestImageCandidate,
} from "@/lib/collections/pinterest-types";

type PinterestSearchPage = {
  candidates: PinterestImageCandidate[];
  cursor: string | null;
};

function decodePinterestMarkup(markup: string) {
  return markup
    .replace(/\\u003a/gi, ":")
    .replace(/\\u002f/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/&quot;|&#0*34;/gi, "\"")
    .replace(/&amp;/gi, "&")
    .replace(/&#0*38;/gi, "&");
}

function normalizePinImageUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLowerCase() !== "i.pinimg.com" ||
    parsed.username ||
    parsed.password ||
    (parsed.port && parsed.port !== "443")
  ) {
    return null;
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  const sizeSegment = parts[0]?.toLowerCase() ?? "";
  const numericWidth = /^(\d+)x$/.exec(sizeSegment)?.[1];
  const isUsableSize =
    numericWidth !== undefined &&
    Number(numericWidth) >= 236 &&
    Number(numericWidth) <= 1_200;
  if (
    !isUsableSize ||
    parts.length < 2 ||
    !/\.(?:jpe?g|png|webp)$/i.test(parsed.pathname)
  ) {
    return null;
  }

  parsed.hash = "";
  return parsed.href;
}

function imageQualityRank(url: string) {
  const sizeSegment = new URL(url).pathname.split("/").filter(Boolean)[0] ?? "";
  return Number(/^(\d+)x$/i.exec(sizeSegment)?.[1] ?? 0);
}

function imageIdentity(url: string) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  return parts.slice(1).join("/").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/**
 * Parse the narrow pin fields PostForge needs from Pinterest's anonymous
 * BaseSearchResource response. Everything else in the response is ignored so
 * a Pinterest payload can never become persisted application state by accident.
 */
export function extractPinterestSearchCandidates(
  payload: unknown,
  sourceUrl: string,
  limit = MAX_CANDIDATES,
): PinterestImageCandidate[] {
  return extractPinterestSearchPage(payload, sourceUrl, limit).candidates;
}

export function extractPinterestSearchPage(
  payload: unknown,
  sourceUrl: string,
  limit = MAX_CANDIDATES,
): PinterestSearchPage {
  const root = isRecord(payload) ? payload : {};
  const resourceResponse = isRecord(root.resource_response)
    ? root.resource_response
    : {};
  const data = isRecord(resourceResponse.data) ? resourceResponse.data : {};
  const results = Array.isArray(data.results) ? data.results : [];
  const boundedLimit = Math.min(MAX_CANDIDATES, Math.max(1, Math.floor(limit)));
  const candidates: PinterestImageCandidate[] = [];
  const seenImages = new Set<string>();

  for (const value of results) {
    if (!isRecord(value) || value.type !== "pin") continue;
    const images = isRecord(value.images) ? value.images : {};
    const preferredImage = ["736x", "474x", "236x"]
      .map((key) => (isRecord(images[key]) ? images[key] : null))
      .find((image) => image && optionalString(image.url));
    const normalizedImageUrl = preferredImage
      ? normalizePinImageUrl(optionalString(preferredImage.url) ?? "")
      : null;
    const pinId = optionalString(value.id);
    if (!normalizedImageUrl || !pinId) continue;
    const identity = imageIdentity(normalizedImageUrl);
    if (seenImages.has(identity)) continue;
    seenImages.add(identity);

    const title =
      optionalString(value.grid_title) ??
      optionalString(value.title) ??
      optionalString(value.description);
    const altText =
      optionalString(value.seo_alt_text) ??
      optionalString(value.auto_alt_text) ??
      title;
    candidates.push({
      id: `pinterest-${pinId}`,
      imageUrl: normalizedImageUrl,
      sourceUrl: `https://www.pinterest.com/pin/${encodeURIComponent(pinId)}/`,
      title,
      altText,
      width: optionalPositiveNumber(preferredImage?.width),
      height: optionalPositiveNumber(preferredImage?.height),
    });
    if (candidates.length >= boundedLimit) break;
  }

  const bookmark = optionalString(resourceResponse.bookmark);
  const cursor =
    bookmark &&
    bookmark !== "-end-" &&
    bookmark.length <= MAX_CURSOR_LENGTH &&
    !/[\u0000-\u001f\u007f]/.test(bookmark)
      ? bookmark
      : null;

  return { candidates, cursor };
}

export function extractPinterestImageUrls(markup: string, limit = MAX_CANDIDATES) {
  const boundedLimit = Math.min(MAX_CANDIDATES, Math.max(1, Math.floor(limit)));
  const decoded = decodePinterestMarkup(markup);
  const matches = decoded.match(/https:\/\/i\.pinimg\.com\/[^\s"'<>\\]+/gi) ?? [];
  const byIdentity = new Map<string, { url: string; rank: number; order: number }>();

  for (const match of matches) {
    const url = normalizePinImageUrl(match);
    if (!url) continue;
    const identity = imageIdentity(url);
    const rank = imageQualityRank(url);
    const current = byIdentity.get(identity);
    if (!current) {
      byIdentity.set(identity, { url, rank, order: byIdentity.size });
    } else if (rank > current.rank) {
      byIdentity.set(identity, { ...current, url, rank });
    }
  }

  return [...byIdentity.values()]
    .sort((left, right) => left.order - right.order)
    .slice(0, boundedLimit)
    .map(({ url }) => url);
}
