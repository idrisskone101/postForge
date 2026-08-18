import { SlideshowApiError, badRequest } from "@/lib/slideshow/errors";

export type PinterestImageCandidate = {
  id: string;
  imageUrl: string;
  sourceUrl: string;
  title?: string;
  altText?: string;
  width?: number;
  height?: number;
};

const PINTEREST_SEARCH_URL = "https://www.pinterest.com/search/pins/";
const MAX_QUERY_LENGTH = 120;
const MAX_BOARD_URL_LENGTH = 2_048;
const MAX_REDIRECTS = 3;
const MAX_PAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_CANDIDATES = 50;
const MAX_CURSOR_LENGTH = 8_192;

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type PinterestCandidateSource = "search" | "board";

export type PinterestCandidateResult = {
  source: PinterestCandidateSource;
  sourceUrl: string;
  candidates: PinterestImageCandidate[];
  cursor: string | null;
  hasMore: boolean;
};

type PinterestSearchPage = {
  candidates: PinterestImageCandidate[];
  cursor: string | null;
};

function isPinterestPageHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return (
    normalized === "pin.it" ||
    normalized === "pinterest.com" ||
    normalized.endsWith(".pinterest.com")
  );
}

function validatePinterestFetchUrl(value: string | URL) {
  let parsed: URL;
  try {
    parsed = value instanceof URL ? new URL(value) : new URL(value);
  } catch {
    badRequest("Enter a valid Pinterest URL", "invalid_pinterest_url");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    (parsed.port && parsed.port !== "443") ||
    !isPinterestPageHost(parsed.hostname)
  ) {
    badRequest(
      "Pinterest URLs must use HTTPS on pinterest.com or pin.it",
      "invalid_pinterest_url",
    );
  }

  parsed.hash = "";
  return parsed;
}

export function buildPinterestSourceUrl(
  source: PinterestCandidateSource,
  rawQuery: string,
) {
  const query = rawQuery.trim();

  if (source === "search") {
    if (query.length < 2 || query.length > MAX_QUERY_LENGTH || /[\u0000-\u001f]/.test(query)) {
      badRequest(
        `Pinterest searches must be between 2 and ${MAX_QUERY_LENGTH} characters`,
        "invalid_pinterest_search",
      );
    }
    const url = new URL(PINTEREST_SEARCH_URL);
    url.searchParams.set("q", query);
    return url;
  }

  if (query.length > MAX_BOARD_URL_LENGTH) {
    badRequest("Pinterest board URL is too long", "invalid_pinterest_url");
  }

  const url = validatePinterestFetchUrl(query);
  const segments = url.pathname.split("/").filter(Boolean);
  const isShortLink = url.hostname.toLowerCase().replace(/\.$/, "") === "pin.it";
  const reservedPath = new Set(["ideas", "pin", "search", "today"]);

  if (
    (!isShortLink && (segments.length < 2 || reservedPath.has(segments[0]?.toLowerCase()))) ||
    (isShortLink && segments.length < 1)
  ) {
    badRequest(
      "Enter a public Pinterest board URL, such as pinterest.com/creator/board",
      "invalid_pinterest_board",
    );
  }

  // Board content is path-addressed. Dropping tracking parameters makes the
  // fetched and persisted provenance URL deterministic.
  url.search = "";
  return url;
}

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

function extractPinterestSearchPage(
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

async function readBoundedBody(response: Response, expectedType: "html" | "json") {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const validContentType =
    expectedType === "html"
      ? contentType.startsWith("text/html") ||
        contentType.startsWith("application/xhtml+xml")
      : contentType.startsWith("application/json");
  if (!validContentType) {
    throw new SlideshowApiError(
      502,
      "pinterest_invalid_response",
      expectedType === "html"
        ? "Pinterest returned a non-HTML response. Try another public board URL."
        : "Pinterest returned an invalid search response. Try the search again.",
    );
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PAGE_BYTES) {
    throw new SlideshowApiError(
      502,
      "pinterest_response_too_large",
      "Pinterest returned a page that is too large to import safely.",
    );
  }
  if (!response.body) {
    throw new SlideshowApiError(
      502,
      "pinterest_empty_response",
      "Pinterest returned an empty page. Try another public board URL.",
    );
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PAGE_BYTES) {
      await reader.cancel();
      throw new SlideshowApiError(
        502,
        "pinterest_response_too_large",
        "Pinterest returned a page that is too large to import safely.",
      );
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total).toString("utf8");
}

async function readBoundedHtml(response: Response) {
  return readBoundedBody(response, "html");
}

async function readBoundedJson(response: Response) {
  const text = await readBoundedBody(response, "json");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SlideshowApiError(
      502,
      "pinterest_invalid_response",
      "Pinterest returned malformed search data. Try the search again.",
    );
  }
}

