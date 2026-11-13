import { EmptyState } from "@/components/workbench/empty-state";

/** The inspector column with nothing selected. It keeps the column, so selecting never reflows the grid. */
export function GalleryInspectorEmpty() {
  return <EmptyState icon="gallery" title="Select media to inspect" className="min-h-[312px]" />;
}

export const GALLERY_INSPECTOR_CLASS = "wb-panel sticky top-4 hidden w-[320px] shrink-0 xl:flex";
