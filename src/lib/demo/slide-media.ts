/**
 * Slides render `imageUrl` as a background image and accept any URL string.
 * In the demo workspace that would let one visitor point a slide at an
 * arbitrary remote or inline image that the next visitor then sees, so demo
 * slides may only reference media that already lives in the workspace.
 */
const LOCAL_MEDIA_URL = /^\/api\/(files|collection-assets)\/[A-Za-z0-9_-]{1,100}$/;

export function isLocalMediaUrl(value: unknown): value is string {
  return typeof value === "string" && LOCAL_MEDIA_URL.test(value);
}

export function restrictSlideMediaToLocal<
  T extends { imageUrl: string | null; content: unknown },
>(slide: T): T {
  const imageUrl = isLocalMediaUrl(slide.imageUrl) ? slide.imageUrl : null;
  const content = slide.content;
  if (typeof content !== "object" || content === null || Array.isArray(content)) {
    return { ...slide, imageUrl };
  }

  const record = content as Record<string, unknown>;
  if (!Array.isArray(record.imageUrls)) return { ...slide, imageUrl };
  return {
    ...slide,
    imageUrl,
    content: { ...record, imageUrls: record.imageUrls.filter(isLocalMediaUrl) },
  } as T;
}