async function fetchPinterestHtml(sourceUrl: URL, fetchImpl: FetchLike) {
  let currentUrl = validatePinterestFetchUrl(sourceUrl);
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetchImpl(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36 PostForge/1.0",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectCount === MAX_REDIRECTS) {
        throw new SlideshowApiError(
          502,
          "pinterest_redirect_limit",
          "Pinterest redirected too many times. Paste the final public board URL instead.",
        );
      }
      const location = response.headers.get("location");
      if (!location) {
        throw new SlideshowApiError(
          502,
          "pinterest_invalid_redirect",
          "Pinterest returned an invalid redirect.",
        );
      }
      await response.body?.cancel();
      currentUrl = validatePinterestFetchUrl(new URL(location, currentUrl));
      continue;
    }

    if (!response.ok) {
      const message =
        response.status === 401 || response.status === 403 || response.status === 429
          ? "Pinterest blocked or rate-limited the public page request. Try a public board URL or upload the images directly."
          : `Pinterest could not load this public page (HTTP ${response.status}). Try another board URL.`;
      throw new SlideshowApiError(502, "pinterest_unavailable", message);
    }

    return {
      markup: await readBoundedHtml(response),
      finalUrl: currentUrl,
      headers: response.headers,
    };
  }

  throw new SlideshowApiError(
    502,
    "pinterest_redirect_limit",
    "Pinterest redirected too many times.",
  );
}

function sessionCookieHeader(headers: Headers) {
  const cookieHeaders =
    (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ??
    (headers.get("set-cookie")?.split(/,(?=\s*[^=;,\s]+=)/) ?? []);
  return cookieHeaders
    .map((value) => value.split(";", 1)[0]?.trim())
    .filter(
      (value): value is string =>
        Boolean(value) && !/[\r\n]/.test(value) && /^[^=;\s]+=[^;]*$/.test(value),
    )
    .join("; ");
}

function pinterestSearchResourceUrl(
  sourceUrl: URL,
  query: string,
  cursor: string | null,
) {
  const visibleUrl = `${sourceUrl.pathname}?${sourceUrl.searchParams.toString()}`;
  const options: Record<string, unknown> = {
    query,
    scope: "pins",
    appliedProductFilters: "---",
    domains: null,
    user: null,
    seoDrawerEnabled: false,
    applied_unified_filters: null,
    auto_correction_disabled: false,
    filter_genai: false,
    journey_depth: null,
    source_id: null,
    source_module_id: null,
    source_url: visibleUrl,
    static_feed: false,
    selected_one_bar_modules: null,
    query_pin_sigs: null,
    page_size: MAX_CANDIDATES,
    gated: null,
    price_max: null,
    price_min: null,
    query_image_pins: null,
    request_params: null,
    top_pin_ids: null,
    article: null,
    corpus: null,
    filters: null,
    rs: "direct_navigation",
  };
  if (cursor) options.bookmarks = [cursor];
  const resourceUrl = new URL(
    "/resource/BaseSearchResource/get/",
    "https://www.pinterest.com",
  );
  resourceUrl.searchParams.set("source_url", visibleUrl);
  resourceUrl.searchParams.set("data", JSON.stringify({ options, context: {} }));
  resourceUrl.searchParams.set("_", String(Date.now()));
  return { resourceUrl, visibleUrl };
}

async function fetchPinterestSearchCandidates(
  query: string,
  sourceUrl: URL,
  cursor: string | null,
  session: Awaited<ReturnType<typeof fetchPinterestHtml>>,
  fetchImpl: FetchLike,
) {
  const { resourceUrl, visibleUrl } = pinterestSearchResourceUrl(
    sourceUrl,
    query,
    cursor,
  );
  const cookie = sessionCookieHeader(session.headers);
  const appVersion = session.headers.get("pinterest-version")?.trim();
  const headers = new Headers({
    Accept: "application/json, text/javascript, */*, q=0.01",
    "Accept-Language": "en-US,en;q=0.8",
    Referer: "https://www.pinterest.com/",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    "X-Pinterest-Appstate": "active",
    "X-Pinterest-PWS-Handler": "www/search/[scope].js",
    "X-Pinterest-Source-Url": visibleUrl,
    "X-Requested-With": "XMLHttpRequest",
  });
  if (cookie) headers.set("Cookie", cookie);
  if (appVersion && !/[\r\n]/.test(appVersion)) {
    headers.set("X-App-Version", appVersion);
  }

  const response = await fetchImpl(resourceUrl, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers,
  });
  if (!response.ok) {
    throw new SlideshowApiError(
      502,
      "pinterest_unavailable",
      response.status === 401 || response.status === 403 || response.status === 429
        ? "Pinterest blocked or rate-limited the search request. Try again or paste a public board URL."
        : `Pinterest search failed with HTTP ${response.status}. Try again or paste a public board URL.`,
    );
  }
  return extractPinterestSearchPage(
    await readBoundedJson(response),
    sourceUrl.href,
  );
}

