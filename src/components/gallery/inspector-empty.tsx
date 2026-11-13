import { EmptyState } from "@/components/workbench/empty-state";

/** The inspector column with nothing selected. It keeps the column, so selecting never reflows the grid. */
export function GalleryInspectorEmpty() {
  return <EmptyState icon="gallery" title="Select media to inspect" className="min-h-[312px]" />;
}

/*
 * The column starts under the 56px page header and its 12px gap, so the height cap leaves that out and
 * the pinned actions are in view before the page scrolls.
 */
export const GALLERY_INSPECTOR_CLASS = [
  "wb-panel sticky top-4 hidden w-[320px] shrink-0 xl:flex",
  "max-h-[calc(100dvh-2*var(--pf-page-pad)-68px)] overflow-y-auto overscroll-contain [scrollbar-width:none]",
].join(" ");
