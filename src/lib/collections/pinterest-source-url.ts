import type { PinterestCandidateSource } from "@/lib/collections/pinterest-types";
import { badRequest } from "@/lib/slideshow/errors";

const PINTEREST_SEARCH_URL = "https://www.pinterest.com/search/pins/";
const MAX_QUERY_LENGTH = 120;
const MAX_BOARD_URL_LENGTH = 2_048;

function isPinterestPageHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return (
    normalized === "pin.it" ||
    normalized === "pinterest.com" ||
    normalized.endsWith(".pinterest.com")
  );
}

export function validatePinterestFetchUrl(value: string | URL) {
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