export async function findPinterestCandidates(
  input: unknown,
  options: { fetchImpl?: FetchLike } = {},
): Promise<PinterestCandidateResult> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    badRequest("Request body must contain a Pinterest source and query");
  }
  const body = input as Record<string, unknown>;
  const source = body.source;
  const query = body.query;
  const rawCursor = body.cursor;
  if (source !== "search" && source !== "board") {
    badRequest("source must be search or board", "invalid_pinterest_source");
  }
  if (typeof query !== "string") {
    badRequest("query must be a string", "invalid_pinterest_query");
  }
  if (
    rawCursor !== undefined &&
    rawCursor !== null &&
    (source !== "search" ||
      typeof rawCursor !== "string" ||
      !rawCursor ||
      rawCursor.length > MAX_CURSOR_LENGTH ||
      /[\u0000-\u001f\u007f]/.test(rawCursor))
  ) {
    badRequest(
      "Pinterest cursor is invalid or expired. Start a new search.",
      "invalid_pinterest_cursor",
    );
  }
  const cursor = typeof rawCursor === "string" ? rawCursor : null;

  const sourceUrl = buildPinterestSourceUrl(source, query);
  let page: Awaited<ReturnType<typeof fetchPinterestHtml>>;
  try {
    page = await fetchPinterestHtml(sourceUrl, options.fetchImpl ?? fetch);
  } catch (error) {
    if (error instanceof SlideshowApiError) throw error;
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    throw new SlideshowApiError(
      502,
      isTimeout ? "pinterest_timeout" : "pinterest_unavailable",
      isTimeout
        ? "Pinterest took too long to respond. Try again or switch to Board URL."
        : "Pinterest could not be reached. Try again or add images in Collections.",
    );
  }

  let candidates: PinterestImageCandidate[];
  let nextCursor: string | null = null;
  if (source === "search") {
    try {
      const searchPage = await fetchPinterestSearchCandidates(
        query.trim(),
        sourceUrl,
        cursor,
        page,
        options.fetchImpl ?? fetch,
      );
      candidates = searchPage.candidates;
      nextCursor = searchPage.cursor === cursor ? null : searchPage.cursor;
    } catch (error) {
      if (cursor) throw error;
      const fallbackUrls = extractPinterestImageUrls(page.markup);
      if (!fallbackUrls.length) throw error;
      candidates = fallbackUrls.map((imageUrl, index) => ({
        id: `pinterest-${index + 1}`,
        imageUrl,
        sourceUrl: page.finalUrl.href,
      }));
    }
  } else {
    candidates = extractPinterestImageUrls(page.markup).map((imageUrl, index) => ({
      id: `pinterest-${index + 1}`,
      imageUrl,
      sourceUrl: page.finalUrl.href,
    }));
  }
  if (!candidates.length && !cursor) {
    throw new SlideshowApiError(
      422,
      "pinterest_no_images",
      "No public Pinterest images were found. Check that the board is public, try another search, or add images in Collections.",
    );
  }

  return {
    source,
    sourceUrl: page.finalUrl.href,
    candidates,
    cursor: nextCursor,
    hasMore: Boolean(nextCursor),
  };
}
