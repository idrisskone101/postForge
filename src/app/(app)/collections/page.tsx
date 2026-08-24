import type { CollectionFeatureRecord } from "@/lib/collections";
import { readWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";
import { CollectionsPageClient } from "./collections-page-client";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  const [records, params] = await Promise.all([
    readWorkspaceFeatureRecords<CollectionFeatureRecord>("collections"),
    searchParams,
  ]);

  return (
    <CollectionsPageClient
      initialRecords={records}
      openUploader={params.upload === "1"}
    />
  );
}
