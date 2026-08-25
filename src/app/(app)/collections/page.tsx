import { Suspense } from "react";
import { CollectionsPageLazy } from "./collections-page-lazy";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export default function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  return (
    <Suspense fallback={<WorkspaceRouteSkeleton />}>
      <CollectionsPageWithParams searchParams={searchParams} />
    </Suspense>
  );
}

async function CollectionsPageWithParams({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  const params = await searchParams;
  return <CollectionsPageLazy initialRecords={[]} openUploader={params.upload === "1"} />;
}
