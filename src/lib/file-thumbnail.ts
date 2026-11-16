/**
 * Resized variants of stored image files, served by `/api/files/[id]/thumbnail`.
 * `w` is the short edge: the variant covers a `w` by `w` box and is never enlarged.
 * Pass the slot's longer CSS edge as `sizes` so a cover-fitted tile stays sharp
 * for portrait, square and landscape sources alike.
 */
export const FILE_THUMBNAIL_WIDTHS = [240, 480, 720] as const;

export type MediaThumbnail = {
  /** The slot's longer CSS edge, for example "236px". */
  sizes: string;
  /** Only for the image expected to be the largest in the first viewport. */
  priority?: boolean;
};

export function fileThumbnailWidth(requested: number): number {
  return (
    FILE_THUMBNAIL_WIDTHS.find((candidate) => candidate >= requested) ??
    FILE_THUMBNAIL_WIDTHS[FILE_THUMBNAIL_WIDTHS.length - 1]
  );
}

/** Only stored files (`/api/files/<id>`) have resized variants; callers keep the original otherwise. */
export function hasFileThumbnail(src: string): boolean {
  return STORED_FILE_URL.test(src);
}

/**
 * `next/image` loader. It asks for widths from its own ladder (..., 256, 384, 640, 750, ...),
 * so each rung maps to the variant that still covers the slot it was chosen for.
 */
export function fileThumbnailLoader({ src, width }: { src: string; width: number }): string {
  const [small, medium, large] = FILE_THUMBNAIL_WIDTHS;
  const variant = width <= 256 ? small : width <= 640 ? medium : large;
  return `${src}/thumbnail?w=${variant}`;
}

const STORED_FILE_URL = /^\/api\/files\/[^/?#]+$/;
