import { EmptyState } from "@/components/workbench";

export function CollectionsEmpty() {
  return (
    <section className="wb-panel max-sm:px-4" data-pad="wide">
      <EmptyState
        icon="collections"
        title="No images yet"
        detail="Drop JPG, PNG or WEBP files here, up to 25 MB each."
        className="min-h-[420px]"
      />
    </section>
  );
}
