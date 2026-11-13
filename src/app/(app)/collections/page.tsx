import { Suspense } from "react";
import type { CollectionFeatureRecord } from "@/lib/collections";
import { readWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";
import { CollectionsPageClient } from "./collections-page-client";
import { CollectionsSkeleton } from "./collections-skeleton";

export default function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  return (
    <Suspense fallback={<CollectionsSkeleton />}>
      <CollectionsPageWithData searchParams={searchParams} />
    </Suspense>
  );
}

async function CollectionsPageWithData({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  const [params, initialRecords] = await Promise.all([searchParams, readInitialRecords()]);
  return (
    <CollectionsPageClient initialRecords={initialRecords} openUploader={params.upload === "1"} />
  );
}

async function readInitialRecords() {
  try {
    return await readWorkspaceFeatureRecords<CollectionFeatureRecord>("collections");
  } catch {
    return [];
  }
}
