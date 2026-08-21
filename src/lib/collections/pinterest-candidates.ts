import {
  extractPinterestImageUrls,
  extractPinterestSearchPage,
} from "@/lib/collections/pinterest-extract";
import {
  buildPinterestSourceUrl,
  validatePinterestFetchUrl,
} from "@/lib/collections/pinterest-source-url";
import {
  MAX_CANDIDATES,
  MAX_CURSOR_LENGTH,
  type PinterestCandidateResult,
  type PinterestImageCandidate,
} from "@/lib/collections/pinterest-types";
import { SlideshowApiError, badRequest } from "@/lib/slideshow/errors";

const MAX_REDIRECTS = 3;
const MAX_PAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

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
