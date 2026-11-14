import { Skeleton } from "@/components/workbench/skeleton";

export function GalleryTileSkeletons({ count = 10 }: { count?: number }) {
  return (
    <div className={GALLERY_GRID_CLASS} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="wb-tile-cell">
          <Skeleton shape="tile" className={GALLERY_TILE_HEIGHT_CLASS} />
          <div className="flex flex-col gap-1.5 pt-0.5">
            <Skeleton className="w-2/3" />
            <Skeleton className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GalleryToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton shape="tile" className="h-9 min-w-[200px] flex-1" />
        <Skeleton className="h-9 w-[230px]" />
        <Skeleton className="h-9 w-[90px]" />
        <Skeleton className="h-9 w-[80px]" />
      </div>
      <Skeleton className="h-9 w-full max-w-[432px]" />
      <div className="flex min-h-12 items-center pl-1">
        <Skeleton className="w-20" />
      </div>
    </div>
  );
}

export const GALLERY_GRID_CLASS =
  "grid min-w-0 grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3";

/** 220px on phones (Paper "08 Gallery / 390"), 236px from 768. */
export const GALLERY_TILE_HEIGHT_CLASS = "h-[220px] md:h-[236px]";

/** The tile's longer edge: a cover-fitted thumbnail must reach it on its short side. */
export const GALLERY_TILE_THUMBNAIL_SIZES = "236px";
