import { SlideshowApiError } from "@/lib/slideshow/errors";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const DOWNLOAD_TIMEOUT_MS = 20_000;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function assertPinImageUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new SlideshowApiError(400, "invalid_url", "Image URLs must be strings");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SlideshowApiError(400, "invalid_url", "Image URLs must be valid URLs");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (host !== "i.pinimg.com" && !host.endsWith(".i.pinimg.com"))
  ) {
    throw new SlideshowApiError(
      400,
      "invalid_url",
      "Only https i.pinimg.com image URLs returned by the candidates endpoint can be imported",
    );
  }
  return url.toString();
}

function contentLength(response: Response) {
  const value = Number(response.headers.get("content-length"));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function downloadPinterestImage(
  startUrl: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ buffer: Buffer; contentType: string }> {
  let currentUrl = assertPinImageUrl(startUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetchImpl(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.2",
        "User-Agent": "PostForge Pinterest importer",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new SlideshowApiError(
          502,
          "pinterest_image_redirect",
          "Pinterest returned an image redirect without a destination",
        );
      }
      currentUrl = assertPinImageUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) {
      throw new SlideshowApiError(
        502,
        "pinterest_image_unavailable",
        `Pinterest image download failed with HTTP ${response.status}`,
      );
    }

    const contentType =
      response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      throw new SlideshowApiError(
        502,
        "pinterest_image_invalid",
        "The Pinterest response was not a supported JPEG, PNG, or WebP image",
      );
    }
    const declaredLength = contentLength(response);
    if (declaredLength !== null && declaredLength > MAX_IMAGE_BYTES) {
      throw new SlideshowApiError(
        413,
        "pinterest_image_too_large",
        "A Pinterest image exceeded the 15 MB import limit",
      );
    }
    if (!response.body) {
      throw new SlideshowApiError(
        502,
        "pinterest_image_invalid",
        "Pinterest returned an empty image response",
      );
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new SlideshowApiError(
          413,
          "pinterest_image_too_large",
          "A Pinterest image exceeded the 15 MB import limit",
        );
      }
      chunks.push(value);
    }

    return {
      buffer: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total),
      contentType,
    };
  }

  throw new SlideshowApiError(
    502,
    "pinterest_image_redirect",
    "Pinterest redirected the image too many times",
  );
}
