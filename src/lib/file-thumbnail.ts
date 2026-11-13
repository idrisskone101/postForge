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

/** Null when `src` is not a stored file URL (`/api/files/<id>`); callers then keep the original. */
export function fileThumbnailSources(src: string): { src: string; srcSet: string } | null {
  if (!STORED_FILE_URL.test(src)) return null;
  const variant = (width: number) => `${src}/thumbnail?w=${width}`;
  return {
    src: variant(FILE_THUMBNAIL_WIDTHS[1]),
    srcSet: FILE_THUMBNAIL_WIDTHS.map((width) => `${variant(width)} ${width}w`).join(", "),
  };
}

const STORED_FILE_URL = /^\/api\/files\/[^/?#]+$/;
