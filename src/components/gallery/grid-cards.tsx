"use client";

import Link from "next/link";
import { MediaPreviewFrame } from "@/components/media-preview";
import { MediaTile } from "@/components/workbench/media-tile";
import { cn } from "@/lib/utils";
import {
  formatGalleryDuration,
  galleryItemJobHref,
  galleryItemMeta,
  galleryItemName,
  galleryItemTitle,
  reviewStatusLabel,
  reviewStatusTone,
} from "./format";
import type { GalleryMediaSession } from "./media-session";
import { GALLERY_GRID_CLASS, GALLERY_TILE_HEIGHT_CLASS } from "./skeletons";
import type { GalleryItem } from "./types";

export function GalleryGridCards({
  items,
  session,
}: {
  items: GalleryItem[];
  session: GalleryMediaSession;
}) {
  const { selectedIds, toggleSelection, openPreview } = session;
  const selecting = selectedIds.size > 0;

  return (
    <div data-gallery-view="grid" className={cn(GALLERY_GRID_CLASS, "wb-fade-in")}>
      {items.map((item) => {
        const title = galleryItemTitle(item);
        const name = galleryItemName(item);
        return (
          <div key={item.id} className="wb-tile-cell">
            <MediaTile
              className={GALLERY_TILE_HEIGHT_CLASS}
              state={{
                selected: selectedIds.has(item.id),
                onSelectedChange: () => toggleSelection(item.id),
                status: {
                  tone: reviewStatusTone[item.reviewStatus.value],
                  label: reviewStatusLabel[item.reviewStatus.value],
                },
                duration: formatGalleryDuration(item.durationSec),
                name,
                selecting,
              }}
              actions={
                <>
                  <button
                    type="button"
                    className="wb-tile-action"
                    onClick={() => openPreview(item)}
                  >
                    Preview
                  </button>
                  <Link
                    href={galleryItemJobHref(item)}
                    // prefetch-off: one link per tile; each would prefetch its job page on load.
                    prefetch={false}
                    className="wb-tile-action"
                    aria-label={`Open the job for ${name}`}
                  >
                    Open
                  </Link>
                </>
              }
            >
              <button
                type="button"
                onClick={() => openPreview(item)}
                aria-label={`Preview ${name}`}
                className="block size-full cursor-zoom-in"
                tabIndex={-1}
              >
                <MediaPreviewFrame
                  type={item.type}
                  src={item.url}
                  width={item.width}
                  height={item.height}
                  alt=""
                  cover
                  variant="card"
                  className="size-full rounded-none bg-media"
                  mediaClassName="rounded-none object-cover"
                />
              </button>
            </MediaTile>
            <div className="flex min-w-0 flex-col">
              <span className="wb-tile-title" title={title}>
                {title}
              </span>
              <span className="wb-tile-meta" suppressHydrationWarning>
                {galleryItemMeta(item)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
