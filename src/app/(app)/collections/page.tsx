import { Suspense } from "react";
import { CollectionsPageClient } from "./collections-page-client";
import CollectionsLoading from "./collections-loading";

export default function CollectionsPage() {
  return (
    <Suspense fallback={<CollectionsLoading />}>
      <CollectionsPageClient />
    </Suspense>
  );
}
