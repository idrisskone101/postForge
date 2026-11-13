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
    </div>
  );
}

export const GALLERY_GRID_CLASS =
  "grid min-w-0 grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3";

export const GALLERY_TILE_HEIGHT_CLASS = "h-[236px]";
