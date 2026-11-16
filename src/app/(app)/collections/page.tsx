import { Suspense } from "react";
import type { CollectionFeatureRecord } from "@/lib/collections";
import { prisma } from "@/lib/db";
import { readWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";
import { countCollectionUsage, type CollectionUsage } from "./collection-usage";
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
  const [params, initialRecords, usage] = await Promise.all([
    searchParams,
    readInitialRecords(),
    readCollectionUsage(),
  ]);
  return (
    <CollectionsPageClient
      initialRecords={initialRecords}
      usage={usage}
      openUploader={params.upload === "1"}
    />
  );
}

async function readInitialRecords() {
  try {
    return await readWorkspaceFeatureRecords<CollectionFeatureRecord>("collections");
  } catch {
    return [];
  }
}

/** Two reads beside the records. If either fails the tiles fall back to their updated date. */
async function readCollectionUsage(): Promise<CollectionUsage> {
  try {
    const [automations, schedules] = await Promise.all([
      readWorkspaceFeatureRecords("automations"),
      prisma.slideshowAutomation.findMany({ select: { contentSettings: true } }),
    ]);
    return countCollectionUsage(
      automations,
      schedules.map((schedule) => schedule.contentSettings)
    );
  } catch {
    return {};
  }
}
