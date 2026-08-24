import { Suspense } from "react";
import { CollectionsPageClient } from "./collections-page-client";

export default function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  return (
    <Suspense fallback={<CollectionsPageClient initialRecords={[]} openUploader={false} />}>
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
  return <CollectionsPageClient initialRecords={[]} openUploader={params.upload === "1"} />;
}
